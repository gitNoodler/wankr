/**
 * trainingDataGen.js — Generates scored training pairs from KOL database.
 * Each pair: natural prompt → pipeline-classified Grok response → validator score.
 */

const fs = require('fs');
const path = require('path');
const kolAnalysisService = require('./kolAnalysisService');
const responsePipeline = require('./responsePipeline');

const STORAGE_ROOT = require('./storagePath');
const OUTPUT_DIR = path.join(STORAGE_ROOT, 'training', 'pipeline_generated');

const PROMPT_TEMPLATES = [
  'What do you think about @{handle}?',
  'Is @{handle} legit?',
  'Check @{handle} for me',
  'Sus @{handle}',
  'Should I trust @{handle}?',
  'Give me the rundown on @{handle}',
  'Analyze @{handle}',
];

async function generateTrainingBatch(count, xaiApiKey, systemPrompt) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const accounts = kolAnalysisService.getAccounts();
  if (accounts.length === 0) {
    return { generated: 0, error: 'No KOL accounts available' };
  }

  const batchSize = Math.min(count, accounts.length);
  const shuffled = accounts.sort(() => Math.random() - 0.5).slice(0, batchSize);
  const results = [];

  for (const account of shuffled) {
    const handle = account.handle.replace(/^@/, '');
    const template = PROMPT_TEMPLATES[Math.floor(Math.random() * PROMPT_TEMPLATES.length)];
    const userPrompt = template.replace('{handle}', handle);

    try {
      // Run pipeline (synchronous — uses local KOL data)
      const pipelineResult = responsePipeline.runPipeline(userPrompt, []);

      let personaBlock = '';
      if (pipelineResult.personaMode) {
        personaBlock = '\n\n--- RESPONSE MODE ---\n' + pipelineResult.personaMode + '\n--- END RESPONSE MODE ---';
      }
      const dataBlock = pipelineResult.dataContext || '';

      const messages = [
        { role: 'system', content: (systemPrompt || 'You are Wankr.') + personaBlock + dataBlock },
        { role: 'user', content: userPrompt },
      ];

      // Generate response
      const genRes = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
        body: JSON.stringify({ model: 'grok-4', messages, max_tokens: 600 }),
      });
      const genData = await genRes.json();
      const reply = genData.choices?.[0]?.message?.content || '';
      if (!reply) continue;

      // Score via validator
      let scores = null;
      try {
        const valRes = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${xaiApiKey}` },
          body: JSON.stringify({
            model: 'grok-2-latest',
            messages: [
              { role: 'system', content: 'Score this crypto chatbot response. Return ONLY JSON: { "boundsCompliance": 0-100, "framingAccuracy": 0-100, "personaFit": 0-100, "notes": "brief" }' },
              { role: 'user', content: `[STATE] ${pipelineResult.classification.state}\n[PROMPT] ${userPrompt}\n[RESPONSE] ${reply}` },
            ],
            max_tokens: 200,
            temperature: 0.1,
          }),
        });
        const valData = await valRes.json();
        const valContent = valData.choices?.[0]?.message?.content || '';
        const jsonMatch = valContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) scores = JSON.parse(jsonMatch[0]);
      } catch {}

      results.push({
        handle,
        userPrompt,
        wankrResponse: reply,
        classification: pipelineResult.classification.state,
        reason: pipelineResult.classification.reason,
        scores,
        flagged: scores ? (scores.boundsCompliance < 60 || scores.framingAccuracy < 60 || scores.personaFit < 60) : null,
        timestamp: new Date().toISOString(),
      });

      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`Training gen error for @${handle}:`, err.message);
    }
  }

  // Save batch
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `batch_${ts}.json`;
  fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: results.length,
    pairs: results,
  }, null, 2));

  return {
    generated: results.length,
    file: filename,
    flagged: results.filter(r => r.flagged).length,
    avgScores: results.length > 0 && results[0].scores ? {
      boundsCompliance: Math.round(results.reduce((s, r) => s + (r.scores?.boundsCompliance || 0), 0) / results.length),
      framingAccuracy: Math.round(results.reduce((s, r) => s + (r.scores?.framingAccuracy || 0), 0) / results.length),
      personaFit: Math.round(results.reduce((s, r) => s + (r.scores?.personaFit || 0), 0) / results.length),
    } : null,
  };
}

module.exports = { generateTrainingBatch };
