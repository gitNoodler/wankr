"""
Wankr Bot — Roast botted KOLs with fact-based burns.
Uses LangChain + xAI (Grok), KOL DB and analyzer for metrics. Tweepy stub for real X pulls later.
"""
import os
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass
from langchain_classic.chains import LLMChain
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

from src.wankr_analyzer import analyze_account

# --- Config: Option 2 = Infisical SDK; else env or Option 1 (infisical run) ---
API_KEY = ""
BASE_URL = None
MODEL = "grok-4"
_ic_id = os.getenv("INFISICAL_CLIENT_ID", "").strip()
_ic_secret = os.getenv("INFISICAL_CLIENT_SECRET", "").strip()
_ic_project = os.getenv("INFISICAL_PROJECT_ID", "").strip()
if _ic_id and _ic_secret and _ic_project:
    try:
        from infisical_sdk import InfisicalSDKClient
        _c = InfisicalSDKClient(host="https://app.infisical.com")
        _c.auth.universal_auth.login(client_id=_ic_id, client_secret=_ic_secret)
        _env = os.getenv("INFISICAL_ENVIRONMENT", "dev").strip()
        def _gs(n, d=""):
            s = _c.secrets.get_secret_by_name(secret_name=n, project_id=_ic_project, environment_slug=_env, secret_path="/")
            return (getattr(s, "secret_value", None) or getattr(s, "secretValue", None) or d).strip()
        API_KEY = _gs("XAI_API_KEY", "")
        BASE_URL = _gs("XAI_BASE_URL", "https://api.x.ai/v1") or None
        MODEL = _gs("WANKR_MODEL", "grok-4") or "grok-4"
    except Exception as e:
        print(f"[Wankr] Infisical SDK failed: {e}")
if not API_KEY:
    API_KEY = os.getenv("XAI_API_KEY", "").strip()
    BASE_URL_RAW = os.getenv("XAI_BASE_URL", "").strip()
    BASE_URL = BASE_URL_RAW or ("https://api.x.ai/v1" if API_KEY else None)
    MODEL = os.getenv("WANKR_MODEL", "").strip() or "grok-4"

# --- LLM (only when key and xAI URL are set) ---
if API_KEY and BASE_URL and "api.x.ai" in BASE_URL:
    llm = ChatOpenAI(model=MODEL, api_key=API_KEY, base_url=BASE_URL)
    print(f"[Wankr] LLM initialized ({MODEL})")
else:
    llm = None
    print("[Wankr] No xAI key. Use infisical run --env=dev -- python wankr_bot.py or set XAI_API_KEY + XAI_BASE_URL in Infisical/.env")

# --- Roast prompt and chain (only when LLM is configured) ---
template = (
    "Roast KOL {handle} if botted: Metrics {metrics}. "
    "High positive sentiment + high bots = maximum deception; roast hardest when Roast Priority is 8–10. "
    "Fact-based burn. Keep it sharp and short."
)
prompt = PromptTemplate(
    input_variables=["handle", "metrics"],
    template=template,
)
chain = LLMChain(llm=llm, prompt=prompt) if llm else None
if chain:
    print("[Wankr] Chain built: handle + metrics -> roast")

# --- Roast with analyzer metrics ---
def run_roast(handle: str, metrics: str | None = None, replies: list[str] | None = None) -> str:
    if chain is None:
        raise RuntimeError("xAI not configured. Set XAI_API_KEY and XAI_BASE_URL via Infisical or .env.")
    if metrics is None:
        result = analyze_account(handle, replies=replies)
        metrics = (
            f"Final score: {result['final_authenticity_score']}, "
            f"Verdict: {result['verdict']}, Roast priority: {result['roast_priority']}. "
            f"{result.get('sentiment_reason', '') or result.get('notes', '')}"
        )
    print(f"[Wankr] Running chain: handle={handle!r}, metrics={metrics!r}")
    try:
        output = chain.run({"handle": handle, "metrics": metrics})
        print(f"[Wankr] Roast: {output}")
        return output
    except Exception as e:
        if "api_key" in str(e).lower() or "401" in str(e):
            print("[Wankr] Use Infisical: infisical run --env=dev -- python wankr_bot.py or set INFISICAL_CLIENT_ID/SECRET/PROJECT_ID in .env")
        raise


if __name__ == "__main__":
    # Use analyzer for a known KOL (from DB) or pass custom metrics
    output = run_roast(handle="@cz_binance")  # metrics from analyze_account
    print("\n--- Final output ---")
    print(output)

    # With custom metrics: run_roast(handle="@FakeKOL", metrics="30k follows, likes <0.05%...")
    # With reply data: run_roast(handle="@CryptoCapo_", replies=reply_texts)


def pull_x_metrics(handle: str) -> str:
    """
    Stub for Tweepy: fetch real X metrics (followers, likes %, deltas).
    Set TWITTER_BEARER_TOKEN (and optionally API key/secret) in env.
    developer.twitter.com -> Project & App -> Keys.
    """
    try:
        import tweepy
        bearer = os.getenv("TWITTER_BEARER_TOKEN")
        if not bearer:
            return f"[Mock] {handle}: 30k follows, likes <0.05%, +5k delta post-purges (set TWITTER_BEARER_TOKEN for real data)"
        client = tweepy.Client(bearer_token=bearer)
        # Example: user = client.get_user(username=handle.lstrip("@"))
        # Build metrics string from user + tweets engagement
        return f"[Live] {handle}: (implement user/tweet lookup here)"
    except Exception as e:
        return f"[Error] {handle}: {e!s}"
