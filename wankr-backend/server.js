// wankr-backend/server.js
const express = require('express');
const cors = require('cors');
const { InfisicalClient } = require('@infisical/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

let xaiApiKey = null;

async function initInfisical() {
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
  const projectId = process.env.INFISICAL_PROJECT_ID;
  if (!clientId || !clientSecret || !projectId) {
    throw new Error('Missing INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET, or INFISICAL_PROJECT_ID');
  }

  const client = new InfisicalClient({
    siteUrl: 'https://app.infisical.com'
  });

  await client.auth().universalAuth({
    clientId,
    clientSecret
  });

  const secret = await client.secrets().getSecret({
    environment: 'dev',
    projectId,
    secretName: 'grokWankr',
    type: 'shared'
  });

  xaiApiKey = secret.secretValue;
  console.log('✅ Grok API key loaded from Infisical');
}

app.post('/v1/chat/completions', async (req, res) => {
  if (!xaiApiKey) {
    return res.status(500).json({ error: 'Proxy not ready – key not loaded' });
  }

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'Failed to reach xAI' });
  }
});

app.listen(PORT, async () => {
  console.log(`🚀 Starting Wankr secure proxy on port ${PORT}`);
  await initInfisical().catch(err => {
    console.error('❌ Failed to load key from Infisical:', err.message);
    process.exit(1);
  });
  console.log(`✅ Proxy ready → http://localhost:${PORT}`);
});
