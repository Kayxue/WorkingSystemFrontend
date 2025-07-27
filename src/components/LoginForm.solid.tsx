// src/components/LoginForm.solid.tsx
import { createSignal, Show } from "solid-js";

export default function LoginForm() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [role, setRole] = createSignal("business");
  const [error, setError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
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
    <form class="flex flex-col gap-6 mt-4" onSubmit={handleSubmit} novalidate>
      <div class="text-left">
        <label for="email" class="block mb-2 text-gray-700 font-medium text-sm">電子郵件</label>
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
          class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition"
        />
      </div>

      <div class="text-left">
        <label for="password" class="block mb-2 text-gray-700 font-medium text-sm">密碼</label>
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
          class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition"
        />
      </div>

      <div class="text-left">
        <label class="block mb-2 text-gray-700 font-medium text-sm">登入身份</label>
        <div class="flex gap-3 mt-1">
          <label class={`flex-1 px-3 py-2 border rounded-md text-center cursor-pointer text-sm font-medium transition select-none
            ${role() === "business" ? "bg-blue-50 border-blue-400 text-blue-700 font-semibold shadow-sm" : "bg-white border-gray-300 text-gray-700"}
            hover:bg-blue-100`}
          >
            <input
              type="radio"
              name="role"
              value="business"
              checked={role() === "business"}
              onChange={() => setRole("business")}
              class="sr-only"
            />
            商家
          </label>
          <label class={`flex-1 px-3 py-2 border rounded-md text-center cursor-pointer text-sm font-medium transition select-none
            ${role() === "admin" ? "bg-blue-50 border-blue-400 text-blue-700 font-semibold shadow-sm" : "bg-white border-gray-300 text-gray-700"}
            hover:bg-blue-100`}
          >
            <input
              type="radio"
              name="role"
              value="admin"
              checked={role() === "admin"}
              onChange={() => setRole("admin")}
              class="sr-only"
            />
            管理員
          </label>
        </div>
      </div>

      <Show when={error()}>
        <div id="login-error-message" class="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>{error()}</span>
        </div>
      </Show>

      <button type="submit" class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md font-semibold text-base transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400 disabled:cursor-not-allowed mt-2" disabled={isLoading()}>
        {isLoading() ? (
          <>
            <span class="inline-block w-5 h-5 border-2 border-white border-t-blue-500 rounded-full animate-spin"></span>
            <span class="sr-only">登入中...</span>
            <span>處理中</span>
          </>
        ) : (
          "登入"
        )}
      </button>
    </form>
  );
}