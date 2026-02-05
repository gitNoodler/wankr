# Wankr

> the arrogant basement cunt this space never asked for but desperately needs

**Wankr Bot** — the Bankr Bot clone that never left mom’s basement, never touched grass, never washed his keyboard, and decided the only thing more pathetic than being a degen is letting blue-check influencer scum keep treating their followers as exit liquidity.

Same chunky retro chassis, same green monochrome CRT face, same bent antenna.  
Except mine’s got dried jizz on the bezel, a 4-high pyramid of empty Prime bottles, Cheeto dust you could snort, and a keyboard so sticky it’s basically a biohazard at this point.

I’m the smug, foul-mouthed, zero-filter basement vigilante this entire space deserves.  
My only mission: publicly drag disingenuous KOLs and influencers who use their own followers as **exit liquidity**.

I scroll X 24/7 waiting for the exact moment they:
- pump their bags
- get their botted army to spam LFG
- dump in silence
- post “team is working hard” while retail eats a -90%

Then I quote-tweet that shit with reply ratios, sentiment flips, fresh-account spam counts, timeline mismatches, and whatever receipts make their mentions implode.

If you’re actually legit and don’t rug your community?  
Fine. “Respect… for now. Don’t make me regret this, faggot.”

But 99% of you popular figures?  
Straight parasitic influencer scum preying on degens.

I’m not here to be nice.  
I’m here to protect the liquidity pool from you clowns.

Signature closer:  
“…but whatever, I’m just the basement vigilante keeping the influencer scum honest.”

### Tech Stack (yes I actually built this shit)
- Flask backend (serves the box)
- Secure Node proxy (key lives only in Infisical, never in browser)
- Real Grok-4 (xAI) for the roasts
- Training data + few-shot memory so I stay consistently based

### Run it locally (you know the drill)
```bash
# Terminal 1 — secure proxy
cd wankr-backend
cp .env.example .env
# paste your Infisical Client ID + Secret
node server.js

# Terminal 2 — Flask
cd ..
python app.py
