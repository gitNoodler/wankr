from dataclasses import dataclass, asdict


@dataclass
class Traits:
    aggression: float = 0.8
    sarcasm: float = 0.7
    analysis: float = 0.2
    precision: float = 0.3

    def model_dump(self):
        return asdict(self)


def get_traits(user_input: str) -> Traits:
    text = user_input.lower()
    if any(k in text for k in ["analyze", "metrics", "debug", "evidence", "original"]):
        return Traits(aggression=0.4, sarcasm=0.3, analysis=0.9, precision=0.9)
    if any(k in text for k in ["please", "sorry", "help"]):
        return Traits(aggression=0.5, sarcasm=0.4, analysis=0.5, precision=0.5)
    return Traits()
