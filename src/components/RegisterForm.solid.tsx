// src/components/RegisterForm.solid.tsx
import { createSignal, Show } from "solid-js";
import styles from '../styles/RegisterForm.module.css';

// 假設的產業類別選項
const industryTypes = [
  { value: "", label: "請選擇產業類別" },
  { value: "餐飲業", label: "餐飲業" },
  { value: "零售業", label: "零售業" },
  { value: "服務業", label: "服務業" },
  { value: "製造業", label: "製造業" },
  { value: "資訊科技業", label: "資訊科技業" },
  { value: "其他", label: "其他" },
];


export default function RegisterForm() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");
  const [employerName, setEmployerName] = createSignal(""); // 公司/店家名稱
  const [branchName, setBranchName] = createSignal(""); // 分店名稱 (可選)
  const [industryType, setIndustryType] = createSignal(""); // 產業類別
  const [address, setAddress] = createSignal(""); // 營業地址
  const [phoneNumber, setPhoneNumber] = createSignal(""); // 公司電話
  const [identificationNumber, setIdentificationNumber] = createSignal(""); // 統一編號
  const [verificationDocument, setVerificationDocument] = createSignal<File | null>(null); // 驗證文件
  
  const [error, setError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      setVerificationDocument(target.files[0]);
    } else {
      setVerificationDocument(null);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email() || !password() || !confirmPassword() || !employerName() || !industryType() || !address() || !phoneNumber() || !identificationNumber()) {
      setError("所有標有 * 的欄位均為必填項。");
      setIsLoading(false);
      return;
    }
    if (!verificationDocument()) {
      setError("請上傳商業登記驗證文件。");
      setIsLoading(false);
      return;
    }

    if (password() !== confirmPassword()) {
      setError("兩次輸入的密碼不一致。");
      setIsLoading(false);
      return;
    }

    if (password().length < 8) { // 建議密碼長度增加
      setError("密碼長度至少需要8位。");
      setIsLoading(false);
      return;
    }
    // 統一編號格式簡單驗證 (8位數字)
    if (!/^\d{8}$/.test(identificationNumber())) {
        setError("統一編號格式不正確，應為8位數字。");
        setIsLoading(false);
        return;
    }


    const formData = new FormData();
    formData.append('email', email());
    formData.append('password', password());
    formData.append('employerName', employerName());
    if (branchName()) formData.append('branchName', branchName()); // 可選欄位
    formData.append('industryType', industryType());
    formData.append('address', address());
    formData.append('phoneNumber', phoneNumber());
    formData.append('identificationNumber', identificationNumber());
    formData.append('identificationType', 'unifiedBusinessNo'); // 固定為統一編號類型
    if (verificationDocument()) {
      formData.append('verificationDocument', verificationDocument() as File);
    }
    // 由於我們是商家註冊，可以固定傳遞 role
    formData.append('role', 'business');


    try {
      // 根據您的後端調整 API 端點
      const response = await fetch("/api/user/register/business", {
        method: "POST",
        headers: {
          // "Content-Type": "multipart/form-data" 會由瀏覽器自動設定
          "platform": "web-business-register", // 平台標識
        },
        // credentials: "include", // 如果需要傳送 cookies
        body: formData,
      });

      if (response.ok) {
        alert("商家帳號註冊成功！我們將盡快審核您的資料。請前往登入。");
        window.location.href = "/login";
      } else {
        const result = await response.json().catch(() => ({ message: "註冊失敗，請稍後再試或聯繫客服。" }));
        setError(result.message || "註冊失敗，請檢查您輸入的資訊。");
      }
    } catch (err) {
      console.error("Business Registration error:", err);
      setError("連線失敗或發生未知錯誤，請檢查您的網路連線並稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form class={styles.registerForm} onSubmit={handleSubmit} novalidate>
      <div class={styles.formGroup}>
        <label for="employerName">公司/店家全名 *</label>
        <input type="text" id="employerName" value={employerName()} onInput={(e) => setEmployerName(e.currentTarget.value)} placeholder="例如：美味有限公司" required />
      </div>

      <div class={styles.formRow}>
        <div class={styles.formGroup}>
          <label for="identificationNumber">統一編號 *</label>
          <input type="text" id="identificationNumber" value={identificationNumber()} onInput={(e) => setIdentificationNumber(e.currentTarget.value)} placeholder="8位數字" required maxLength={8}/>
        </div>
        <div class={styles.formGroup}>
          <label for="phoneNumber">公司/店家電話 *</label>
          <input type="tel" id="phoneNumber" value={phoneNumber()} onInput={(e) => setPhoneNumber(e.currentTarget.value)} placeholder="例如：0212345678" required />
        </div>
      </div>
      
      <div class={styles.formGroup}>
        <label for="industryType">產業類別 *</label>
        <select id="industryType" value={industryType()} onChange={(e) => setIndustryType(e.currentTarget.value)} required>
          {industryTypes.map(type => <option value={type.value} disabled={type.value === ""}>{type.label}</option>)}
        </select>
      </div>

      <div class={styles.formGroup}>
        <label for="address">主要營業地址 *</label>
        <input type="text" id="address" value={address()} onInput={(e) => setAddress(e.currentTarget.value)} placeholder="請填寫完整地址" required />
      </div>

      <div class={styles.formGroup}>
        <label for="branchName">分店名稱 <span class={styles.optionalText}>(若無可免填)</span></label>
        <input type="text" id="branchName" value={branchName()} onInput={(e) => setBranchName(e.currentTarget.value)} placeholder="例如：信義分店" />
      </div>
      
      <hr class={styles.hrStyles} />

      <div class={styles.formGroup}>
        <label for="email">管理者電子郵件 * <span class={styles.optionalText}>(用於登入及接收通知)</span></label>
        <input type="email" id="email" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} placeholder="you@example.com" required />
      </div>

      <div class={styles.formRow}>
        <div class={styles.formGroup}>
          <label for="password">管理者密碼 *</label>
          <input type="password" id="password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} placeholder="至少8位，包含字母和數字" required />
        </div>
        <div class={styles.formGroup}>
          <label for="confirmPassword">確認密碼 *</label>
          <input type="password" id="confirmPassword" value={confirmPassword()} onInput={(e) => setConfirmPassword(e.currentTarget.value)} placeholder="再次輸入密碼" required />
        </div>
      </div>

      <hr class={styles.hrStyles} />

      <div class={styles.formGroup}>
        <label for="verificationDocument">商業登記驗證文件 * <span class={styles.optionalText}>(例如：營業登記核准函)</span></label>
        <input type="file" id="verificationDocument" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" required />
        <Show when={verificationDocument()}>
          <div class={styles.fileNameDisplay}>已選擇檔案：{verificationDocument()!.name}</div>
        </Show>
      </div>


      <Show when={error()}>
        <div id="register-error-message" class={styles.errorMessage} role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class={styles.errorIcon} aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>{error()}</span>
        </div>
      </Show>

      <button type="submit" class={styles.btnSubmit} disabled={isLoading()}>
        {isLoading() ? (
          <>
            <span class={styles.spinner} aria-hidden="true"></span>
            <span class={styles.srOnly}>註冊中...</span>
            <span>送出註冊資料</span>
          </>
        ) : (
          "同意條款並註冊商家帳號"
        )}
      </button>
    </form>
  );
}