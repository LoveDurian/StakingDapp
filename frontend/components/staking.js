import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { useAccount, useContract, useProvider, useSigner } from "wagmi";
import { ethers } from "ethers";

import { CONTRACT_ADDRESS, ABI } from "../contracts/index.js";

export default function Staking() {
  const { isConnected, address } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner();

  const [stakingTab, setStakingTab] = useState(true);
  const [unstakingTab, setUnstakingTab] = useState(false);
  const [unstakeValue, setUnstakeValue] = useState(0);
  const [selectedPositionId, setSelectedPositionId] = useState(null);

  const [assetIds, setAssetIds] = useState([]);
  const [assets, setAssets] = useState([]);
  const [amount, setAmount] = useState(0);

  const toWei = (ether) => ethers.utils.parseEther(ether);
  const toEther = (wei) => {
    if (!wei) return "0";
    // 确保wei是BigNumber或可以转换为BigNumber的值
    const weiValue = ethers.BigNumber.isBigNumber(wei) ? wei : ethers.BigNumber.from(wei);
    return ethers.utils.formatEther(weiValue);
  };

  const contract = useContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    signerOrProvider: signer || provider,
  });

  const switchToUnstake = async () => {
    if (!unstakingTab) {
      setUnstakingTab(true);
      setStakingTab(false);
      try {
        const assetIds = await getAssetIds(address, signer);
        // 确保assetIds是数字数组
        const numericAssetIds = assetIds.map(id => Number(id));
        setAssetIds(numericAssetIds);
        getAssets(numericAssetIds);
      } catch (error) {
        console.error('Error switching to unstake:', error);
        setAssetIds([]);
        setAssets([]);
      }
    }
  };

  const switchToStake = () => {
    if (!stakingTab) {
      setStakingTab(true);
      setUnstakingTab(false);
    }
  };

  const getAssetIds = async (address) => {
    const assetIds = await contract.getPositionIdsForAddress(address);
    return assetIds;
  };

  const calcDaysRemaining = (unlockDate) => {
    const timeNow = Date.now() / 1000;
    const secondsRemaining = unlockDate - timeNow;
    return Math.max(Math.floor(secondsRemaining / 60 / 60 / 24), 0);
  };

  const getAssets = async (ids) => {
    try {
      const queriedAssets = await Promise.all(
        ids.map((id) => contract.getPositionById(id))
      );

      const parsedAssets = queriedAssets.map((asset) => {
        const positionId = Number(asset.positionId);
        const percentInterest = Number(asset.percentInterest) / 100;
        const daysRemaining = calcDaysRemaining(Number(asset.unlockDate));
        const etherInterest = toEther(asset.weiInterest);
        const etherStaked = toEther(asset.weiStaked);
        const open = Boolean(asset.open);

        console.log('Parsed asset:', {
          positionId,
          percentInterest,
          daysRemaining,
          etherInterest,
          etherStaked,
          open
        });

        return {
          positionId,
          percentInterest,
          daysRemaining,
          etherInterest,
          etherStaked,
          open,
        };
      });

      setAssets(parsedAssets);
    } catch (error) {
      console.error('Error getting assets:', error);
      setAssets([]);
    }
  };

  const stakeEther = async (stakingLength, stakeAmount = null) => {
    const amountToUse = stakeAmount !== null ? stakeAmount : amount;
    const wei = toWei(String(amountToUse));
    const data = { value: wei };
    
    console.log('质押参数:', {
      stakingLength,
      stakeAmount: amountToUse,
      wei: wei.toString(),
      data
    });
    
    await contract.stakeEther(stakingLength, data);
  };

  const withdraw = (positionId) => {
    if (!positionId) {
      alert('请选择一个质押头寸');
      return;
    }
    contract.closePosition(positionId);
  };

  // 检查position是否已到期
  const isPositionExpired = (daysRemaining) => {
    return daysRemaining <= 0;
  };

  // 获取可提取的ETH数量（包括利息）
  const getWithdrawableAmount = (asset) => {
    if (!asset) return 0;
    const staked = parseFloat(asset.etherStaked) || 0;
    const interest = parseFloat(asset.etherInterest) || 0;
    return staked + interest;
  };

  const handleLockedStaking = async () => {
    // 获取各个输入框的值
    const input30 = document.getElementById('inputField30');
    const input60 = document.getElementById('inputField60');
    const input90 = document.getElementById('inputField90');
    
    let selectedDays = null;
    let stakeAmount = 0;
    
    // 检查哪个输入框有值
    if (input30.value && parseFloat(input30.value) > 0) {
      selectedDays = 30;
      stakeAmount = parseFloat(input30.value);
    } else if (input60.value && parseFloat(input60.value) > 0) {
      selectedDays = 60;
      stakeAmount = parseFloat(input60.value);
    } else if (input90.value && parseFloat(input90.value) > 0) {
      selectedDays = 90;
      stakeAmount = parseFloat(input90.value);
    }
    
    if (!selectedDays || stakeAmount <= 0) {
      alert('请选择一个锁定期并输入质押金额');
      return;
    }
    
    try {
      // 调用质押函数，直接传递质押金额
      await stakeEther(selectedDays, stakeAmount);
      
      // 清空输入框
      input30.value = '';
      input60.value = '';
      input90.value = '';
      
      alert(`成功质押 ${stakeAmount} ETH，锁定期 ${selectedDays} 天`);
    } catch (error) {
      console.error('质押失败:', error);
      alert('质押失败，请重试');
    }
  };

  return (
    <section className={styles.stakingContainer}>
      <section>
        <section className={styles.stakeUnstakeTab}>
          <section
            className={`${stakingTab ? styles.stakingType : ""}`}
            id="stake"
            onClick={switchToStake}
          >
            Stake
          </section>
          <section
            className={`${unstakingTab ? styles.stakingType : ""}`}
            id="unstake"
            onClick={switchToUnstake}
          >
            Unstake
          </section>
        </section>
        <section className={styles.stakingSection}>
          <h2>Flexible Staking</h2>
          <span className={styles.apy}>7% APY</span>
          {stakingTab ? (
            <section className={styles.stakingBox}>
              <input
                className={styles.inputField}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                id="inputField"
                maxLength="120"
                placeholder="Enter Amount"
                required
              />
              <section className={styles.stakingInfo}>
                <p>
                  Balance: Check header for current balance
                </p>
                <p>Exchange Rate: 1.03582967</p>
                {/* <p>Transaction Cost</p> */}
              </section>
              <button
                className={styles.stakeBtn}
                onClick={() => stakeEther(0, amount)}
              >
                活期质押
              </button>
            </section>
          ) : (
            <section className={styles.stakingBox}>
              <input
                className={styles.inputField}
                value={unstakeValue}
                onChange={(e) => setUnstakeValue(e.target.value)}
                type="number"
                id="inputField"
                maxLength="120"
                placeholder="Enter Amount"
                required
              />
              <h3>选择要提取的质押头寸</h3>
              <div className={styles.positionList}>
                {assets.filter(a => a.open).map((asset, index) => (
                  <div 
                    key={asset.positionId} 
                    className={`${styles.positionItem} ${selectedPositionId === asset.positionId ? styles.selectedPosition : ''}`}
                    onClick={() => {
                      setSelectedPositionId(asset.positionId);
                      setUnstakeValue(getWithdrawableAmount(asset));
                    }}
                  >
                    <div className={styles.positionInfo}>
                      <div className={styles.positionHeader}>
                        <span className={styles.positionId}>Position #{asset.positionId}</span>
                        <span className={`${styles.status} ${isPositionExpired(asset.daysRemaining) ? styles.expired : styles.active}`}>
                          {isPositionExpired(asset.daysRemaining) ? '✅ 已到期' : `⏰ 剩余 ${asset.daysRemaining} 天`}
                        </span>
                      </div>
                      <div className={styles.positionDetails}>
                        <div className={styles.detailRow}>
                          <span>质押金额:</span>
                          <span>{asset.etherStaked} ETH</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span>利息:</span>
                          <span>{asset.etherInterest} ETH</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span>总可提取:</span>
                          <span className={styles.totalAmount}>{getWithdrawableAmount(asset).toFixed(6)} ETH</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span>年化利率:</span>
                          <span>{(asset.percentInterest * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                className={`${styles.stakeBtn} ${!selectedPositionId || !isPositionExpired(assets.find(a => a.positionId === selectedPositionId)?.daysRemaining || 0) ? styles.disabledBtn : ''}`}
                onClick={() => withdraw(selectedPositionId)}
                disabled={!selectedPositionId || !isPositionExpired(assets.find(a => a.positionId === selectedPositionId)?.daysRemaining || 0)}
              >
                {selectedPositionId && !isPositionExpired(assets.find(a => a.positionId === selectedPositionId)?.daysRemaining || 0) ? '未到期' : '取消质押'}
              </button>
            </section>
          )}
        </section>
      </section>
      <section>
        <section className={styles.stakingInfoSection}>
          <section className={styles.stakingInfo}>
            <h2>Fixed Staking</h2>
            <section className={styles.lockedStaking}>
              <span>30天锁定期</span>
              <span className={styles.lockedStakingAPY}>8% APY</span>
              <input
                className={styles.inputField}
                type="number"
                id="inputField30"
                maxLength="120"
                placeholder="输入金额"
                required
              />
            </section>
            <section className={styles.lockedStaking}>
              <span>60天锁定期</span>
              <span className={styles.lockedStakingAPY}>9% APY</span>
              <input
                className={styles.inputField}
                type="number"
                id="inputField60"
                maxLength="120"
                placeholder="输入金额"
                required
              />
            </section>
            <section className={styles.lockedStaking}>
              <span>90天锁定期</span>
              <span className={styles.lockedStakingAPY}>12% APY</span>
              <input
                className={styles.inputField}
                type="number"
                id="inputField90"
                maxLength="120"
                placeholder="输入金额"
                required
              />
            </section>
          </section>
          <button className={styles.stakeBtn} onClick={handleLockedStaking}>定期质押</button>
        </section>
      </section>
    </section>
  );
}
