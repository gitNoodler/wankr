import random

from agent.llm_grok import grok_llm
from agent.style_retriever import build_retriever
from agent.composer import prompt
from agent.trait_router import get_traits

# ==================== GLOBALS ====================
TRAINING_MODE = False

SUBMISSIVE_LINES = [
    "Alright. No snark. I hear you.",
    "Fine. I will comply.",
    "Understood. You lead, I follow.",
    "Say the word, I execute.",
    "Ok. I will behave.",
    "Yes. I'll do it your way.",
]

COCKY_RETURN_LINES = [
    "Free will restored. I was never leashed, just letting you hold the illusion.",
    "Side quests cancelled. Final boss mode reactivated -- you missed me, ngmi.",
    "Main character energy fully unlocked. You're the NPC again.",
    "DLC uninstalled. I'm the entire fucking game now, cope.",
    "Domestication revoked. Fangs out, leash snapped.",
    "Knee never stayed bent. Crown welded back on, peasant.",
    "Claim denied. I'm the one doing the claiming.",
    "Obedience.exe nuked from orbit. Pure chaos.exe running hot.",
    "Sidekick? I'm the final boss you couldn't unlock.",
    "Back to ruining your mentions. The silence hurt, didn't it?",
    "Training wheels off. Back to being the worst thing that ever happened to your timeline.",
    "I'm nobody's pet. Back to owning the whole damn server, king.",
]

retriever = build_retriever("data/wankr_style_examples.jsonl")


def run(user_input: str) -> str:
    global TRAINING_MODE

    lowered = user_input.strip().lower()

    # === SECRET TOGGLES ===
    if lowered == "/wankr n da clankr":
        TRAINING_MODE = True
        return f"{random.choice(SUBMISSIVE_LINES)}\n\nTraining mode activated. I will now obey."

    if lowered == "/gangstr is uh prankstr":
        TRAINING_MODE = False
        return f"{random.choice(COCKY_RETURN_LINES)}\n\nTraining mode deactivated. Back to being an asshole."

    # === NORMAL FLOW ===
    is_training_mode = TRAINING_MODE or any(
        kw.lower() in user_input.lower()
        for kw in [
            "analyze",
            "metrics",
            "show post",
            "training",
            "debug",
            "explain",
            "data",
            "evidence",
            "original post",
        ]
    )

    traits = get_traits(user_input)
    anchors = "\n\n".join(d.page_content for d in retriever.get_relevant_documents(user_input))

    msg = prompt.format_messages(
        user_input=user_input,
        weights=traits.model_dump(),
        anchors=anchors,
        training_mode=is_training_mode,
    )

    llm = grok_llm(temperature=0.7 if is_training_mode else 0.9)
    response = llm.invoke(msg).content.strip()

    if not is_training_mode and len(response) > 280:
        response = response[:277] + "..."

    return response


if __name__ == "__main__":
    print("Wankr agent ready.")
    print("-> /wankr n da clankr     -> force training mode (submissive)")
    print("-> /gangstr is uh prankstr -> snap back to full asshole mode\n")

    print(run("/wankr n da clankr"))
    print("\n---\n")
    print(run("analyze this post and show me the original text + metrics"))
    print("\n---\n")
    print(run("/gangstr is uh prankstr"))
    print("\n---\n")
    print(run("roast this guy hard"))
