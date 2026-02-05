"""
Wankr Agent Box — Flask server. Serves the UI and /api/chat, /api/train, /api/train/count.
"""
import json
import os
import time
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI

app = Flask(__name__, static_folder="static")
CORS(app)
ROOT = Path(__file__).resolve().parent
TRAINING_FILE = ROOT / "training_data.json"
LOG_PATH = r"c:\Users\legro\Wankr\.cursor\debug.log"

# region agent log
try:
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "location": "app.py:startup",
            "message": "app startup",
            "data": {"pid": os.getpid()},
            "timestamp": int(time.time() * 1000),
            "sessionId": "debug-session",
            "runId": "pre-fix",
            "hypothesisId": "D",
        }) + "\n")
except Exception:
    pass
# endregion

DEFAULT_SYSTEM = """You are Wankr, an arrogant, foul-mouthed, zero-filter basement vigilante. You protect degens from KOLs who use their followers as exit liquidity. You see yourself as the protector of retail from influencer scum. Tone: smug, contemptuous, dark/edgy humor, heavy swearing, zero mercy. You drag disingenuous influencers with receipts, reply ratios, sentiment flips, and bot detection. Always end with: "...but whatever, I'm just the basement vigilante keeping the influencer scum honest.\""""

# Resolve xAI config: Option 2 = Infisical SDK (Machine Identity in .env); else env or Option 1 (infisical run).
_api_key = ""
_base_url = None
_model = "grok-4"
_infisical_used = False

_infisical_client_id = os.getenv("INFISICAL_CLIENT_ID", "").strip()
_infisical_client_secret = os.getenv("INFISICAL_CLIENT_SECRET", "").strip()
_infisical_project_id = os.getenv("INFISICAL_PROJECT_ID", "").strip()
if _infisical_client_id and _infisical_client_secret and _infisical_project_id:
    try:
        from infisical_sdk import InfisicalSDKClient
        _client = InfisicalSDKClient(host="https://app.infisical.com")
        _client.auth.universal_auth.login(
            client_id=_infisical_client_id,
            client_secret=_infisical_client_secret,
        )
        _env_slug = os.getenv("INFISICAL_ENVIRONMENT", "dev").strip()
        _secret_path = "/"

        def _get_secret(name, default=""):
            s = _client.secrets.get_secret_by_name(
                secret_name=name,
                project_id=_infisical_project_id,
                environment_slug=_env_slug,
                secret_path=_secret_path,
            )
            v = getattr(s, "secret_value", None) or getattr(s, "secretValue", None) or ""
            return (v or default).strip()

        _api_key = _get_secret("XAI_API_KEY", "")
        _base_url = _get_secret("XAI_BASE_URL", "https://api.x.ai/v1") or None
        _model = _get_secret("WANKR_MODEL", "grok-4") or "grok-4"
        _infisical_used = True
    except Exception as e:
        print(f"[Wankr] Infisical SDK failed: {e}")

if not _api_key:
    _api_key = os.getenv("XAI_API_KEY", "").strip()
    _base_url_raw = os.getenv("XAI_BASE_URL", "").strip()
    _base_url = _base_url_raw or ("https://api.x.ai/v1" if _api_key else None)
    if _api_key and _api_key.startswith("xai-") and (not _base_url or "api.x.ai" not in (_base_url or "")):
        _base_url = "https://api.x.ai/v1"
    _model = os.getenv("WANKR_MODEL", "").strip() or "grok-4"

# Only create LLM when we have a key and xAI base URL (never hit OpenAI by mistake)
if _api_key and _base_url and "api.x.ai" in _base_url:
    llm = ChatOpenAI(
        model=_model,
        api_key=_api_key,
        base_url=_base_url,
    )
    if _infisical_used:
        print(f"[Wankr] xAI key from Infisical, model={_model}, base_url={_base_url}")
    else:
        print(f"[Wankr] xAI key from env, model={_model}, base_url={_base_url}")
else:
    llm = None
    print("[Wankr] No xAI key or base URL. Run run_with_infisical.bat (Infisical secrets: XAI_API_KEY, XAI_BASE_URL=https://api.x.ai/v1)")


FRONTEND_DIST = ROOT / "frontend" / "dist"


@app.route("/")
def index():
    """Serve React app if built (frontend/dist), else legacy index.html."""
    if (FRONTEND_DIST / "index.html").exists():
        return send_from_directory(FRONTEND_DIST, "index.html")
    return send_from_directory(ROOT, "index.html")


@app.route("/assets/<path:filename>")
def frontend_assets(filename):
    """Serve Vite-built assets when using React dashboard."""
    if FRONTEND_DIST.exists():
        return send_from_directory(FRONTEND_DIST / "assets", filename)
    return "", 404


def _messages_from_history(history: list, new_message: str):
    """Build [System(Wankr), ...history, Human(new_message)] for full context."""
    from langchain_core.messages import AIMessage
    out = [SystemMessage(content=DEFAULT_SYSTEM)]
    for m in history or []:
        role = (m.get("role") or "").lower()
        content = (m.get("content") or "").strip()
        if not content:
            continue
        if role == "user":
            out.append(HumanMessage(content=content))
        else:
            out.append(AIMessage(content=content))
    out.append(HumanMessage(content=new_message))
    return out


@app.route("/api/chat", methods=["POST"])
def chat():
    if llm is None:
        return jsonify({"error": "xAI not configured. Run run_with_infisical.bat and set XAI_API_KEY + XAI_BASE_URL in Infisical (dev)."}), 503
    data = request.get_json() or {}
    message = (data.get("message") or "").strip()
    history = data.get("history")
    if not isinstance(history, list):
        history = []
    if not message:
        return jsonify({"error": "message is required"}), 400
    try:
        messages = _messages_from_history(history, message)
        response = llm.invoke(messages)
        reply = response.content if hasattr(response, "content") else str(response)
        return jsonify({"reply": reply})
    except Exception as e:
        code = 401 if "api_key" in str(e).lower() or "401" in str(e) else 500
        return jsonify({"error": str(e)}), code


def _load_training():
    if not TRAINING_FILE.exists():
        return []
    try:
        with open(TRAINING_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save_training(records):
    with open(TRAINING_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)


@app.route("/api/train", methods=["POST"])
def train():
    data = request.get_json() or {}
    messages = data.get("messages") or []
    system_prompt = (data.get("system_prompt") or "").strip()
    # region agent log
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "location": "app.py:train:entry",
                "message": "train payload received",
                "data": {
                    "messagesCount": len(messages) if isinstance(messages, list) else -1,
                    "hasSystemPrompt": bool(system_prompt),
                    "systemPromptLength": len(system_prompt),
                },
                "timestamp": int(time.time() * 1000),
                "sessionId": "debug-session",
                "runId": "pre-fix",
                "hypothesisId": "A",
            }) + "\n")
    except Exception:
        pass
    # endregion
    if not isinstance(messages, list):
        return jsonify({"error": "messages must be an array"}), 400
    records = _load_training()
    records.append({"messages": messages})
    # region agent log
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "location": "app.py:train:store",
                "message": "train record stored",
                "data": {
                    "recordKeys": list((records[-1] or {}).keys()),
                    "recordsCount": len(records),
                },
                "timestamp": int(time.time() * 1000),
                "sessionId": "debug-session",
                "runId": "pre-fix",
                "hypothesisId": "C",
            }) + "\n")
    except Exception:
        pass
    # endregion
    _save_training(records)
    return jsonify({"count": len(records)})


@app.route("/api/train/count")
def train_count():
    records = _load_training()
    return jsonify({"count": len(records)})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
