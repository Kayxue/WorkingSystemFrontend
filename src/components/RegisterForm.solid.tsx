// src/components/RegisterForm.solid.tsx
import { createSignal, Show } from "solid-js";

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
    <form class="flex flex-col gap-6 mt-4" onSubmit={handleSubmit} novalidate>
      <div class="text-left">
        <label for="employerName" class="block mb-2 text-gray-700 font-medium text-sm">公司/店家全名 <span class="text-red-500">*</span></label>
        <input type="text" id="employerName" value={employerName()} onInput={(e) => setEmployerName(e.currentTarget.value)} placeholder="例如：美味有限公司" required class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition" />
      </div>

      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 text-left">
          <label for="identificationNumber" class="block mb-2 text-gray-700 font-medium text-sm">統一編號 <span class="text-red-500">*</span></label>
          <input type="text" id="identificationNumber" value={identificationNumber()} onInput={(e) => setIdentificationNumber(e.currentTarget.value)} placeholder="8位數字" required maxLength={8} class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition" />
        </div>
        <div class="flex-1 text-left">
          <label for="phoneNumber" class="block mb-2 text-gray-700 font-medium text-sm">公司/店家電話 <span class="text-red-500">*</span></label>
          <input type="tel" id="phoneNumber" value={phoneNumber()} onInput={(e) => setPhoneNumber(e.currentTarget.value)} placeholder="例如：0212345678" required class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition" />
        </div>
      </div>
      
      <div class="text-left">
        <label for="industryType" class="block mb-2 text-gray-700 font-medium text-sm">產業類別 <span class="text-red-500">*</span></label>
        <select id="industryType" value={industryType()} onChange={(e) => setIndustryType(e.currentTarget.value)} required class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition">
          {industryTypes.map(type => <option value={type.value} disabled={type.value === ""}>{type.label}</option>)}
        </select>
      </div>

      <div class="text-left">
        <label for="address" class="block mb-2 text-gray-700 font-medium text-sm">主要營業地址 <span class="text-red-500">*</span></label>
        <input type="text" id="address" value={address()} onInput={(e) => setAddress(e.currentTarget.value)} placeholder="請填寫完整地址" required class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition" />
      </div>

      <div class="text-left">
        <label for="branchName" class="block mb-2 text-gray-700 font-medium text-sm">分店名稱 <span class="text-gray-400 text-xs">(若無可免填)</span></label>
        <input type="text" id="branchName" value={branchName()} onInput={(e) => setBranchName(e.currentTarget.value)} placeholder="例如：信義分店" class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition" />
      </div>
      
      <hr class="my-2 border-gray-200" />

      <div class="text-left">
        <label for="email" class="block mb-2 text-gray-700 font-medium text-sm">管理者電子郵件 <span class="text-red-500">*</span> <span class="text-gray-400 text-xs">(用於登入及接收通知)</span></label>
        <input type="email" id="email" value={email()} onInput={(e) => setEmail(e.currentTarget.value)} placeholder="you@example.com" required class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition" />
      </div>

      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 text-left">
          <label for="password" class="block mb-2 text-gray-700 font-medium text-sm">管理者密碼 <span class="text-red-500">*</span></label>
          <input type="password" id="password" value={password()} onInput={(e) => setPassword(e.currentTarget.value)} placeholder="至少8位，包含字母和數字" required class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition" />
        </div>
        <div class="flex-1 text-left">
          <label for="confirmPassword" class="block mb-2 text-gray-700 font-medium text-sm">確認密碼 <span class="text-red-500">*</span></label>
          <input type="password" id="confirmPassword" value={confirmPassword()} onInput={(e) => setConfirmPassword(e.currentTarget.value)} placeholder="再次輸入密碼" required class="w-full px-4 py-3 border border-gray-300 rounded-md text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 placeholder-gray-400 transition" />
        </div>
      </div>

      <hr class="my-2 border-gray-200" />

      <div class="text-left">
        <label for="verificationDocument" class="block mb-2 text-gray-700 font-medium text-sm">商業登記驗證文件 <span class="text-red-500">*</span> <span class="text-gray-400 text-xs">(例如：營業登記核准函)</span></label>
        <input type="file" id="verificationDocument" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" required class="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
        <Show when={verificationDocument()}>
          <div class="mt-2 text-sm text-blue-700">已選擇檔案：{verificationDocument()!.name}</div>
        </Show>
      </div>


      <Show when={error()}>
        <div id="register-error-message" class="flex items-center gap-2 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="flex-shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>{error()}</span>
        </div>
      </Show>

      <button type="submit" class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md font-semibold text-base transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400 disabled:cursor-not-allowed mt-2" disabled={isLoading()}>
        {isLoading() ? (
          <>
            <span class="inline-block w-5 h-5 border-2 border-white border-t-blue-500 rounded-full animate-spin"></span>
            <span class="sr-only">註冊中...</span>
            <span>送出註冊資料</span>
          </>
        ) : (
          "同意條款並註冊商家帳號"
        )}
      </button>
    </form>
  );
}