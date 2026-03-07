/**
 * Web3Modal (Reown AppKit) configuration
 * Get a free project ID at https://cloud.walletconnect.com
 *
 * Lazy-initialized: nothing runs until getWalletConfig() is first called,
 * so the login panel renders without any wagmi/AppKit overhead.
 */
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, arbitrum, base, polygon, optimism } from '@reown/appkit/networks';
import { createConfig, http } from 'wagmi';
import { mainnet as wagmiMainnet } from 'wagmi/chains';

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

let _wagmiConfig = null;
let _modal = null;
let _initialized = false;

function init() {
  if (_initialized) return;
  _initialized = true;

  if (!projectId) {
    _wagmiConfig = createConfig({
      chains: [wagmiMainnet],
      transports: { [wagmiMainnet.id]: http() },
    });
    return;
  }

  const networks = [mainnet, arbitrum, base, polygon, optimism];
  const wagmiAdapter = new WagmiAdapter({ networks, projectId });

  _modal = createAppKit({
    adapters: [wagmiAdapter],
    networks,
    projectId,
    metadata: {
      name: 'Wankr',
      description: 'Basement vigilante keeping influencer scum honest',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://wankr.app',
      icons: ['/wankr-icon.png'],
    },
    themeMode: 'dark',
    features: { analytics: false, email: false, socials: false },
    enableWalletGuide: false,
  });

  _wagmiConfig = wagmiAdapter.wagmiConfig;
}

/** Call once before using wagmiConfig or modal */
export function getWalletConfig() {
  init();
  return { wagmiConfig: _wagmiConfig, modal: _modal };
}
