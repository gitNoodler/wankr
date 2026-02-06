# WANKR BOT – SOCIAL ANALYSIS & ROAST ENGINE

**Complete Handoff Document for Cursor**  
Author: Payton (@gitNoodler)  
Date: February 2026

## 1. Wankr Bot Character (Locked)

Wankr is an arrogant, foul-mouthed, zero-filter basement vigilante who protects degens from KOLs using followers as exit liquidity.

- **Tone**: smug, contemptuous, dark/edgy, heavy swearing, zero mercy.
- **Signature closer**: "...but whatever, I'm just the basement vigilante keeping the influencer scum honest."

## 2. Core Goal

Accurately detect fake/botted engagement on X — especially accounts that look popular and positive.

**High positive sentiment + high bots = maximum deception → highest roast priority.**

## 3. Master Database (112 accounts)

Use the master table. Columns (exact order):

| Column | Type | Description |
|--------|------|-------------|
| X Handle | str | @username |
| Followers | str | e.g. 1.2M+, 500k+ |
| Chain Preference | str | Solana, Base, Bitcoin, Multi-chain, etc. |
| Rating | str | ✅ / 🚩 / 🤷‍♂️ |
| Sentiment Score (1-10) | int | 10 = most loved, 1 = most hated |
| Organic Engagement Score (1-10) | int | 10 = most organic, 1 = heavily botted |
| Engagement Drop % | float | Post Jan 15 2026 drop |
| Bot Level (1–5) | int | 1 = low bot, 5 = maximum bot |
| Bot Icon | str | 🤖 / 🤖🤖 / 🤖🤖🤖 / 🤖🤖🤖🤖🤖 |
| Sentiment Reason | str | Short explanation |
| Notes | str | Any extra context |
| Wankr Roast Priority (1-10) | int | 10 = nuclear target |

## 4. Bot Level System (Icon System)

| Engagement Drop % | Bot Level | Icon | Label |
|-------------------|-----------|------|-------|
| 0% – 30% | 1 | 🤖 | Low Bot |
| 31% – 55% | 2 | 🤖🤖 | Medium Bot |
| 56% – 89% | 3 | 🤖🤖🤖 | High Bot |
| 90%+ | 5 | 🤖🤖🤖🤖🤖 | MAXIMUM BOT |

(Level 4 not used in spec; use same as 3 if needed.)

## 5. Current Scoring Formula (MVP – Use This First)

```python
Bot_Penalty = Bot_Level / 5.0
Adjusted_Score = Sentiment_Score * (1 - Bot_Penalty)
Final_Authenticity_Score = Adjusted_Score * Reply_Quality_Ratio   # 0–10
```

- **Reply_Quality_Ratio**: % of replies with ≥6 words and not pure emoji spam (0.0–1.0). Default 1.0 when no reply data.

## 6. Final Rating Mapping

| Final Score | Icon | Wankr Verdict |
|-------------|------|---------------|
| 0.0 – 2.0 | 🤖🤖🤖🤖🤖 | Maximum Bot Trap |
| 2.1 – 4.0 | 🤖🤖🤖 | High Bot – deceptive |
| 4.1 – 6.0 | 🤖🤖 | Medium Bot – sus |
| 6.1 – 8.0 | 🤖 | Low Bot – mostly real |
| 8.1 – 10.0 | 🧑 | Real Human – rare respect |

## 7. Roast Priority Logic

- **10**: High positive sentiment + high bots = maximum deception → roast hardest
- **8–9**: Very high bot level or very deceptive
- **6–7**: Medium-high bot + decent sentiment
- **≤5**: Low priority

## 8. Upgrade Roadmap (Implement in This Order)

### Phase 1 – Immediate (Do This First – Biggest Accuracy Jump)

Add **Reply Quality + Reply Entropy** to every account analysis.

- **Quality ratio**: % of replies with ≥6 words + not pure emoji spam
- **Entropy score**: How repetitive the replies are (low entropy = botted)
- Update formula: `Final_Score = Adjusted_Score * quality_ratio`

### Phase 2 – This Week

Integrate **Botometer v4** (free tier) or **Bot Sentinel API** → add Botometer Score (0–5).

- Stub: `get_botometer_score(handle: str) -> float` returning 0.0 until API wired.
- No API keys in repo; use env when implementing.

### Phase 3 – Next 1–2 Weeks

**Coordination Network Analysis**

- Detect coordinated posting (same phrases, same timing windows, reply templates)
- Use simple NetworkX clustering on recent posts/replies

### Phase 4 – Medium Term

**On-chain + Social Correlation**

- Match X post timestamps → wallet activity of known KOL wallets
- "Holding strong" tweet + wallet dump 10 min later = instant nuke

### Phase 5 – Long Term (God-tier)

Combine everything into one final score + auto-roast generation.

**Final Combined Scoring (Future End-State):**

```python
Bot_Penalty = Bot_Level / 5.0
Adjusted = Sentiment_Score * (1 - Bot_Penalty)
Score = Adjusted * Reply_Quality_Ratio * (1 - Botometer_Score/5) * OnChain_Factor
```

## 9. What Cursor Should Build

1. Load the KOL database (CSV)
2. **analyze_account(handle)** → returns:
   - Final Authenticity Score (0–10)
   - Bot Icon
   - Roast Priority (1–10)
   - Short Wankr-style verdict + roast text
3. Implement Phase 1 (Reply Quality + Entropy)
4. Add Botometer later (Phase 2)

## 10. Reply Fetching (Phase 1)

For Phase 1, the caller may pass `replies` from Tweepy (e.g. recent 100–200 reply texts). Full reply fetch can be implemented as a follow-up; the analyzer accepts an optional `replies: list[str]`.

---

*This document is the single source of truth for the Wankr social analysis engine.*
