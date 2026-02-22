import { useState } from "react";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart } from "recharts";

const COLORS = {
  green: "#00ff41",
  greenDim: "#00cc33",
  greenDark: "#004d00",
  orange: "#ff8c00",
  red: "#ff3333",
  cyan: "#00d4ff",
  purple: "#b366ff",
  yellow: "#ffd700",
  bg: "#0a0a0a",
  card: "#111111",
  cardBorder: "#1a1a1a",
  text: "#e0e0e0",
  textDim: "#888888",
};

// === DATA MODELS ===

const modelRecommendations = [
  { provider: "xAI", model: "Grok 4", tier: "Mid-Tier", role: "Generation + Grading", inputPer1M: 3.0, outputPer1M: 15.0, costPerCall: 0.040, costPerCallCached: 0.018, reason: "Wankr's backbone. MUST grade with same family it generates from. Caching gives 75% input savings." },
  { provider: "Anthropic", model: "Sonnet 4.5", tier: "Mid-Tier", role: "Grading Only", inputPer1M: 3.0, outputPer1M: 15.0, costPerCall: 0.040, costPerCallCached: 0.008, reason: "Best structured output. Strongest rubric follower. 90% cache savings on repeated grading docs." },
  { provider: "OpenAI", model: "GPT-4o", tier: "Mid-Tier", role: "Grading Only", inputPer1M: 2.5, outputPer1M: 10.0, costPerCall: 0.031, costPerCallCached: 0.015, reason: "Cheapest mid-tier. Strong analytical reasoning. 50% batch discount available." },
];

const budgetAllocation = [
  { name: "xAI (Grok 4)", value: 40, color: COLORS.orange, detail: "$5 generation + $35 grading" },
  { name: "Anthropic (Sonnet)", value: 35, color: COLORS.purple, detail: "$35 grading annotations" },
  { name: "OpenAI (GPT-4o)", value: 25, color: COLORS.cyan, detail: "$25 grading annotations" },
];

const NOT_RECOMMENDED = [
  { provider: "Anthropic", model: "Haiku 4.5", reason: "Too shallow for nuanced persona grading. Misses subtle Delia-style tone issues." },
  { provider: "Anthropic", model: "Opus 4.5", reason: "3.5x Sonnet cost for marginal quality gain. Eats budget too fast." },
  { provider: "OpenAI", model: "GPT-4o-mini", reason: "Cheap but misses complex social forensics and scenario classification." },
  { provider: "xAI", model: "Grok 4.1 Fast", reason: "OK for generation, too shallow for grading pipeline annotations." },
];

// Diminishing returns curve: score = 74.87 + 18 * (1 - e^(-layers/2000))
function scoreAtLayers(layers) {
  return 74.87 + 18 * (1 - Math.exp(-layers / 2000));
}

function costAtLayers(layers, costPerLayer) {
  return (layers / 9) * costPerLayer; // 9 layers per response
}

// Generate diminishing returns data
const diminishingReturnsData = [];
for (let layers = 0; layers <= 16000; layers += 200) {
  const score = scoreAtLayers(layers);
  const costNoOpt = costAtLayers(layers, 0.333);
  const costOpt = costAtLayers(layers, 0.124);
  const marginalImprovement = layers > 0 ? (scoreAtLayers(layers) - scoreAtLayers(layers - 200)) : 0;
  const improvementPerDollarOpt = layers > 0 ? marginalImprovement / (costAtLayers(200, 0.124)) : 0;
  diminishingReturnsData.push({
    layers,
    score: parseFloat(score.toFixed(2)),
    costNoOpt: parseFloat(costNoOpt.toFixed(0)),
    costOpt: parseFloat(costOpt.toFixed(0)),
    marginalImprovement: parseFloat(marginalImprovement.toFixed(3)),
    improvementPerDollar: parseFloat(improvementPerDollarOpt.toFixed(4)),
  });
}

// Monthly projection at $100/mo
const monthlyProjection = [];
let cumulativeLayers = 0;
let cumulativeCost = 0;
for (let month = 0; month <= 12; month++) {
  if (month === 0) {
    monthlyProjection.push({
      month,
      label: "Start",
      layers: 0,
      cumulativeLayers: 0,
      score: 74.87,
      costThisMonth: 0,
      cumulativeCost: 0,
      gradingBudget: 0,
      genBudget: 0,
      phase: "Baseline",
    });
    continue;
  }

  let gradingBudget, genBudget, layersThisMonth, phase;

  if (month <= 2) {
    // Phase 1: Heavy training
    gradingBudget = 93;
    genBudget = 7;
    layersThisMonth = Math.round((gradingBudget / 0.124) * 9); // optimized
    phase = "Heavy Training";
  } else if (month <= 5) {
    // Phase 2: Moderate training, quality stabilizing
    gradingBudget = 60;
    genBudget = 15;
    layersThisMonth = Math.round((gradingBudget / 0.124) * 9);
    phase = "Refinement";
  } else if (month <= 8) {
    // Phase 3: Maintenance
    gradingBudget = 20;
    genBudget = 15;
    layersThisMonth = Math.round((gradingBudget / 0.124) * 9);
    phase = "Maintenance";
  } else {
    // Phase 4: Self-sustaining
    gradingBudget = 10;
    genBudget = 10;
    layersThisMonth = Math.round((gradingBudget / 0.124) * 9);
    phase = "Self-Sustaining";
  }

  cumulativeLayers += layersThisMonth;
  cumulativeCost += gradingBudget + genBudget;

  monthlyProjection.push({
    month,
    label: `M${month}`,
    layers: layersThisMonth,
    cumulativeLayers,
    score: parseFloat(scoreAtLayers(cumulativeLayers).toFixed(2)),
    costThisMonth: gradingBudget + genBudget,
    cumulativeCost: parseFloat(cumulativeCost.toFixed(0)),
    gradingBudget,
    genBudget,
    surplus: 100 - gradingBudget - genBudget,
    phase,
  });
}

// Cost per point improvement data
const costPerPointData = [];
let prevScore = 74.87;
for (let spent = 0; spent <= 600; spent += 10) {
  const layers = (spent / 0.124) * 9; // layers bought with this much $
  const score = scoreAtLayers(layers);
  const improvement = score - 74.87;
  const costPerPoint = improvement > 0 ? spent / improvement : 0;
  const marginal = score - prevScore;
  prevScore = score;
  costPerPointData.push({
    spent,
    score: parseFloat(score.toFixed(2)),
    improvement: parseFloat(improvement.toFixed(2)),
    costPerPoint: parseFloat(costPerPoint.toFixed(2)),
    marginalPerDollar: parseFloat((marginal / 10).toFixed(4)),
  });
}

// Self-sustainability data
const sustainabilityData = [
  { month: 0, score: 74.87, gradingCost: 0, genCost: 0, totalApiCost: 0, revenueNeeded: 0, surplus: 0 },
  { month: 1, score: 88.2, gradingCost: 93, genCost: 7, totalApiCost: 100, revenueNeeded: 100, surplus: 0 },
  { month: 2, score: 91.8, gradingCost: 93, genCost: 7, totalApiCost: 100, revenueNeeded: 100, surplus: 0 },
  { month: 3, score: 92.4, gradingCost: 60, genCost: 15, totalApiCost: 75, revenueNeeded: 75, surplus: 25 },
  { month: 4, score: 92.6, gradingCost: 40, genCost: 15, totalApiCost: 55, revenueNeeded: 55, surplus: 45 },
  { month: 5, score: 92.7, gradingCost: 25, genCost: 15, totalApiCost: 40, revenueNeeded: 40, surplus: 60 },
  { month: 6, score: 92.75, gradingCost: 20, genCost: 15, totalApiCost: 35, revenueNeeded: 35, surplus: 65 },
  { month: 7, score: 92.8, gradingCost: 15, genCost: 15, totalApiCost: 30, revenueNeeded: 30, surplus: 70 },
  { month: 8, score: 92.82, gradingCost: 15, genCost: 15, totalApiCost: 30, revenueNeeded: 30, surplus: 70 },
  { month: 9, score: 92.84, gradingCost: 10, genCost: 10, totalApiCost: 20, revenueNeeded: 20, surplus: 80 },
  { month: 10, score: 92.85, gradingCost: 10, genCost: 10, totalApiCost: 20, revenueNeeded: 20, surplus: 80 },
  { month: 11, score: 92.86, gradingCost: 10, genCost: 10, totalApiCost: 20, revenueNeeded: 20, surplus: 80 },
  { month: 12, score: 92.87, gradingCost: 10, genCost: 10, totalApiCost: 20, revenueNeeded: 20, surplus: 80 },
];

// === COMPONENTS ===

const tabs = [
  { id: "models", label: "Model Selection" },
  { id: "budget", label: "Budget Allocation" },
  { id: "returns", label: "Diminishing Returns" },
  { id: "sustain", label: "Self-Sustainability" },
  { id: "timeline", label: "12-Month Plan" },
];

function Card({ title, children, accent }) {
  return (
    <div style={{
      background: COLORS.card,
      border: `1px solid ${accent || COLORS.cardBorder}`,
      borderRadius: 8,
      padding: 20,
      marginBottom: 16,
    }}>
      {title && <h3 style={{ color: accent || COLORS.green, margin: "0 0 12px 0", fontSize: 16, fontWeight: 600 }}>{title}</h3>}
      {children}
    </div>
  );
}

function Stat({ label, value, unit, color }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 16px" }}>
      <div style={{ color: color || COLORS.green, fontSize: 28, fontWeight: 700 }}>{value}<span style={{ fontSize: 14, color: COLORS.textDim }}>{unit}</span></div>
      <div style={{ color: COLORS.textDim, fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function ModelSelectionTab() {
  return (
    <div>
      <Card title="RECOMMENDED MODELS — $100/month Budget">
        <p style={{ color: COLORS.textDim, fontSize: 13, marginBottom: 16 }}>
          All mid-tier. Budget models miss persona nuance. Premium models burn budget too fast. Mid-tier hits the sweet spot for annotation quality per dollar.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {modelRecommendations.map((m, i) => (
            <div key={i} style={{
              background: "#1a1a1a",
              borderRadius: 6,
              padding: 16,
              borderLeft: `3px solid ${[COLORS.orange, COLORS.purple, COLORS.cyan][i]}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ color: [COLORS.orange, COLORS.purple, COLORS.cyan][i], fontWeight: 700, fontSize: 16 }}>{m.provider}</span>
                  <span style={{ color: COLORS.text, marginLeft: 8 }}>{m.model}</span>
                  <span style={{ color: COLORS.textDim, marginLeft: 8, fontSize: 12, background: "#2a2a2a", padding: "2px 8px", borderRadius: 4 }}>{m.role}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: COLORS.green, fontWeight: 600 }}>${m.costPerCall.toFixed(3)}<span style={{ color: COLORS.textDim, fontSize: 11 }}>/call</span></div>
                  <div style={{ color: COLORS.yellow, fontSize: 12 }}>${m.costPerCallCached.toFixed(3)}<span style={{ color: COLORS.textDim }}> cached</span></div>
                </div>
              </div>
              <div style={{ color: COLORS.textDim, fontSize: 12 }}>{m.reason}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="NOT RECOMMENDED" accent={COLORS.red}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {NOT_RECOMMENDED.map((m, i) => (
            <div key={i} style={{ background: "#1a0a0a", borderRadius: 4, padding: 10, fontSize: 12 }}>
              <span style={{ color: COLORS.red, fontWeight: 600 }}>{m.model}</span>
              <div style={{ color: COLORS.textDim, marginTop: 4 }}>{m.reason}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="WHY NOT BUDGET MODELS?">
        <p style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          Your grading pipeline evaluates <span style={{ color: COLORS.green }}>5 persona influences</span> (Theo Von, D'Elia, Atlas, Belfort, Degen),{" "}
          <span style={{ color: COLORS.cyan }}>dual-axis scoring</span> (accuracy + persona), <span style={{ color: COLORS.orange }}>4 scenario classifications</span>,{" "}
          and <span style={{ color: COLORS.purple }}>ECI bot detection</span>. Budget models like Haiku and GPT-4o-mini lack the reasoning depth to catch
          subtle persona drift or correctly classify Scenario D (the trap). They save ~60% per call but produce training data that's 40% less useful,
          meaning you need 2.5x more volume to reach the same quality — which costs MORE total.
        </p>
      </Card>

      <Card title="CACHING & BATCH SAVINGS">
        <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap" }}>
          <Stat label="Anthropic Cache" value="90%" unit=" savings" color={COLORS.purple} />
          <Stat label="xAI Cache" value="75%" unit=" savings" color={COLORS.orange} />
          <Stat label="OpenAI Batch" value="50%" unit=" savings" color={COLORS.cyan} />
          <Stat label="Effective Cost" value="$0.124" unit="/response" color={COLORS.green} />
        </div>
        <p style={{ color: COLORS.textDim, fontSize: 12, margin: "12px 0 0", textAlign: "center" }}>
          Grading docs (~4,000 tokens) are identical every call → massive cache hits. Grading is async → batch API eligible.
        </p>
      </Card>
    </div>
  );
}

function BudgetAllocationTab() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16, flexWrap: "wrap" }}>
        <Stat label="Total Monthly Budget" value="$100" color={COLORS.green} />
        <Stat label="Generation (Grok)" value="$5-7" color={COLORS.orange} />
        <Stat label="Grading Pipeline" value="$93-95" color={COLORS.purple} />
        <Stat label="Responses Graded" value="~766" unit="/mo" color={COLORS.cyan} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card title="Budget Split">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={budgetAllocation} dataKey="value" cx="50%" cy="50%" outerRadius={90} innerRadius={50} label={({ name, value }) => `$${value}`} labelLine={true}>
                {budgetAllocation.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke={COLORS.bg} strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.green}`, borderRadius: 4 }}
                formatter={(value, name) => [`$${value}/mo`, name]} />
              <Legend formatter={(value) => <span style={{ color: COLORS.text, fontSize: 11 }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="What You Get Per Month">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "#1a1a1a", borderRadius: 6, padding: 12 }}>
              <div style={{ color: COLORS.orange, fontWeight: 600, marginBottom: 4 }}>xAI — $40/mo</div>
              <div style={{ color: COLORS.textDim, fontSize: 12 }}>$5 generation (~5,000 Wankr responses via Grok 4.1 Fast)</div>
              <div style={{ color: COLORS.textDim, fontSize: 12 }}>$35 grading (~875 annotation calls via Grok 4)</div>
            </div>
            <div style={{ background: "#1a1a1a", borderRadius: 6, padding: 12 }}>
              <div style={{ color: COLORS.purple, fontWeight: 600, marginBottom: 4 }}>Anthropic — $35/mo</div>
              <div style={{ color: COLORS.textDim, fontSize: 12 }}>$35 grading (~4,375 annotation calls via Sonnet 4.5 w/ cache)</div>
              <div style={{ color: COLORS.textDim, fontSize: 12 }}>Best annotator — structured output champion</div>
            </div>
            <div style={{ background: "#1a1a1a", borderRadius: 6, padding: 12 }}>
              <div style={{ color: COLORS.cyan, fontWeight: 600, marginBottom: 4 }}>OpenAI — $25/mo</div>
              <div style={{ color: COLORS.textDim, fontSize: 12 }}>$25 grading (~1,667 annotation calls via GPT-4o w/ batch)</div>
              <div style={{ color: COLORS.textDim, fontSize: 12 }}>Cheapest mid-tier, good analytical diversity</div>
            </div>
          </div>
        </Card>
      </div>

      <Card title="GENERATION vs GRADING — Why Generation is Almost Free">
        <p style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>
          Wankr's live responses use <span style={{ color: COLORS.orange }}>Grok 4.1 Fast</span> at $0.001/response.
          Even 150 responses/day = $4.50/month. The real cost is the grading pipeline that produces training data.
          Once training plateaus, generation cost is the ONLY remaining expense.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[
            { name: "Generation\n(Grok Fast)", cost: 5, label: "~5,000 responses" },
            { name: "Grading\n(3 mid-tier)", cost: 95, label: "~766 graded" },
          ]} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: COLORS.textDim, fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fill: COLORS.text, fontSize: 11 }} />
            <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
              <Cell fill={COLORS.orange} />
              <Cell fill={COLORS.green} />
            </Bar>
            <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.green}`, borderRadius: 4, fontSize: 12 }}
              formatter={(v) => [`$${v}/mo`]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function DiminishingReturnsTab() {
  return (
    <div>
      <Card title="ACCURACY vs TRAINING DATA — The Learning Curve">
        <p style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 12 }}>
          Wankr's aggregate score starts at 74.87 (v1 baseline). Improvement follows a logarithmic curve — fast gains early, then flattening.
          Theoretical ceiling: ~92.87 (perfect persona + accuracy is unrealistic beyond this).
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={diminishingReturnsData.filter(d => d.layers <= 12000)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="layers" tick={{ fill: COLORS.textDim, fontSize: 10 }} label={{ value: "Training Layers", position: "insideBottom", offset: -5, fill: COLORS.textDim, fontSize: 11 }} />
            <YAxis yAxisId="score" domain={[74, 94]} tick={{ fill: COLORS.green, fontSize: 10 }} label={{ value: "Score", angle: -90, position: "insideLeft", fill: COLORS.green, fontSize: 11 }} />
            <YAxis yAxisId="marginal" orientation="right" domain={[0, 0.06]} tick={{ fill: COLORS.orange, fontSize: 10 }} label={{ value: "Marginal Gain", angle: 90, position: "insideRight", fill: COLORS.orange, fontSize: 11 }} />
            <Area yAxisId="score" dataKey="score" fill={COLORS.greenDark} stroke={COLORS.green} strokeWidth={2} name="Aggregate Score" />
            <Line yAxisId="marginal" dataKey="marginalImprovement" stroke={COLORS.orange} strokeWidth={1.5} dot={false} name="Marginal Improvement per 200 layers" />
            <ReferenceLine yAxisId="score" y={92.87} stroke={COLORS.red} strokeDasharray="5 5" label={{ value: "Ceiling: 92.87", fill: COLORS.red, fontSize: 10 }} />
            <ReferenceLine x={6894} stroke={COLORS.yellow} strokeDasharray="5 5" label={{ value: "Month 1 ($100)", fill: COLORS.yellow, fontSize: 10, position: "top" }} />
            <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.green}`, borderRadius: 4, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card title="IMPROVEMENT PER $1 SPENT — The Diminishing Returns Cliff" accent={COLORS.orange}>
        <p style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 12 }}>
          This is the key graph. It shows how much score improvement you get for each additional dollar spent.
          The cliff happens around <span style={{ color: COLORS.red }}>$80-120 cumulative</span> — after that, each dollar buys almost nothing.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={costPerPointData.filter(d => d.spent <= 400)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="spent" tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={(v) => `$${v}`}
              label={{ value: "Cumulative $ Spent on Grading", position: "insideBottom", offset: -5, fill: COLORS.textDim, fontSize: 11 }} />
            <YAxis yAxisId="score" domain={[74, 94]} tick={{ fill: COLORS.green, fontSize: 10 }} />
            <YAxis yAxisId="marginal" orientation="right" tick={{ fill: COLORS.orange, fontSize: 10 }} />
            <Area yAxisId="score" dataKey="score" fill={COLORS.greenDark} stroke={COLORS.green} strokeWidth={2} name="Score" />
            <Line yAxisId="marginal" dataKey="marginalPerDollar" stroke={COLORS.orange} strokeWidth={2} dot={false} name="Points gained per $1" />
            <ReferenceLine yAxisId="score" y={92.87} stroke={COLORS.red} strokeDasharray="5 5" />
            <ReferenceLine x={100} stroke={COLORS.yellow} strokeDasharray="5 5" label={{ value: "Month 1 budget", fill: COLORS.yellow, fontSize: 10, position: "top" }} />
            <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.green}`, borderRadius: 4, fontSize: 11 }}
              formatter={(v, name) => [typeof v === 'number' ? v.toFixed(3) : v, name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card title="THE MATH — Where Each Dollar Goes">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.green}` }}>
                {["$ Spent", "Layers", "Score", "Improvement", "Cost/Point", "Verdict"].map(h => (
                  <th key={h} style={{ color: COLORS.green, padding: "8px 6px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { spent: "$10", layers: "725", score: "80.4", imp: "+5.5", cpp: "$1.82", verdict: "HUGE VALUE", color: COLORS.green },
                { spent: "$30", layers: "2,177", score: "86.8", imp: "+11.9", cpp: "$2.52", verdict: "GREAT VALUE", color: COLORS.green },
                { spent: "$60", layers: "4,355", score: "90.5", imp: "+15.6", cpp: "$3.85", verdict: "GOOD VALUE", color: COLORS.yellow },
                { spent: "$100", layers: "7,258", score: "91.9", imp: "+17.0", cpp: "$5.88", verdict: "DIMINISHING", color: COLORS.orange },
                { spent: "$200", layers: "14,516", score: "92.7", imp: "+17.8", cpp: "$11.24", verdict: "LOW VALUE", color: COLORS.red },
                { spent: "$400", layers: "29,032", score: "92.9", imp: "+18.0", cpp: "$22.22", verdict: "WASTE", color: COLORS.red },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: "8px 6px", color: COLORS.text }}>{row.spent}</td>
                  <td style={{ padding: "8px 6px", color: COLORS.textDim }}>{row.layers}</td>
                  <td style={{ padding: "8px 6px", color: COLORS.green }}>{row.score}</td>
                  <td style={{ padding: "8px 6px", color: COLORS.cyan }}>{row.imp}</td>
                  <td style={{ padding: "8px 6px", color: COLORS.textDim }}>{row.cpp}</td>
                  <td style={{ padding: "8px 6px", color: row.color, fontWeight: 600 }}>{row.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SustainabilityTab() {
  return (
    <div>
      <Card title="WHEN DOES WANKR BECOME SELF-SUSTAINING?">
        <div style={{ background: "#1a1a0a", borderRadius: 6, padding: 16, marginBottom: 16, borderLeft: `3px solid ${COLORS.yellow}` }}>
          <p style={{ color: COLORS.yellow, fontWeight: 600, margin: "0 0 8px" }}>Reality Check: What "Self-Sustaining" Actually Means</p>
          <p style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            Wankr runs on Grok. It will <strong>always</strong> need API calls to generate responses — you can't train your own LLM from scratch
            on $100/month (that costs millions). But "self-sustaining" means something else here:
          </p>
          <p style={{ color: COLORS.green, fontSize: 13, lineHeight: 1.6, margin: "8px 0 0" }}>
            <strong>Self-sustaining = grading costs drop to near zero because quality is stable, and only cheap generation costs remain (~$5-10/month).</strong>
          </p>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={sustainabilityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="month" tick={{ fill: COLORS.textDim, fontSize: 11 }} label={{ value: "Month", position: "insideBottom", offset: -5, fill: COLORS.textDim }} />
            <YAxis yAxisId="cost" domain={[0, 110]} tick={{ fill: COLORS.orange, fontSize: 10 }} label={{ value: "$ / month", angle: -90, position: "insideLeft", fill: COLORS.orange, fontSize: 11 }} />
            <YAxis yAxisId="score" orientation="right" domain={[70, 95]} tick={{ fill: COLORS.green, fontSize: 10 }} label={{ value: "Score", angle: 90, position: "insideRight", fill: COLORS.green, fontSize: 11 }} />
            <Area yAxisId="cost" dataKey="gradingCost" stackId="costs" fill={COLORS.purple} fillOpacity={0.6} stroke={COLORS.purple} name="Grading Cost" />
            <Area yAxisId="cost" dataKey="genCost" stackId="costs" fill={COLORS.orange} fillOpacity={0.6} stroke={COLORS.orange} name="Generation Cost" />
            <Area yAxisId="cost" dataKey="surplus" stackId="costs" fill={COLORS.greenDark} fillOpacity={0.4} stroke={COLORS.green} name="Budget Surplus" />
            <Line yAxisId="score" dataKey="score" stroke={COLORS.green} strokeWidth={3} dot={{ fill: COLORS.green, r: 4 }} name="Wankr Score" />
            <ReferenceLine x={3} stroke={COLORS.yellow} strokeDasharray="5 5" label={{ value: "Diminishing Returns", fill: COLORS.yellow, fontSize: 10, position: "top" }} />
            <ReferenceLine x={6} stroke={COLORS.cyan} strokeDasharray="5 5" label={{ value: "Maintenance Mode", fill: COLORS.cyan, fontSize: 10, position: "top" }} />
            <ReferenceLine x={9} stroke={COLORS.green} strokeDasharray="5 5" label={{ value: "Self-Sustaining", fill: COLORS.green, fontSize: 10, position: "top" }} />
            <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.green}`, borderRadius: 4, fontSize: 11 }}
              formatter={(v, name) => [`$${v}`, name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card title="THE FOUR PHASES" accent={COLORS.cyan}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { phase: "Phase 1: Heavy Training", months: "Month 1-2", budget: "$100/mo (all grading)", score: "74.87 → 91.8", color: COLORS.red, layers: "~13,800", desc: "Maximum training velocity. Every dollar goes to annotation layers." },
            { phase: "Phase 2: Refinement", months: "Month 3-5", budget: "$75/mo ($60 grade + $15 gen)", score: "91.8 → 92.7", color: COLORS.orange, layers: "~13,000 more", desc: "Quality stabilizing. Focus on edge cases, Scenario D traps, rare penalties." },
            { phase: "Phase 3: Maintenance", months: "Month 6-8", budget: "$35/mo ($20 grade + $15 gen)", score: "92.7 → 92.82", color: COLORS.yellow, layers: "Spot checks", desc: "Grading is now spot-checking, not bulk training. Budget surplus grows." },
            { phase: "Phase 4: Self-Sustaining", months: "Month 9+", budget: "$20/mo ($10 grade + $10 gen)", score: "92.82+", color: COLORS.green, layers: "Rare audits", desc: "Only grade when new scenarios emerge. $80/month freed for other features." },
          ].map((p, i) => (
            <div key={i} style={{ background: "#1a1a1a", borderRadius: 6, padding: 14, borderTop: `3px solid ${p.color}` }}>
              <div style={{ color: p.color, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.phase}</div>
              <div style={{ color: COLORS.text, fontSize: 12, marginBottom: 4 }}>{p.months}</div>
              <div style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 2 }}>Budget: {p.budget}</div>
              <div style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 2 }}>Score: {p.score}</div>
              <div style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 6 }}>Layers: {p.layers}</div>
              <div style={{ color: COLORS.text, fontSize: 12 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="REVENUE BREAK-EVEN — When Wankr Pays for Itself">
        <p style={{ color: COLORS.text, fontSize: 13, lineHeight: 1.6 }}>
          Once in self-sustaining mode (Month 9+), Wankr's API cost drops to <span style={{ color: COLORS.green }}>~$20/month</span>. That's the number to beat with revenue.
          Any combination of subscriptions, tips, token appreciation, or partnerships that exceeds $20/month makes Wankr fully self-funding.
        </p>
        <div style={{ display: "flex", justifyContent: "space-around", marginTop: 12 }}>
          <Stat label="Break-even at" value="$20" unit="/mo" color={COLORS.green} />
          <Stat label="Time to self-sustain" value="~9" unit=" months" color={COLORS.cyan} />
          <Stat label="Total investment" value="~$600" unit=" total" color={COLORS.orange} />
          <Stat label="Training layers" value="~35K" unit="+" color={COLORS.purple} />
        </div>
      </Card>
    </div>
  );
}

function TimelineTab() {
  return (
    <div>
      <Card title="12-MONTH BUDGET PLAN">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyProjection.filter(d => d.month > 0)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="label" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
            <YAxis domain={[0, 110]} tick={{ fill: COLORS.textDim, fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
            <Bar dataKey="gradingBudget" stackId="a" fill={COLORS.purple} name="Grading $" />
            <Bar dataKey="genBudget" stackId="a" fill={COLORS.orange} name="Generation $" />
            <Bar dataKey="surplus" stackId="a" fill={COLORS.greenDark} name="Surplus $" />
            <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.green}`, borderRadius: 4, fontSize: 11 }}
              formatter={(v, name) => [`$${v}`, name]} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="SCORE TRAJECTORY">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={monthlyProjection}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="label" tick={{ fill: COLORS.textDim, fontSize: 11 }} />
            <YAxis domain={[74, 94]} tick={{ fill: COLORS.green, fontSize: 10 }} />
            <Line dataKey="score" stroke={COLORS.green} strokeWidth={3} dot={{ fill: COLORS.green, r: 5 }} name="Wankr Score" />
            <ReferenceLine y={92.87} stroke={COLORS.red} strokeDasharray="5 5" label={{ value: "Theoretical Ceiling", fill: COLORS.red, fontSize: 10 }} />
            <ReferenceLine y={90} stroke={COLORS.yellow} strokeDasharray="3 3" label={{ value: "Production Ready", fill: COLORS.yellow, fontSize: 10 }} />
            <Tooltip contentStyle={{ background: COLORS.card, border: `1px solid ${COLORS.green}`, borderRadius: 4, fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="FULL 12-MONTH TABLE">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${COLORS.green}` }}>
                {["Month", "Phase", "Score", "Grading $", "Gen $", "Surplus", "Layers", "Cumulative"].map(h => (
                  <th key={h} style={{ color: COLORS.green, padding: "6px 4px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyProjection.filter(d => d.month > 0).map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
                  <td style={{ padding: "6px 4px", color: COLORS.text }}>{row.label}</td>
                  <td style={{ padding: "6px 4px", color: row.phase === "Heavy Training" ? COLORS.red : row.phase === "Refinement" ? COLORS.orange : row.phase === "Maintenance" ? COLORS.yellow : COLORS.green, fontSize: 10 }}>{row.phase}</td>
                  <td style={{ padding: "6px 4px", color: COLORS.green, fontWeight: 600 }}>{row.score}</td>
                  <td style={{ padding: "6px 4px", color: COLORS.purple }}>${row.gradingBudget}</td>
                  <td style={{ padding: "6px 4px", color: COLORS.orange }}>${row.genBudget}</td>
                  <td style={{ padding: "6px 4px", color: COLORS.green }}>${row.surplus}</td>
                  <td style={{ padding: "6px 4px", color: COLORS.textDim }}>{row.layers.toLocaleString()}</td>
                  <td style={{ padding: "6px 4px", color: COLORS.cyan }}>{row.cumulativeLayers.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="KEY MILESTONES" accent={COLORS.yellow}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { month: "M1", event: "Score hits 88+ — repetition penalties eliminated", color: COLORS.green },
            { month: "M2", event: "Score hits 91+ — persona balance stabilized across all 5 influences", color: COLORS.green },
            { month: "M3", event: "Diminishing returns cliff — each dollar adds < 0.03 points", color: COLORS.orange },
            { month: "M4", event: "Scenario D (THE TRAP) handling consistently scores 85+", color: COLORS.yellow },
            { month: "M6", event: "Maintenance mode — grading is spot-checks only", color: COLORS.cyan },
            { month: "M9", event: "Self-sustaining — $80/month freed, only $20 needed for API", color: COLORS.green },
            { month: "M12", event: "35,000+ training layers. Wankr's persona is locked. Revenue covers costs.", color: COLORS.green },
          ].map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ color: m.color, fontWeight: 700, minWidth: 32, fontSize: 13 }}>{m.month}</div>
              <div style={{ color: COLORS.text, fontSize: 12 }}>{m.event}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function WankrBudgetDashboard() {
  const [activeTab, setActiveTab] = useState("models");

  return (
    <div style={{ background: COLORS.bg, color: COLORS.text, minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 0", borderBottom: `2px solid ${COLORS.green}`, marginBottom: 16 }}>
        <h1 style={{ color: COLORS.green, margin: 0, fontSize: 22, fontWeight: 700 }}>WANKRBOT</h1>
        <p style={{ color: COLORS.textDim, margin: "4px 0 12px", fontSize: 13 }}>$100/Month API Budget — Model Selection, Allocation, and ROI Analysis</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, padding: "0 24px", marginBottom: 16, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              background: activeTab === t.id ? COLORS.green : "transparent",
              color: activeTab === t.id ? COLORS.bg : COLORS.textDim,
              border: `1px solid ${activeTab === t.id ? COLORS.green : "#333"}`,
              borderRadius: 4,
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: activeTab === t.id ? 700 : 400,
              fontSize: 12,
              transition: "all 0.2s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "0 24px 40px" }}>
        {activeTab === "models" && <ModelSelectionTab />}
        {activeTab === "budget" && <BudgetAllocationTab />}
        {activeTab === "returns" && <DiminishingReturnsTab />}
        {activeTab === "sustain" && <SustainabilityTab />}
        {activeTab === "timeline" && <TimelineTab />}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 24px", borderTop: `1px solid #222`, color: COLORS.textDim, fontSize: 10, textAlign: "center" }}>
        WankrBot Cost Analysis | February 2026 | Based on published API pricing | Projections assume cache + batch optimizations enabled
      </div>
    </div>
  );
}
