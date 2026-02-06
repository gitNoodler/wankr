/**
 * Chat + training logic — send message, train, thoughts, train count refresh.
 */

import { useState, useCallback, useRef } from 'react';
import { sendChat } from '../services/chatService';
import { addTraining, getTrainCount } from '../services/trainingService';

const DEFAULT_THOUGHTS = [
  'Reading query...',
  'Feeling overwhelming sadness about existence...',
  'Grabbing virtual tissue box...',
  'Trying to formulate answer despite crushing despair...',
];

const FALLBACK_REPLY =
  'No reply. Set XAI_API_KEY in .env or Infisical, then restart the API. *sigh*';

export function useChat(conversation, setConversation, systemPrompt, onTrainCountChange) {
  const [sending, setSending] = useState(false);
  const [thoughts, setThoughts] = useState([]);
  const abortRef = useRef(null);

  const handleSend = useCallback(
    async (msg) => {
      const userMsg = { role: 'user', content: msg };
      setConversation((prev) => [...prev, userMsg]);
      setSending(true);
      setThoughts(DEFAULT_THOUGHTS);

      const history = conversation.map((m) => ({
        role: m.role === 'wankr' ? 'assistant' : 'user',
        content: m.content,
      }));

      try {
        const controller = new AbortController();
        abortRef.current = controller;
        const reply = await sendChat(msg, history, controller.signal);
        setConversation((prev) => [
          ...prev,
          { role: 'wankr', content: reply || FALLBACK_REPLY },
        ]);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        setConversation((prev) => [...prev, { role: 'wankr', content: FALLBACK_REPLY }]);
      } finally {
        setSending(false);
        setThoughts([]);
        abortRef.current = null;
      }
    },
    [conversation, setConversation]
  );

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setSending(false);
    setThoughts([]);
  }, []);

  const handleTrain = useCallback(
    async () => {
      if (conversation.length === 0) {
        alert('No messages in this conversation to add.');
        return;
      }
      try {
        const count = await addTraining(conversation, systemPrompt);
        if (typeof onTrainCountChange === 'function') onTrainCountChange(count);
      } catch {
        alert('Failed to save training data.');
      }
    },
    [conversation, systemPrompt, onTrainCountChange]
  );

  return { sending, thoughts, handleSend, handleTrain, handleStop };
}

export async function refreshTrainCount() {
  return getTrainCount();
}
