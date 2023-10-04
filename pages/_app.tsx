import "@/styles/globals.css"
import type { AppProps } from "next/app"
import dynamic from "next/dynamic"
import { useMemo } from "react"
// SOLANA WEB3 STUFF
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react"
//import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
//import { clusterApiUrl } from '@solana/web3.js';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from "@solana/wallet-adapter-wallets"

export default function App({ Component, pageProps }: AppProps) {
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={process.env.NEXT_PUBLIC_RPC_ENDPOINT || ""}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
