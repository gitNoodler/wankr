/**
 * WalletLoginSection — fully self-contained wallet auth with its own providers.
 * wagmi/AppKit never touches the parent component tree, preventing re-renders.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { checkUsername } from '../../services/authService';
import { fetchNonce, walletLogin, walletRegister } from '../../services/walletService';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { projectId, getWalletConfig } from '../../config/web3modal';

// Stable query client — created once at module level
const queryClient = new QueryClient();


/** Inner component that uses wagmi hooks (must be inside WagmiProvider) */
function WalletInner({ parentMode, onLogin, onSpectate, inline, onUsernameMode, takeover }) {
  const [mode, setMode] = useState('idle'); // 'idle' | 'pending' | 'username'
  const [error, setError] = useState('');
  const [walletAddress, setWalletAddress] = useState(null);
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [authRequested, setAuthRequested] = useState(false);
  const checkTimer = useRef(null);

  const { address: connectedAddress, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  // When wallet connects after user clicked CONNECT WALLET, trigger auth flow
  useEffect(() => {
    if (!authRequested || !isConnected || !connectedAddress) return;
    setAuthRequested(false);
    (async () => {
      setMode('pending');
      setError('');
      try {
        const addr = connectedAddress;
        console.log('[WalletAuth] fetching nonce for', addr);
        const { nonceId, message } = await fetchNonce('evm', addr);
        console.log('[WalletAuth] got nonce, requesting signature...');
        const signature = await signMessageAsync({ message });
        console.log('[WalletAuth] signed, calling walletLogin...');
        const result = await walletLogin(nonceId, 'evm', addr, signature);
        console.log('[WalletAuth] login result:', result);
        if (result.isNewWallet) {
          setWalletAddress(addr);
          setMode('username');
          onUsernameMode?.(true);
        } else {
          onLogin();
        }
      } catch (err) {
        console.error('[WalletAuth] error:', err);
        setError(err.message || 'Wallet connection failed');
        setMode('idle');
        disconnect();
      }
    })();
  }, [authRequested, isConnected, connectedAddress, signMessageAsync, onLogin, disconnect]);

  // Username availability check
  useEffect(() => {
    if (mode !== 'username') return;
    clearTimeout(checkTimer.current);
    const name = username.trim();
    if (!name || name.length < 5) { setUsernameStatus(null); return; }
    setUsernameStatus('checking');
    checkTimer.current = setTimeout(async () => {
      try {
        const result = await checkUsername(name);
        setUsernameStatus(result.available ? 'available' : 'taken');
      } catch { setUsernameStatus(null); }
    }, 400);
    return () => clearTimeout(checkTimer.current);
  }, [username, mode]);

  const handleConnect = useCallback(() => {
    if (mode === 'pending') return;
    const { modal: m } = getWalletConfig();
    if (!m) { setError('Wallet provider not configured'); return; }
    setError('');
    if (isConnected && connectedAddress) {
      setAuthRequested(true);
    } else {
      setAuthRequested(true);
      m.open();
    }
  }, [mode, isConnected, connectedAddress]);

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    if (registering || !walletAddress) return;
    const name = username.trim();
    if (!name || name.length < 5) { setError('Username must be at least 5 characters'); return; }
    setError('');
    setRegistering(true);
    try {
      const { nonceId, message } = await fetchNonce('evm', walletAddress);
      const signature = await signMessageAsync({ message });
      await walletRegister(nonceId, 'evm', walletAddress, signature, name);
      onLogin();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  }, [registering, username, walletAddress, signMessageAsync, onLogin]);

  const handleBack = useCallback(() => {
    setMode('idle');
    setWalletAddress(null);
    setUsername('');
    setUsernameStatus(null);
    onUsernameMode?.(false);
    setError('');
    disconnect();
  }, [disconnect]);

  // Hide when parent isn't in login mode (unless we're in username picker or takeover)
  if (!takeover && parentMode !== 'login' && mode !== 'username') return null;

  const statusLabel =
    usernameStatus === 'checking' ? { color: '#888', text: '...' }
    : usernameStatus === 'available' ? { color: '#00ff41', text: '\u2713' }
    : usernameStatus === 'taken' ? { color: '#ff4444', text: '\u2717' }
    : null;

  // Username picker mode
  if (mode === 'username') {
    return (
      <div className="wls-username-picker">
        <div className="lp-subtitle font-wankr" style={{ textAlign: 'center', marginBottom: 4 }}>Pick Username</div>
        <div className="lp-field-wrap">
          <input
            className="lp-input"
            type="text"
            placeholder="username"
            autoComplete="username"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRegister(e); } }}
          />
          {statusLabel && (
            <span className="lp-status" style={{ color: statusLabel.color }}>
              {statusLabel.text}
            </span>
          )}
        </div>
        {error && <div className="lp-error">{error}</div>}
        <button type="button" className="lp-btn lp-btn-submit lp-btn-wallet" disabled={registering} onClick={handleRegister}>
          {registering ? '...' : 'CONFIRM'}
        </button>
        <div className="lp-bottom-row">
          <button type="button" className="lp-btn lp-btn-secondary" onClick={handleBack}>BACK</button>
          <button type="button" className="lp-btn lp-btn-secondary" onClick={onSpectate}>SPECTATE</button>
        </div>
      </div>
    );
  }

  // Connect button
  if (inline) {
    return (
      <button type="button" className="lp-btn lp-btn-secondary lp-btn-wallet-alt" disabled={mode === 'pending'} onClick={handleConnect}>
        {mode === 'pending' ? '...' : 'WALLET'}
      </button>
    );
  }

  return (
    <div className="lp-wallet-row">
      <button type="button" className="lp-btn lp-btn-wallet" disabled={mode === 'pending'} onClick={handleConnect}>
        {mode === 'pending' ? '...' : 'CONNECT WALLET'}
      </button>
      {error && <div className="lp-error" style={{ marginTop: 2 }}>{error}</div>}
    </div>
  );
}

/** Outer wrapper — provides wagmi context */
export default function WalletLoginSection(props) {
  const { wagmiConfig } = getWalletConfig();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletInner {...props} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
