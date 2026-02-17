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
const TRAINING_REQUIRED_REPLY = 'Training key required. Ask Payton for the key.';
const TRAINING_UNAUTHORIZED_REPLY = 'Nope. Training mode is locked.';
const TRAINING_KEY_STORAGE = 'wankr_training_key';
const TRAINING_ENABLE_CMD = '/wankr n da clankr';
const TRAINING_DISABLE_CMD = '/gangstr is uh prankstr';

export function useChat(conversation, setConversation, systemPrompt, onTrainCountChange, clientId, onTrainingModeChange) {
  const [sending, setSending] = useState(false);
  const [thoughts, setThoughts] = useState([]);
  const abortRef = useRef(null);

  const getStoredTrainingKey = () => {
    try {
      const existing = sessionStorage.getItem(TRAINING_KEY_STORAGE);
      if (existing && existing.trim()) return existing.trim();
    } catch {
      // ignore
    }
    return null;
  };

  const GET_TRAINING_KEY = () => {
    const existing = getStoredTrainingKey();
    if (existing) return existing;
    const key = window.prompt('Enter training key:');
    if (key && key.trim()) {
      try {
        sessionStorage.setItem(TRAINING_KEY_STORAGE, key.trim());
      } catch {
        // ignore
      }
      return key.trim();
    }
    return null;
  };

  const handleSend = useCallback(
    async (msg) => {
      const normalizeCommand = (value) =>
        String(value || '')
          .toLowerCase()
          .replace(/[^\w\s/]+/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      const detectTrainingCommand = (value) => {
        const normalized = normalizeCommand(value);
        if (/^\/?wankr\s+n\s+da\s+clankr$/.test(normalized)) return 'enable';
        if (/^\/?gangstr\s+is\s+uh\s+prankstr$/.test(normalized)) return 'disable';
        return null;
      };
      const trimmed = msg.trim();
      const commandType = detectTrainingCommand(trimmed);
      const isTrainingEnable = commandType === 'enable';
      const isTrainingDisable = commandType === 'disable';

      if (!isTrainingEnable && !isTrainingDisable) {
        const userMsg = { role: 'user', content: msg };
        setConversation((prev) => [...prev, userMsg]);
      }
      setSending(true);
      setThoughts(DEFAULT_THOUGHTS);

      const history = conversation.map((m) => ({
        role: m.role === 'wankr' ? 'assistant' : 'user',
        content: m.content,
      }));

      try {
        const controller = new AbortController();
        abortRef.current = controller;
        
        // Training commands are sent as regular messages - backend handles them via Infisical key
        const reply = await sendChat(msg, history, controller.signal, { clientId });
        
        // Detect training mode changes from response
        if (reply && typeof onTrainingModeChange === 'function') {
          if (reply.includes('Training mode activated')) {
            onTrainingModeChange(true);
          } else if (reply.includes('Training mode deactivated')) {
            onTrainingModeChange(false);
          }
        }
        
        setConversation((prev) => [
          ...prev,
          { role: 'wankr', content: reply || FALLBACK_REPLY },
        ]);
      } catch (error) {
        if (error?.name === 'AbortError') return;
        if (isTrainingEnable || isTrainingDisable) {
          const unauthorized = error?.message === 'Unauthorized';
          setConversation((prev) => [
            ...prev,
            { role: 'wankr', content: unauthorized ? TRAINING_UNAUTHORIZED_REPLY : FALLBACK_REPLY },
          ]);
          return;
        }
        const msg = error?.message && error.message !== 'Chat request failed'
          ? `${error.message} *sigh*`
          : FALLBACK_REPLY;
        setConversation((prev) => [...prev, { role: 'wankr', content: msg }]);
      } finally {
        setSending(false);
        setThoughts([]);
        abortRef.current = null;
      }
    },
    [conversation, setConversation, clientId, onTrainingModeChange]
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
