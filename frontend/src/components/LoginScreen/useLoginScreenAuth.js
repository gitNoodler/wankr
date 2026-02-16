import { useState, useCallback, useRef, useEffect } from 'react';
import { login as authLogin, register as authRegister, checkUsername } from '../../services/authService';

/** Auth and username state for the login screen. */
export function useLoginScreenAuth({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, error: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const usernameCheckTimeout = useRef(null);

  const handleUsernameChange = useCallback((value) => {
    const secret = 'wankr in da clankr';
    if (typeof value === 'string' && value.toLowerCase().trim() === secret) {
      setUsername('');
      return true; // Signal to open dev panel
    }
    setUsername(value);
    return false;
  }, []);

  const checkUsernameAvailability = useCallback((name) => {
    if (usernameCheckTimeout.current) clearTimeout(usernameCheckTimeout.current);
    const trimmed = (name || '').trim();
    if (trimmed.length < 2) {
      setUsernameStatus({ checking: false, available: null, error: trimmed.length > 0 ? 'Min 2 characters' : null });
      return;
    }
    setUsernameStatus({ checking: true, available: null, error: null });
    usernameCheckTimeout.current = setTimeout(async () => {
      try {
        const result = await checkUsername(trimmed);
        setUsernameStatus({
          checking: false,
          available: result.available,
          error: result.error || (result.available ? null : 'Username taken'),
        });
      } catch {
        setUsernameStatus({ checking: false, available: null, error: 'Check failed' });
      }
    }, 400);
  }, []);

  useEffect(() => {
    if (isRegistering) {
      checkUsernameAvailability(username);
    } else {
      setUsernameStatus({ checking: false, available: null, error: null });
    }
  }, [username, isRegistering, checkUsernameAvailability]);

  const doAuth = useCallback(async (isRegister) => {
    const u = (username || '').trim();
    const p = (password || '').trim();
    if (!u) { setError('Username required'); return; }
    if (!p) { setError('Password required'); return; }
    if (isRegister) {
      if (p.length < 6) { setError('Password must be at least 6 characters'); return; }
      if (p !== confirmPassword) { setError('Passwords do not match'); return; }
      if (!usernameStatus.available) { setError('Please choose an available username'); return; }
    }
    setError('');
    setLoading(true);
    try {
      const data = isRegister ? await authRegister(u, p) : await authLogin(u, p);
      setLoading(false);
      onLogin?.({ username: data?.username ?? u, token: data?.token });
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Authentication failed');
    }
  }, [username, password, confirmPassword, usernameStatus.available, onLogin]);

  const handleNewUser = useCallback((e) => {
    e?.preventDefault();
    setError('');
    setPassword('');
    setConfirmPassword('');
    setIsRegistering(true);
  }, []);

  const handleBackToLogin = useCallback((e) => {
    e?.preventDefault();
    setError('');
    setPassword('');
    setConfirmPassword('');
    setUsernameStatus({ checking: false, available: null, error: null });
    setIsRegistering(false);
  }, []);

  return {
    username, setUsername,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    isRegistering, setIsRegistering,
    usernameStatus, setUsernameStatus,
    error, setError,
    loading,
    handleUsernameChange,
    checkUsernameAvailability,
    doAuth,
    handleNewUser,
    handleBackToLogin,
  };
}
