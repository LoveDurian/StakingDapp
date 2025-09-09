import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";
import { useAccount, useContract, useProvider, useSigner } from "wagmi";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, ABI } from "../contracts/index.js";

export default function AdminPanel() {
  const { isConnected, address } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner();
  const [contractInfo, setContractInfo] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const contract = useContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    signerOrProvider: signer || provider,
  });

  // 获取合约信息
  const getContractInfo = async () => {
    try {
      const info = await contract.getContractInfo();
      setContractInfo({
        owner: info.contractOwner,
        totalPositions: info.totalPositions.toString(),
        balance: ethers.utils.formatEther(info.contractBalance),
        lockPeriods: info.availableLockPeriods.map(p => p.toString())
      });
    } catch (error) {
      console.error("获取合约信息失败:", error);
    }
  };

  // 紧急提现所有资金
  const emergencyWithdrawAll = async () => {
    if (!contractInfo || !address || !contractInfo.owner || 
        address.toLowerCase() !== contractInfo.owner.toLowerCase()) {
      alert("只有合约管理员可以执行此操作");
      return;
    }

    if (!confirm("确定要提取合约中的所有资金吗？此操作不可逆！")) {
      return;
    }

    setIsLoading(true);
    try {
      const tx = await contract.emergencyWithdraw();
      await tx.wait();
      alert("紧急提现成功！");
      getContractInfo(); // 刷新合约信息
    } catch (error) {
      console.error("紧急提现失败:", error);
      alert("紧急提现失败: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 紧急提现指定金额
  const emergencyWithdrawAmount = async () => {
    if (!contractInfo || !address || !contractInfo.owner || 
        address.toLowerCase() !== contractInfo.owner.toLowerCase()) {
      alert("只有合约管理员可以执行此操作");
      return;
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert("请输入有效的提现金额");
      return;
    }

    if (parseFloat(withdrawAmount) > parseFloat(contractInfo.balance)) {
      alert("提现金额不能超过合约余额");
      return;
    }

    if (!confirm(`确定要提取 ${withdrawAmount} ETH 吗？此操作不可逆！`)) {
      return;
    }

    setIsLoading(true);
    try {
      const weiAmount = ethers.utils.parseEther(withdrawAmount);
      const tx = await contract.emergencyWithdrawAmount(weiAmount);
      await tx.wait();
      alert("紧急提现成功！");
      setWithdrawAmount("");
      getContractInfo(); // 刷新合约信息
    } catch (error) {
      console.error("紧急提现失败:", error);
      alert("紧急提现失败: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && isConnected && contract) {
      getContractInfo();
    }
  }, [isMounted, isConnected, contract]);

  // 检查是否为管理员
  const isAdmin = contractInfo && address && contractInfo.owner && 
    address.toLowerCase() === contractInfo.owner.toLowerCase();
  
  // 调试信息
  console.log('管理员检查调试信息:', {
    address,
    contractInfo,
    owner: contractInfo?.owner,
    isAdmin,
    addressLower: address?.toLowerCase(),
    ownerLower: contractInfo?.owner?.toLowerCase()
  });

  if (!isMounted) {
    return (
      <div className={styles.adminPanel}>
        <h2>管理员面板</h2>
        <p>加载中...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={styles.adminPanel}>
        <h2>管理员面板</h2>
        <p>请先连接钱包</p>
      </div>
    );
  }

  // 移除管理员检查，让所有用户都能看到面板

  return (
    <div className={styles.adminPanel}>
      <h2>🔧 管理员面板</h2>
      
      <div className={styles.adminStatus}>
        <p>当前地址: {address}</p>
        <p>合约管理员: {contractInfo?.owner || "加载中..."}</p>
        <p className={isAdmin ? styles.adminStatusTrue : styles.adminStatusFalse}>
          管理员权限: {isAdmin ? "✅ 是" : "❌ 否"}
        </p>
        {!isAdmin && contractInfo?.owner && (
          <p className={styles.debugInfo}>
            调试: 地址不匹配 - 当前: {address?.toLowerCase()} | 管理员: {contractInfo.owner.toLowerCase()}
          </p>
        )}
        <button 
          onClick={getContractInfo} 
          className={styles.refreshBtn}
          style={{marginTop: '0.5rem', fontSize: '0.8rem', padding: '0.3rem 0.6rem'}}
        >
          🔄 刷新管理员状态
        </button>
      </div>
      
      <div className={styles.contractInfo}>
        <h3>合约信息</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>合约地址:</span>
            <span className={styles.infoValue}>{CONTRACT_ADDRESS}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>管理员地址:</span>
            <span className={styles.infoValue}>{contractInfo?.owner}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>总质押数量:</span>
            <span className={styles.infoValue}>{contractInfo?.totalPositions}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>合约余额:</span>
            <span className={styles.infoValue}>{contractInfo?.balance} ETH</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>可用锁定期:</span>
            <span className={styles.infoValue}>{contractInfo?.lockPeriods.join(", ")} 天</span>
          </div>
        </div>
      </div>

      <div className={styles.emergencyActions}>
        <h3>⚠️ 紧急提现功能</h3>
        <p className={styles.warning}>
          <strong>警告:</strong> 紧急提现功能只能由合约管理员使用。提现后，所有用户的质押资金将被提取，请谨慎使用！
        </p>
        
        <div className={styles.withdrawSection}>
          <h4>提现指定金额</h4>
          <div className={styles.inputGroup}>
            <input
              type="number"
              placeholder="输入提现金额 (ETH)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className={styles.inputField}
              step="0.001"
              min="0"
            />
            <button
              onClick={emergencyWithdrawAmount}
              disabled={isLoading || !withdrawAmount || !isAdmin}
              className={`${styles.withdrawBtn} ${!isAdmin ? styles.disabledBtn : ''}`}
            >
              {isLoading ? "处理中..." : !isAdmin ? "仅限管理员" : "提现指定金额"}
            </button>
          </div>
        </div>

        <div className={styles.withdrawSection}>
          <h4>提现所有资金</h4>
          <button
            onClick={emergencyWithdrawAll}
            disabled={isLoading || !contractInfo?.balance || parseFloat(contractInfo.balance) === 0 || !isAdmin}
            className={`${styles.emergencyBtn} ${!isAdmin ? styles.disabledBtn : ''}`}
          >
            {isLoading ? "处理中..." : !isAdmin ? "仅限管理员" : "紧急提现所有资金"}
          </button>
        </div>

        <button
          onClick={getContractInfo}
          className={styles.refreshBtn}
        >
          🔄 刷新合约信息
        </button>
      </div>
    </div>
  );
}
