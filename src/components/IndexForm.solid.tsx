import { createSignal, onMount } from "solid-js";
import styles from '../styles/IndexForm.module.css';

export default function IndexForm() {
  const [user, setUser] = createSignal(null);

  onMount(async () => {
    try {
      const res = await fetch("http://localhost:3000/user/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          platform: "web-employer",
        },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  });

  return (
    <section class={styles.hero}>
      <div class={styles.container}>
        <h1>WorkNow - 您的即時企業人力夥伴</h1>
        <p>專為商家與企業設計，快速媒合彈性工讀生與兼職人員。</p>
        <p>輕鬆發布短期職缺，高效管理人力需求，解決您的即時人力缺口。</p>
        <div class={styles['cta-buttons']}>
          {user() ? (
            <a href="/dashboard" class={`${styles.btn} ${styles['btn-primary']}`}>職缺列表</a>
          ) : (
            <a href="/register" class={`${styles.btn} ${styles['btn-primary']}`}>企業註冊</a>
          )}
          <a href="/post-job" class={`${styles.btn} ${styles['btn-secondary']}`}>發布職缺</a>
        </div>
      </div>
    </section>
  );
}
