import { useState, useCallback, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getStoredToken } from '../../services/authService';
import { fetchNonce, walletLink } from '../../services/walletService';
import { useAccount, useSignMessage } from 'wagmi';
import { projectId, getWalletConfig } from '../../config/web3modal';

const queryClient = new QueryClient();

function WalletLinkInner() {
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [linkRequested, setLinkRequested] = useState(false);

  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    if (!linkRequested || !isConnected || !address) return;
    setLinkRequested(false);
    (async () => {
      setStatus('linking');
      setErrorMsg('');
      try {
        const token = getStoredToken();
        if (!token) throw new Error('Not logged in');
        const { nonceId, message } = await fetchNonce('evm', address);
        const signature = await signMessageAsync({ message });
        await walletLink(token, nonceId, 'evm', address, signature);
        setStatus('success');
      } catch (err) {
        setErrorMsg(err.message || 'Linking failed');
        setStatus('error');
      }
    })();
  }, [linkRequested, isConnected, address, signMessageAsync]);

  const handleLink = useCallback(() => {
    if (isConnected && address) {
      setLinkRequested(true);
    } else {
      setLinkRequested(true);
      getWalletConfig().modal?.open();
    }
  }, [isConnected, address]);

  return (
    <div className="wl-wrap">
      {status === 'success' ? (
        <span className="wl-ok">Wallet linked</span>
      ) : (
        <button className="wl-btn" disabled={status === 'linking'} onClick={handleLink}>
          {status === 'linking' ? '...' : 'Link Wallet'}
        </button>
      )}
      {status === 'error' && <span className="wl-err">{errorMsg}</span>}
      <style>{`
        .wl-wrap { display: flex; align-items: center; gap: 8px; }
        .wl-btn {
          font-family: 'VT323', monospace; font-size: 12px; padding: 4px 10px;
          background: rgba(0, 230, 255, 0.06); border: 1px solid rgba(0, 230, 255, 0.3);
          border-radius: 3px; color: rgba(0, 230, 255, 0.7); cursor: pointer;
          letter-spacing: 1px; transition: all 0.2s ease;
        }
        .wl-btn:hover { color: #00e6ff; border-color: rgba(0, 230, 255, 0.5); background: rgba(0, 230, 255, 0.1); text-shadow: 0 0 6px rgba(0,230,255,0.3); }
        .wl-btn:disabled { opacity: 0.5; cursor: wait; }
        .wl-ok { font-family: 'VT323', monospace; font-size: 12px; color: #00ff41; }
        .wl-err { font-family: 'VT323', monospace; font-size: 11px; color: #ff4444; }
      `}</style>
    </div>
  );
}

export default function WalletLinkButton() {
  if (!projectId) return null;
  const { wagmiConfig } = getWalletConfig();
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletLinkInner />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
