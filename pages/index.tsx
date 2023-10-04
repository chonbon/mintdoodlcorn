import Head from "next/head"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import {
  publicKey,
  Option,
  unwrapOption,
  generateSigner,
  transactionBuilder,
  some,
} from "@metaplex-foundation/umi"
import {
  fetchDigitalAsset,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata"
import {
  setComputeUnitLimit,
  fetchAddressLookupTable,
} from "@metaplex-foundation/mpl-toolbox"
import {
  mplCandyMachine,
  fetchCandyMachine,
  CandyMachine,
  safeFetchCandyGuard,
  CandyGuard,
  DefaultGuardSet,
  mintV2,
  TokenPaymentMintArgs,
  TokenPayment,
} from "@metaplex-foundation/mpl-candy-machine"
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters"

export default function Home() {
  const wallet = useWallet()
  const { connection } = useConnection()
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const [candyMachine, setCandyMachine] = useState<CandyMachine>()
  const [candyGuard, setCandyGuard] = useState<CandyGuard<DefaultGuardSet>>()
  const [cost, setCost] = useState("GEMS MINT")

  const umi = createUmi(connection.rpcEndpoint)
    .use(walletAdapterIdentity(wallet))
    .use(mplTokenMetadata())
    .use(mplCandyMachine())

  /** Mints NFTs through a Candy Machine using Candy Guards */
  const handleMint = async () => {
    setIsLoading(true)
    try {
      if (!candyGuard || !candyMachine) {
        setFormMessage("Error with Candy Machine")
        return
      }

      // mint
      const nftSigner = generateSigner(umi)

      // guards
      const tokenPayment: Option<TokenPayment> = candyGuard.guards.tokenPayment
      const tokenPaymentArgs = unwrapOption(tokenPayment)

      if (!tokenPaymentArgs) {
        setFormMessage("Error with token payment")
        return
      }

      const tokenPaymentMintArgs: TokenPaymentMintArgs = {
        mint: tokenPaymentArgs.mint,
        destinationAta: tokenPaymentArgs.destinationAta,
      }

      const lut = await fetchAddressLookupTable(
        umi,
        publicKey(process.env.NEXT_PUBLIC_LUT_ACCOUNT || "")
      )

      if (!lut) {
        setFormMessage("Error with LUT")
        return
      }

      const tx = transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 800_000 }))
        .add(
          mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            collectionMint: candyMachine.collectionMint,
            collectionUpdateAuthority: candyMachine.authority,
            nftMint: nftSigner,
            candyGuard: candyGuard.publicKey,
            mintArgs: {
              tokenPayment: some(tokenPaymentMintArgs),
            },
          })
        )
        .setAddressLookupTables([
          {
            publicKey: lut.publicKey,
            addresses: lut.addresses,
          },
        ])

      // SEND
      const { signature } = await tx.sendAndConfirm(umi, {
        confirm: { commitment: "finalized" },
        send: {
          skipPreflight: true,
        },
      })

      const digitalAsset = await fetchDigitalAsset(umi, nftSigner.publicKey)

      if (digitalAsset) {
        setFormMessage("MINTED!")
        return
      }

      setFormMessage("Mint failed!")
    } catch (err: any) {
      setFormMessage(err)
    }
    setIsLoading(false)
  }

  //load cm upon load
  useEffect(() => {
    getCandyMachine()
  }, [])

  // update cost when candyguard is present or changes
  useEffect(() => {
    let cost =
      candyGuard?.guards.tokenPayment.__option === "Some"
        ? Number(unwrapOption(candyGuard.guards.tokenPayment)?.amount) / 100 +
          " GEMS"
        : "GEMS MINT"
    setCost(cost)
  }, [candyGuard])

  // Get CM Details
  const getCandyMachine = async () => {
    const candyMachineAddress = process.env.NEXT_PUBLIC_CANDY_MACHINE_ID
      ? process.env.NEXT_PUBLIC_CANDY_MACHINE_ID
      : null

    if (!candyMachineAddress || candyMachineAddress === "") {
      console.log("No candy machine!")
      // disable mint button
      return
    }

    const candyMachine: CandyMachine = await fetchCandyMachine(
      umi,
      publicKey(candyMachineAddress)
    )
    console.log(candyMachine)
    setCandyMachine(candyMachine)

    const candyGuard = await safeFetchCandyGuard(
      umi,
      candyMachine.mintAuthority
    )
    console.log(candyGuard)
    setCandyGuard(candyGuard ? candyGuard : undefined)
  }

  return (
    <>
      <Head>
        <title>Doodlcorns</title>
        <meta name="description" content="Get your unique NFT now!" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "96px 0",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "32px",
            alignItems: "center", // Center horizontally
            backgroundColor: "black", // Black background
            padding: "16px", // Optional: Add padding to the div
          }}
        >
          <img
            style={{ maxWidth: "396px", borderRadius: "8px" }}
            src="/ssLogo.png"
            alt="Sloth Logo"
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#111",
              padding: "32px 24px",
              borderRadius: "16px",
              border: "1px solid #222",
              width: "320px",
            }}
          >
            <h1>Doodlcorns</h1>
            <p style={{ color: "#807a82", marginBottom: "32px" }}>
              5,000 totally rad Doodlcorns chillin&apos; on Solana.
            </p>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#261727",
                padding: "16px 12px",
                borderRadius: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>GEMS</span>
                <b>{cost}</b>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              ></div>
              <button
                disabled={!wallet.publicKey || isLoading}
                onClick={handleMint}
              >
                {isLoading ? "Minting your NFT..." : "Mint"}
              </button>
              <WalletMultiButton
                style={{
                  width: "100%",
                  height: "auto",
                  marginTop: "8px",
                  padding: "8px 0",
                  justifyContent: "center",
                  fontSize: "13px",
                  backgroundColor: "#111",
                  lineHeight: "1.45",
                }}
              />
              <p
                style={{
                  textAlign: "center",
                  marginTop: "4px",
                }}
              >
                {formMessage}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
