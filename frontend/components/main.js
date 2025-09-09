import styles from "../styles/Home.module.css";

import Staking from "./staking.js";

export default function Main() {
  return (
    <section className={styles.container}>
      <Staking />
    </section>
  );
}
