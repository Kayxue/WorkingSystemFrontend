import { createSignal, Show, onCleanup, For } from "solid-js";

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

interface FilePreview {
  file: File;
  url: string;
}

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
  const [files, setFiles] = createSignal<FilePreview[]>([]); // 驗證文件
  
  const [error, setError] = createSignal("");
  const [isLoading, setIsLoading] = createSignal(false);

  const MAX_FILES = 2;
  const MAX_SIZE_MB = 2;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
  const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;

    setError('');
    const newFiles = Array.from(input.files);

    if (files().length + newFiles.length > MAX_FILES) {
      setError(`最多只能上傳 ${MAX_FILES} 個文件。`);
      return;
    }

    const validFiles = newFiles.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`文件格式無效: ${file.name}. 只接受 JPG, PNG, PDF.`);
        return false;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`文件 ${file.name} 過大，請上傳小於 ${MAX_SIZE_MB}MB 的文件。`);
        return false;
      }
      return true;
    });

    if (error()) return;

    const filePreviews = validFiles.map(file => ({
      file,
      url: URL.createObjectURL(file)
    }));

    setFiles(current => [...current, ...filePreviews]);
  };

  const handleFileDelete = (index: number) => {
    const fileToDelete = files()[index];
    URL.revokeObjectURL(fileToDelete.url); // Clean up memory
    setFiles(current => current.filter((_, i) => i !== index));
  };
  
  onCleanup(() => {
    files().forEach(file => URL.revokeObjectURL(file.url));
  });


  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email() || !password() || !confirmPassword() || !employerName() || !industryType() || !address() || !phoneNumber() || !identificationNumber()) {
      setError("所有標有 * 的欄位均為必填項。");
      setIsLoading(false);
      return;
    }
    if (files().length === 0) {
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
    
    files().forEach(filePreview => {
      formData.append('verificationDocuments', filePreview.file);
    });

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
        <label class="block mb-2 text-gray-700 font-medium text-sm">商業登記驗證文件 <span class="text-red-500">*</span> <span class="text-gray-400 text-xs">(最多 {MAX_FILES} 個，每個檔案不超過 {MAX_SIZE_MB}MB)</span></label>
        {files().length < MAX_FILES && (
          <div class="relative flex items-center justify-center w-full">
            <label for="file-upload" class="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div class="flex flex-col items-center justify-center pt-5 pb-6">
                <svg class="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                <p class="mb-2 text-sm text-gray-500"><span class="font-semibold">點擊上傳</span> 或拖曳檔案至此</p>
                <p class="text-xs text-gray-500">支援格式: PDF, JPG, PNG (單檔 {MAX_SIZE_MB}MB 以內)</p>
              </div>
              <input id="file-upload" type="file" class="hidden" onChange={handleFileChange} accept={ALLOWED_EXTENSIONS.join(',')} multiple />
            </label>
          </div>
        )}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <For each={files()}>
          {(filePreview, index) => (
            <div class="relative border rounded-lg p-2 flex flex-col items-center">
              {filePreview.file.type.startsWith('image/') ? (
                <img src={filePreview.url} alt="Preview" class="w-full h-32 object-cover rounded-md mb-2" />
              ) : (
                <div class="w-full h-32 flex flex-col justify-center items-center bg-gray-100 rounded-md mb-2">
                  <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <span class="text-sm text-gray-600 mt-2">PDF Document</span>
                </div>
              )}
              <p class="text-xs text-gray-700 truncate w-full text-center" title={filePreview.file.name}>{filePreview.file.name}</p>
              <button onClick={() => handleFileDelete(index())} type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs leading-none w-5 h-5 flex items-center justify-center hover:bg-red-600">&times;</button>
            </div>
          )}
        </For>
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
