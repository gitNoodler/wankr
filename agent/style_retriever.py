import json
from pathlib import Path


class Document:
    def __init__(self, page_content: str):
        self.page_content = page_content


class SimpleRetriever:
    def __init__(self, examples: list[str]):
        self.examples = examples

    def get_relevant_documents(self, query: str):
        if not self.examples:
            return []
        words = [w for w in query.lower().split() if w]
        hits = []
        if words:
            for ex in self.examples:
                if any(w in ex.lower() for w in words):
                    hits.append(ex)
        if not hits:
            hits = self.examples[:2]
        return [Document(page_content=ex) for ex in hits[:3]]


def build_retriever(path: str):
    examples = []
    p = Path(path)
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            raw = line.strip()
            if not raw:
                continue
            try:
                data = json.loads(raw)
                text = data.get("text") or data.get("content") or data.get("example")
                if not text:
                    text = json.dumps(data)
            except json.JSONDecodeError:
                text = raw
            examples.append(text)
    return SimpleRetriever(examples)
