import { createSignal, Show } from "solid-js";

type Step = "email" | "otp" | "success";

export default function ForgotPasswordForm() {
  const [currentStep, setCurrentStep] = createSignal<Step>("email");
  const [email, setEmail] = createSignal("");
  const [otp, setOtp] = createSignal("");
  const [newPassword, setNewPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);
  const [cooldownTime, setCooldownTime] = createSignal(0);

  // Cooldown timer effect
  const startCooldown = (seconds: number) => {
    setCooldownTime(seconds);
    const timer = setInterval(() => {
      setCooldownTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email()) {
      setError("電子郵件為必填項。");
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email())) {
      setError("請輸入有效的電子郵件");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/pw-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        body: JSON.stringify({
          email: email(),
        }),
      });

      if (response.ok) {
        setCurrentStep("otp");
        setError("");
      } else if (response.status === 429) {
        const errorText = await response.text();
        setError(errorText);
        // Extract cooldown time from error message if possible
        const match = errorText.match(/(\d+)\s*秒/);
        if (match) {
          startCooldown(parseInt(match[1]));
        }
      } else {
        const errorText = await response.text();
        setError(errorText || "發送驗證碼失敗，請稍後再試。");
      }
    } catch (err) {
      console.error("Password reset request error:", err);
      setError("連線失敗，請檢查您的網路連線並稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!otp()) {
      setError("驗證碼為必填項。");
      setIsLoading(false);
      return;
    }

    if (!newPassword()) {
      setError("新密碼為必填項。");
      setIsLoading(false);
      return;
    }

    if (newPassword().length < 8) {
      setError("密碼至少需要8個字符。");
      setIsLoading(false);
      return;
    }

    if (newPassword() !== confirmPassword()) {
      setError("密碼確認不一致。");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/user/pw-reset/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        body: JSON.stringify({
          email: email(),
          verificationCode: otp(),
          newPassword: newPassword(),
        }),
      });

      if (response.ok) {
        setCurrentStep("success");
        setError("");
      } else {
        const errorText = await response.text();
        setError(errorText || "重設密碼失敗，請檢查驗證碼是否正確。");
      }
    } catch (err) {
      console.error("Password reset verify error:", err);
      setError("連線失敗，請檢查您的網路連線並稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  const resendOtp = async () => {
    if (cooldownTime() > 0) return;
    
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/user/pw-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        body: JSON.stringify({
          email: email(),
        }),
      });

      if (response.ok) {
        setError("");
        // Show success message or start cooldown
        startCooldown(60); // 60 second cooldown for resend
      } else if (response.status === 429) {
        const errorText = await response.text();
        setError(errorText);
        const match = errorText.match(/(\d+)\s*秒/);
        if (match) {
          startCooldown(parseInt(match[1]));
        }
      } else {
        const errorText = await response.text();
        setError(errorText || "重新發送驗證碼失敗。");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError("連線失敗，請稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep("email");
    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setCooldownTime(0);
  };

  return (
    <div class="max-w-md mx-auto">
      <div class="flex items-center justify-center mb-6">
        <div class="flex items-center space-x-4">
          <div class={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep() === "email" ? "bg-blue-600 text-white" : 
            currentStep() === "otp" || currentStep() === "success" ? "bg-blue-100 text-blue-600" : 
            "bg-gray-200 text-gray-500"
          }`}>
            1
          </div>
          <div class="w-16 h-1 bg-gray-200">
            <div class={`h-full transition-all duration-300 ${
              currentStep() === "otp" || currentStep() === "success" ? "bg-blue-600 w-full" : "bg-gray-200 w-0"
            }`}></div>
          </div>
          <div class={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep() === "otp" ? "bg-blue-600 text-white" : 
            currentStep() === "success" ? "bg-blue-100 text-blue-600" : 
            "bg-gray-200 text-gray-500"
          }`}>
            2
          </div>
          <div class="w-16 h-1 bg-gray-200">
            <div class={`h-full transition-all duration-300 ${
              currentStep() === "success" ? "bg-blue-600 w-full" : "bg-gray-200 w-0"
            }`}></div>
          </div>
          <div class={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep() === "success" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
          }`}>
            ✓
          </div>
        </div>
      </div>

      {/* Step 1: Email Input */}
      <Show when={currentStep() === "email"}>
        <div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">忘記密碼</h2>
          <p class="text-gray-600 mb-6">請輸入您的電子郵件地址，我們將發送驗證碼給您。</p>
          
          <form class="flex flex-col gap-6" onSubmit={handleEmailSubmit} novalidate>
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
                aria-invalid={!!error()}
                aria-describedby={error() ? "email-error-message" : undefined}
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition"
              />
            </div>

            <Show when={error()}>
              <div id="email-error-message" class="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error()}</span>
              </div>
            </Show>

            <button 
              type="submit" 
              class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md font-semibold text-base transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400 disabled:cursor-not-allowed" 
              disabled={isLoading() || cooldownTime() > 0}
            >
              {isLoading() ? (
                <>
                  <span class="inline-block w-5 h-5 border-2 border-white border-t-blue-500 rounded-full animate-spin"></span>
                  <span>發送中</span>
                </>
              ) : cooldownTime() > 0 ? (
                `請等待 ${cooldownTime()} 秒`
              ) : (
                "發送驗證碼"
              )}
            </button>
          </form>
        </div>
      </Show>

      {/* Step 2: OTP and New Password */}
      <Show when={currentStep() === "otp"}>
        <div>
          <h2 class="text-2xl font-bold text-gray-800 mb-2">驗證與重設密碼</h2>
          <p class="text-gray-600 mb-6">請檢查您的電子郵件並輸入收到的驗證碼，然後設定新密碼。</p>
          
          <form class="flex flex-col gap-6" onSubmit={handleOtpSubmit} novalidate>
            <div class="text-left">
              <label for="otp" class="block mb-2 text-gray-700 font-medium text-sm">驗證碼</label>
              <input
                type="text"
                id="otp"
                value={otp()}
                onInput={(e) => setOtp(e.currentTarget.value)}
                placeholder="請輸入6位數驗證碼"
                aria-label="驗證碼"
                aria-required="true"
                aria-invalid={!!error() && error().includes("驗證碼")}
                aria-describedby={error() ? "otp-error-message" : undefined}
                required
                maxlength="6"
                class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition text-center tracking-widest font-mono"
              />
            </div>

            <div class="text-left">
              <label for="newPassword" class="block mb-2 text-gray-700 font-medium text-sm">新密碼</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword()}
                onInput={(e) => setNewPassword(e.currentTarget.value)}
                placeholder="請輸入新密碼（至少8個字符）"
                aria-label="新密碼"
                aria-required="true"
                aria-invalid={!!error() && error().includes("密碼")}
                aria-describedby={error() ? "otp-error-message" : undefined}
                required
                minlength="8"
                class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition"
              />
            </div>

            <div class="text-left">
              <label for="confirmPassword" class="block mb-2 text-gray-700 font-medium text-sm">確認新密碼</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword()}
                onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                placeholder="請再次輸入新密碼"
                aria-label="確認新密碼"
                aria-required="true"
                aria-invalid={!!error() && error().includes("密碼確認")}
                aria-describedby={error() ? "otp-error-message" : undefined}
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition"
              />
            </div>

            <Show when={error()}>
              <div id="otp-error-message" class="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{error()}</span>
              </div>
            </Show>

            <div class="flex flex-col gap-3">
              <button 
                type="submit" 
                class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md font-semibold text-base transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isLoading()}
              >
                {isLoading() ? (
                  <>
                    <span class="inline-block w-5 h-5 border-2 border-white border-t-blue-500 rounded-full animate-spin"></span>
                    <span>重設中</span>
                  </>
                ) : (
                  "重設密碼"
                )}
              </button>

              <button 
                type="button"
                onClick={resendOtp}
                class="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-md font-medium text-base transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                disabled={isLoading() || cooldownTime() > 0}
              >
                {cooldownTime() > 0 ? `重新發送 (${cooldownTime()}s)` : "重新發送驗證碼"}
              </button>

              <button 
                type="button"
                onClick={resetForm}
                class="text-blue-600 hover:text-blue-700 text-sm font-medium transition"
              >
                返回輸入電子郵件
              </button>
            </div>
          </form>
        </div>
      </Show>

      {/* Step 3: Success */}
      <Show when={currentStep() === "success"}>
        <div class="text-center">
          <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600">
              <polyline points="20,6 9,17 4,12"></polyline>
            </svg>
          </div>
          
          <h2 class="text-2xl font-bold text-gray-800 mb-2">密碼重設成功！</h2>
          <p class="text-gray-600 mb-6">您的密碼已成功重設。您現在可以使用新密碼登入您的帳戶。</p>
          
          <button 
            type="button"
            onClick={() => window.location.href = "/login"}
            class="w-full px-4 py-3 bg-blue-600 text-white rounded-md font-semibold text-base transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            前往登入頁面
          </button>
        </div>
      </Show>
    </div>
  );
}