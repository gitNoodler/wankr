from types import SimpleNamespace


class MockGrokLLM:
    def __init__(self, temperature: float = 0.9):
        self.temperature = temperature

    def invoke(self, msg):
        if isinstance(msg, dict):
            user_input = str(msg.get("user_input", "")).strip()
            anchors = str(msg.get("anchors", "")).strip()
            training_mode = bool(msg.get("training_mode"))
        else:
            user_input = str(msg).strip()
            anchors = ""
            training_mode = False

        mode_label = "TRAINING MODE" if training_mode else "WANKR MODE"
        prefix = "Okay." if training_mode else "Listen."
        extra = ""
        if anchors:
            first = anchors.splitlines()[0].strip()
            if first:
                extra = f" (anchor: {first[:60]})"
        content = f"{prefix} {mode_label}: {user_input}{extra}"
        return SimpleNamespace(content=content)


def grok_llm(temperature: float = 0.9):
    return MockGrokLLM(temperature=temperature)
