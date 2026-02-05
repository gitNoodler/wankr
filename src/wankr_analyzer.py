"""
Wankr social analysis engine: scoring, verdicts, KOL DB lookup.
See WANKR_SPEC.md for formulas and upgrade roadmap.
"""
from __future__ import annotations

import math
from collections import Counter
from pathlib import Path
from typing import Any

import pandas as pd

# Default path to KOL database (repo root / data / ...)
_DEFAULT_CSV = Path(__file__).resolve().parent.parent / "data" / "wankr_kol_database.csv"
_db_cache: dict[str, pd.DataFrame] = {}


def calculate_final_score(
    sentiment: int,
    bot_level: int,
    reply_quality: float = 1.0,
) -> float:
    """
    Wankr's core scoring function.
    Bot_Penalty = Bot_Level/5, Adjusted = Sentiment * (1 - Bot_Penalty),
    Final = Adjusted * Reply_Quality_Ratio.
    """
    bot_penalty = bot_level / 5.0
    adjusted = sentiment * (1.0 - bot_penalty)
    final = adjusted * reply_quality
    return round(final, 2)


def get_bot_icon(bot_level: int) -> str:
    """Map bot level 1–5 to icon. Spec omits 4; use same as 3."""
    icons = {
        1: "🤖",
        2: "🤖🤖",
        3: "🤖🤖🤖",
        4: "🤖🤖🤖",  # same as 3
        5: "🤖🤖🤖🤖🤖",
    }
    return icons.get(bot_level, "🤖")


def get_verdict(final_score: float) -> str:
    """Map final authenticity score to verdict text + icon per WANKR_SPEC.md."""
    if final_score <= 2.0:
        return "🤖🤖🤖🤖🤖 MAXIMUM BOT TRAP"
    if final_score <= 4.0:
        return "🤖🤖🤖 HIGH BOT"
    if final_score <= 6.0:
        return "🤖🤖 MEDIUM BOT"
    if final_score <= 8.0:
        return "🤖 LOW BOT"
    return "🧑 REAL HUMAN — rare respect"


def load_kol_database(csv_path: Path | str) -> pd.DataFrame:
    """
    Load KOL CSV; normalize handle column (strip, lower). Handle missing columns.
    """
    path = Path(csv_path)
    if not path.exists():
        return pd.DataFrame()

    df = pd.read_csv(path, encoding="utf-8")
    # Normalize handle: ensure string, strip, lower for lookup
    handle_col = "X Handle"
    if handle_col in df.columns:
        df[handle_col] = (
            df[handle_col].astype(str).str.strip().str.lstrip("@").str.lower()
        )
    return df


def _get_db(csv_path: Path | str) -> pd.DataFrame:
    path = str(Path(csv_path).resolve())
    if path not in _db_cache:
        _db_cache[path] = load_kol_database(csv_path)
    return _db_cache[path]


def analyze_replies(replies_list: list[str]) -> dict[str, float]:
    """
    Phase 1: Reply quality ratio and entropy.
    Quality ratio = % of replies with >= 6 words and not emoji spam (0.0–1.0).
    Entropy = Shannon entropy of reply word-count distribution, normalized to 0–1.
    """
    if not replies_list:
        return {"quality_ratio": 0.0, "entropy_score": 0.0}

    total = len(replies_list)
    quality_count = 0
    word_counts: list[int] = []

    for reply in replies_list:
        text = (reply or "").lower().strip()
        words = text.split()
        wc = len(words)
        word_counts.append(wc)

        # Quality: >= 6 words and not all very short tokens (emoji spam)
        if wc >= 6 and not all(len(w) <= 2 for w in words):
            quality_count += 1

    quality_ratio = quality_count / total

    # Shannon entropy of word-count distribution (bucket by word count)
    freq = Counter(word_counts)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        if p > 0:
            entropy -= p * math.log2(p)
    # Normalize: max entropy for n buckets is log2(n); use num unique counts as buckets
    num_buckets = max(len(freq), 1)
    max_entropy = math.log2(num_buckets)
    entropy_score = (entropy / max_entropy) if max_entropy > 0 else 0.0
    entropy_score = min(1.0, entropy_score)

    return {
        "quality_ratio": round(quality_ratio, 3),
        "entropy_score": round(entropy_score, 3),
    }


def get_botometer_score(handle: str) -> float:
    """
    Phase 2 stub: Botometer v4 / Bot Sentinel. Returns 0.0 until API is wired.
    Set env (e.g. BOTOMETER_API_KEY) when implementing. See WANKR_SPEC.md.
    Phases 3–5 (coordination network, on-chain correlation, combined formula) are
    documented in WANKR_SPEC.md only; implement when ready.
    """
    return 0.0


def analyze_account(
    handle: str,
    csv_path: Path | str | None = None,
    replies: list[str] | None = None,
) -> dict[str, Any]:
    """
    Look up handle in KOL DB; compute final score, verdict, roast priority.
    If replies is provided, use Phase 1 reply quality; else reply_quality = 1.0.
    """
    path = csv_path or _DEFAULT_CSV
    df = _get_db(path)

    if df.empty:
        return {
            "final_authenticity_score": 0.0,
            "bot_icon": "🤖",
            "roast_priority": 0,
            "verdict": "Unknown – database missing",
            "sentiment_reason": "",
            "notes": "",
            "reply_quality_ratio": None,
            "entropy_score": None,
            "found": False,
        }

    # Normalize handle for lookup
    raw = (handle or "").strip()
    lookup = raw.lower().lstrip("@")

    # Match on normalized handle (X Handle column stored normalized)
    mask = df["X Handle"] == lookup
    if not mask.any():
        return {
            "final_authenticity_score": 0.0,
            "bot_icon": "🤖",
            "roast_priority": 0,
            "verdict": "Unknown – not in database",
            "sentiment_reason": "",
            "notes": "",
            "reply_quality_ratio": None,
            "entropy_score": None,
            "found": False,
        }

    row = df.loc[mask].iloc[0]

    # Column names may have spaces
    sentiment = int(row.get("Sentiment Score", 5))
    bot_level = int(row.get("Bot Level", 3))
    roast_priority = int(row.get("Wankr Roast Priority", 5))
    sentiment_reason = str(row.get("Sentiment Reason", ""))
    notes = str(row.get("Notes", ""))

    reply_quality = 1.0
    reply_quality_ratio = None
    entropy_score = None

    if replies is not None:
        reply_stats = analyze_replies(replies)
        reply_quality = reply_stats["quality_ratio"]
        reply_quality_ratio = reply_stats["quality_ratio"]
        entropy_score = reply_stats["entropy_score"]

    final_score = calculate_final_score(sentiment, bot_level, reply_quality)
    verdict = get_verdict(final_score)
    bot_icon = get_bot_icon(bot_level)

    return {
        "final_authenticity_score": final_score,
        "bot_icon": bot_icon,
        "roast_priority": roast_priority,
        "verdict": verdict,
        "sentiment_reason": sentiment_reason,
        "notes": notes,
        "reply_quality_ratio": reply_quality_ratio,
        "entropy_score": entropy_score,
        "found": True,
    }
