import styles from "../styles/Home.module.css";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useAccount, useConnect, useDisconnect, useNetwork } from "wagmi";
import { ethers } from "ethers";

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletBalance, setWalletBalance] = useState("0");
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { chain } = useNetwork();

  useEffect(() => {
    if (!isConnected) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [isConnected]);

  // 获取钱包余额
  useEffect(() => {
    async function getWalletBalance() {
      if (window.ethereum && address) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const balance = await provider.getBalance(address);
          const balanceInEth = ethers.utils.formatEther(balance);
          setWalletBalance(parseFloat(balanceInEth).toFixed(4));
        } catch (error) {
          console.error("Error fetching wallet balance:", error);
          setWalletBalance("0");
        }
      }
    }

    if (isConnected && address) {
      getWalletBalance();
    }
  }, [isConnected, address]);

  // 格式化地址显示
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 获取网络名称
  const getNetworkName = () => {
    if (!chain) return "Unknown";
    return chain.name || `Chain ID: ${chain.id}`;
  };

  // 检查是否为正确的网络（Sepolia测试网）
  const isCorrectNetwork = () => {
    return chain && chain.id === 11155111; // Sepolia Chain ID
  };

  return (
    <section className={styles.header}>
      <section className={styles.header_logoSection}>
        <Image src="/image.png" width={50} height={50} alt="Hades" />
        <h1 className={styles.title}> Hades Staking</h1>
      </section>

      <section className={styles.header_info}>
        {isConnected ? (
          <>
            <div className={styles.walletInfo}>
              <div className={styles.networkInfo}>
                <span className={styles.networkLabel}>Network:</span>
                <span className={`${styles.networkValue} ${!isCorrectNetwork() ? styles.wrongNetwork : ''}`}>
                  {getNetworkName()}
                  {!isCorrectNetwork() && <span className={styles.warningIcon}>⚠️</span>}
                </span>
              </div>
              <div className={styles.accountInfo}>
                <span className={styles.accountLabel}>Account:</span>
                <span className={styles.accountValue}>{formatAddress(address)}</span>
              </div>
              <div className={styles.balanceInfo}>
                <span className={styles.balanceLabel}>Balance:</span>
                <span className={styles.balanceValue}>{walletBalance} ETH</span>
              </div>
            </div>
            {!isCorrectNetwork() && (
              <div className={styles.networkWarning}>
                <span>⚠️ Please switch to Sepolia Testnet</span>
              </div>
            )}
          </>
        ) : null}
        
        <section className={styles.header_btn}>
          {!isLoggedIn ? (
            <button className={styles.connect_btn} onClick={disconnect}>
              DISCONNECT WALLET
            </button>
          ) : (
            <>
              {connectors.map((connector) => (
                <button
                  disable={!connector.ready}
                  key={connector.id}
                  onClick={() => connect({ connector })}
                  className={styles.connectBtn}
                >
                  CONNECT WALLET
                </button>
              ))}
            </>
          )}
        </section>
      </section>
    </section>
  );
}
