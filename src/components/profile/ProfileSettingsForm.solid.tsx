import { createSignal, createEffect, type Setter, type Accessor } from 'solid-js';
import AvatarSection from './AvatarSection.solid.tsx';

interface EmployerData {
  employerName: string;
  branchName: string;
  industryType: string;
  address: string;
  phoneNumber: string;
  identificationType: string;
  identificationNumber: string;
  employerPhoto: {
    url: string;
    originalName: string;
    type: string;
  } | null;
  email: string;
  employerId: string;
}

interface ProfileSettingsFormProps {
  initialEmployerData: EmployerData;
}

const ProfileSettingsForm = (props: ProfileSettingsFormProps) => {
  const [haveChanges, setHaveChanges] = createSignal<boolean>(false);

  const [showNotificationModal, setShowNotificationModal] = createSignal<boolean>(false);
  const [notificationMessage, setNotificationMessage] = createSignal<string | null>(null);
  const [notificationType, setNotificationType] = createSignal<'success' | 'error'>('success');

  const [showConfirmModal, setShowConfirmModal]= createSignal<boolean>(false);
  const [confirmMessage, setConfirmMessage]= createSignal<string>('');
  const [onConfirmCallback, setOnConfirmCallback] = createSignal<(() => void) | null>(null);


  const [formData, setFormData] = createSignal<EmployerData>({
    ...props.initialEmployerData,
    employerPhoto: props.initialEmployerData.employerPhoto || null,
  });

  createEffect(() => {
    setFormData({
      ...props.initialEmployerData,
      employerPhoto: props.initialEmployerData.employerPhoto || null,
    });
  });

  const handleChange = (e: Event): void => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const { name, value } = target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setHaveChanges(true);
  };

  const handleEmployerPhotoChange = (newUrl: string | null): void => {
    setFormData((prev) => ({
      ...prev,
      employerPhoto: newUrl ? { url: newUrl, originalName: 'new_photo', type: 'image/jpeg' } : null,
    }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!haveChanges())return;

    const {employerPhoto, ...newFormData} = formData();
    try{
      const response = await fetch('/api/user/update/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'platform': 'web-employer',
        },
        body: JSON.stringify(newFormData),
      });
      if (!response.ok) {
        throw new Error(`Error updating profile: ${response.statusText}`);
      }
      setNotificationMessage('Your profile has been updated successfully!');
      setNotificationType('success');
    }catch (error: any) {
      setNotificationMessage(`Failed to update profile: ${error.message || 'An unknown error occurred.'}`);
      setNotificationType('error');
    } finally {
      setShowNotificationModal(true);
      setHaveChanges(false);
    }
  };

  const handleReset = (): void => {
    if(!haveChanges()) return;
    setConfirmMessage('您確定要重置所有更改嗎？這將丟失您所做的所有修改。');
    setOnConfirmCallback(() => () => {
      setFormData({
        ...props.initialEmployerData,
        employerPhoto: props.initialEmployerData.employerPhoto || null,
      });
      setHaveChanges(false);
    })
    setShowConfirmModal(true);
  };

  const handleCloseNotificationModal = () => {
    setShowNotificationModal(false);
    setNotificationMessage('');
  };

  const handleConfirmAction = () => {
    if (onConfirmCallback()) {
      onConfirmCallback()();
    }
    setShowConfirmModal(false);
    setOnConfirmCallback(null);
    setConfirmMessage('');
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setOnConfirmCallback(null);
    setConfirmMessage('');
  };

  // 定義通用的輸入欄位 Tailwind 類別
  const inputClass = `
    w-full py-3 px-4 border border-gray-300 rounded-md text-base text-gray-800
    placeholder-gray-400 transition-all duration-200 ease-in-out
    focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
  `;

  const selectClass = `
    w-full py-3 px-4 border border-gray-300 rounded-md text-base text-gray-800
    placeholder-gray-400 transition-all duration-200 ease-in-out
    focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
  `;

  // 定義通用的標籤 Tailwind 類別
  const labelClass = `
    block mb-2 text-gray-700 text-sm font-bold
  `;

  return (
    <form onSubmit={handleSubmit} class="w-full max-w-2xl mx-auto">
      {/* 雇主頭像區塊 */}
      <AvatarSection
        name={formData().employerName}
        avatarUrl={formData().employerPhoto?.url || null}
        onAvatarChange={handleEmployerPhotoChange}
      />

      {/* 姓名 */}
      <div class="mb-4">
        <label for="employerName" class={labelClass}>名稱</label>
        <input
          type="text"
          id="employerName"
          name="employerName"
          value={formData().employerName}
          onInput={handleChange}
          class={inputClass}
        />
      </div>

      {/* 分店名稱 */}
      <div class="mb-4">
        <label for="branchName" class={labelClass}>分店名稱</label>
        <input
          type="text"
          id="branchName"
          name="branchName"
          value={formData().branchName}
          onInput={handleChange}
          class={inputClass}
        />
      </div>

      {/* 產業類型和地址 - RWD grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label for="industryType" class={labelClass}>產業類型</label>
          <select
            id="industryType"
            name="industryType"
            value={formData().industryType}
            onInput={handleChange}
            class={selectClass}
          >
            <option value="餐飲">餐飲</option>
            <option value="批發/零售">批發/零售</option>
            <option value="倉儲運輸">倉儲運輸</option>
            <option value="展場活動">展場活動</option>
            <option value="其他">其他</option> 
          </select>
        </div>
        <div>
          <label for="address" class={labelClass}>地址</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData().address}
            onInput={handleChange}
            class={inputClass}
          />
        </div>
      </div>

      {/* 手機號碼 */}
      <div class="mb-4">
        <label for="phoneNumber" class={labelClass}>手機號碼</label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          value={formData().phoneNumber}
          onInput={handleChange}
          class={inputClass}
        />
      </div>

      {/* 身份驗證類型和號碼 - RWD grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label for="identificationType" class={labelClass}>身份驗證類型</label>
          <select
            id="identificationType"
            name="identificationType"
            value={formData().identificationType}
            onChange={handleChange}
            class={selectClass}
          >
            <option value="businessNo">統一編號</option>
            <option value="personalId">個人身份證</option>
          </select>
        </div>
        <div>
          <label for="identificationNumber" class={labelClass}>身份驗證號碼</label>
          <input
            type="text"
            id="identificationNumber"
            name="identificationNumber"
            value={formData().identificationNumber}
            onInput={handleChange}
            class={inputClass}
          />
        </div>
      </div>

      {/* 按鈕區塊 - RWD */}
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between mt-8 gap-4 md:gap-6">
        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-4 w-full md:w-auto">
          <button
            type="submit"
            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md focus:outline-none focus:shadow-outline w-full md:w-auto"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={handleReset}
            class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-md focus:outline-none focus:shadow-outline w-full md:w-auto"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 通知 Modal (複製自 AvatarSection 並整合到 ProfileSettingsForm 內部) */}
      {showNotificationModal() && (
        <div
          class={`fixed inset-0 bg-gray-600/75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
            showNotificationModal() ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={handleCloseNotificationModal}
        >
          <div
            class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-auto transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: showNotificationModal() ? 'translateY(0)' : 'translateY(-20px)',
            }}
          >
            <div class="flex flex-col items-center">
              {notificationType() === 'success' ? (
                <svg
                  class="w-16 h-16 text-green-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              ) : (
                <svg
                  class="w-16 h-16 text-red-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2 2m0 0l2-2m-2-2v4m-3 3h6a9 9 0 000-18h-6a9 9 0 000 18z"></path>
                </svg>
              )}
              <h3 class="text-xl font-semibold mb-3 text-gray-800">
                {notificationType() === 'success' ? 'Success!' : 'Failed!'}
              </h3>
              <p class="text-center text-gray-600 mb-6">{notificationMessage()}</p>
              <button
                onClick={handleCloseNotificationModal}
                class={`px-6 py-2 rounded-md font-semibold text-white ${
                  notificationType() === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal() && (
        <div
          class={`fixed inset-0 bg-gray-600/75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
            showConfirmModal() ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={handleCancelConfirm} // 點擊背景關閉
        >
          <div
            class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-auto transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()} // 阻止點擊 Modal 內容時關閉
            style={{
              transform: showConfirmModal() ? 'translateY(0)' : 'translateY(-20px)',
            }}
          >
            <div class="flex flex-col items-center">
              <svg
                class="w-16 h-16 text-yellow-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <h3 class="text-xl font-semibold mb-3 text-gray-800">確認操作</h3>
              <p class="text-center text-gray-600 mb-6">{confirmMessage()}</p>
              <div class="flex space-x-4">
                <button
                  onClick={handleCancelConfirm}
                  class="px-6 py-2 rounded-md font-semibold text-gray-800 bg-gray-200 hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmAction}
                  class="px-6 py-2 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </form>

    
  );
};

export default ProfileSettingsForm;
