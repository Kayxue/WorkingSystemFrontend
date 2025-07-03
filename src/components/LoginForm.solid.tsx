// src/components/LoginForm.solid.tsx
import { createSignal, Show } from "solid-js";
import styles from '../styles/LoginForm.module.css'; // 導入 CSS Module

export default function LoginForm() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [role, setRole] = createSignal("business"); // 預設角色
  const [error, setError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError(""); // 清除先前的錯誤
    setIsLoading(true);

    if (!email() || !password()) {
      setError("電子郵件和密碼為必填項。");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer"
        },
        body: JSON.stringify({
          email: email(),
          password: password(),
          role: role(),
        }),
      });

      if (response.ok) {
        window.location.href = "/dashboard";
      } else {
        const result = await response.json().catch(() => ({ message: "登入失敗，請檢查您的憑證。" }));
        setError(result.message || "登入失敗，請檢查您的憑證。");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("連線失敗，請檢查您的網路連線並稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form class={styles.loginForm} onSubmit={handleSubmit} novalidate>
      <div class={styles.formGroup}>
        <label for="email">電子郵件</label>
        <input
          type="email"
          id="email"
          value={email()}
          onInput={(e) => setEmail(e.currentTarget.value)}
          placeholder="you@example.com"
          aria-label="電子郵件"
          aria-required="true"
          aria-invalid={!!error() && (error().includes("郵件") || error().includes("憑證"))}
          aria-describedby={error() ? "login-error-message" : undefined}
          required
        />
      </div>

      <div class={styles.formGroup}>
        <label for="password">密碼</label>
        <input
          type="password"
          id="password"
          value={password()}
          onInput={(e) => setPassword(e.currentTarget.value)}
          placeholder="請輸入密碼"
          aria-label="密碼"
          aria-required="true"
          aria-invalid={!!error() && (error().includes("密碼") || error().includes("憑證"))}
          aria-describedby={error() ? "login-error-message" : undefined}
          required
        />
      </div>

      <div class={styles.formGroup}>
        <label>登入身份</label>
        <div class={styles.roleSelector}>
          <label class={`${styles.roleOption} ${role() === "business" ? styles.selected : ""}`}>
            <input
              type="radio"
              name="role"
              value="business"
              checked={role() === "business"}
              onChange={() => setRole("business")}
              class={styles.srOnly} // 使用 CSS Module 中的 srOnly
            />
            商家
          </label>
          <label class={`${styles.roleOption} ${role() === "admin" ? styles.selected : ""}`}>
            <input
              type="radio"
              name="role"
              value="admin"
              checked={role() === "admin"}
              onChange={() => setRole("admin")}
              class={styles.srOnly} // 使用 CSS Module 中的 srOnly
            />
            管理員
          </label>
        </div>
      </div>

      <Show when={error()}>
        <div id="login-error-message" class={styles.errorMessage} role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={styles.errorIcon} aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>{error()}</span>
        </div>
      </Show>

      <button type="submit" class={styles.btnSubmit} disabled={isLoading()}>
        {isLoading() ? (
          <>
            <span class={styles.spinner} aria-hidden="true"></span>
            <span class={styles.srOnly}>登入中...</span>
            <span>處理中</span>
          </>
        ) : (
          "登入"
        )}
      </button>
    </form>
  );
}