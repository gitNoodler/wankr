class PromptComposer:
    def format_messages(self, user_input, weights, anchors, training_mode):
        return {
            "user_input": user_input,
            "weights": weights,
            "anchors": anchors,
            "training_mode": training_mode,
        }


prompt = PromptComposer()
