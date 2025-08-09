import { createSignal } from 'solid-js';

const UpdatePasswordForm = () => {
  const [currentPassword, setCurrentPassword] = createSignal<string>('');
  const [newPassword, setNewPassword] = createSignal<string>('');
  const [confirmPassword, setConfirmPassword] = createSignal<string>('');

  const [showCurrentPassword, setShowCurrentPassword] = createSignal(false);
  const [showNewPassword, setShowNewPassword] = createSignal(false);
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false);
  
  const [showNotificationModal, setShowNotificationModal] = createSignal<boolean>(false);
  const [notificationMessage, setNotificationMessage] = createSignal<string | null>(null);
  const [notificationType, setNotificationType] = createSignal<'success' | 'error'>('success');

  const [showConfirmModal, setShowConfirmModal] = createSignal<boolean>(false);
  const [confirmMessage, setConfirmMessage] = createSignal<string>('');
  const [onConfirmCallback, setOnConfirmCallback] = createSignal<(() => void) | null>(null);

  const [passwordError, setPasswordError] = createSignal<string>('');

  const toggleShowCurrentPassword = () => setShowCurrentPassword(!showCurrentPassword());
  const toggleShowNewPassword = () => setShowNewPassword(!showNewPassword());
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword());

  const clearForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword() !== confirmPassword()) {
      setPasswordError('新密碼與確認密碼不匹配。');
      return;
    }
    if (!currentPassword() || !newPassword()) {
      setPasswordError('所有欄位均為必填項。');
      return;
    }

    try {
      const response = await fetch('/api/user/update/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'platform': 'web-employer',
        },
        body: JSON.stringify({
          currentPassword: currentPassword(),
          newPassword: newPassword(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '更新密碼失敗，請檢查您當前的密碼。');
      }

      setNotificationMessage('您的密碼已成功更新！');
      setNotificationType('success');
      clearForm();
    } catch (error: any) {
      setNotificationMessage(`密碼更新失敗：${error.message}`);
      setNotificationType('error');
    } finally {
      setShowNotificationModal(true);
    }
  };

  const handleReset = () => {
    setConfirmMessage('您確定要清除所有已輸入的內容嗎？');
    setOnConfirmCallback(() => () => {
      clearForm();
    });
    setShowConfirmModal(true);
  };

  const handleCloseNotificationModal = () => {
    setShowNotificationModal(false);
    setNotificationMessage('');
  };

  const handleConfirmAction = () => {
    if (onConfirmCallback()) {
      onConfirmCallback()!();
    }
    setShowConfirmModal(false);
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
  };

  const inputClass = `
    w-full py-3 px-4 border border-gray-300 rounded-md text-base text-gray-800
    placeholder-gray-400 transition-all duration-200 ease-in-out
    focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
  `;

  const labelClass = `
    block mb-2 text-gray-700 text-sm font-bold
  `;

const EyeIcon = (props: { closed: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    {props.closed ? (
      // Eye Off Icon (hide password)
      <> 
        // Eye Off Icon (hide password)
        <path 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          d="M2 2L22 22" 
        />
        <path
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          d="M6.71277 6.7226C3.66479 8.79527 2 12 2 12C2 12 5.63636 19 12 19C14.0503 19 15.8174 18.2734 17.2711 17.2884M11 5.05822C11.3254 5.02013 11.6588 5 12 5C18.3636 5 22 12 22 12C22 12 21.3082 13.3317 20 14.8335"
        />
        <path
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round" 
          d="M14 14.2362C13.4692 14.7112 12.7684 15.0001 12 15.0001C10.3431 15.0001 9 13.657 9 12.0001C9 11.1764 9.33193 10.4303 9.86932 9.88818" 
        />
      </>
    ) : (
      // Eye Icon (show password)
      <>
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z"
        />
      </>
    )}
  </svg>
);

  return (
    <form onSubmit={handleSubmit} class="w-full h-full flex flex-col justify-center">
      <div class="max-w-2xl mx-auto w-full">
        <div class="mb-4">
          <label class={labelClass} for="currentPassword">當前密碼</label>
          <div class="relative">
            <input
              type={showCurrentPassword() ? 'text' : 'password'}
              id="currentPassword"
              value={currentPassword()}
              onInput={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder="請輸入您的當前密碼"
              required
            />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600" onClick={toggleShowCurrentPassword}>
              <EyeIcon closed={!showCurrentPassword()} />
            </div>
          </div>
        </div>

        <div class="mb-4">
          <label class={labelClass} for="newPassword">新密碼</label>
          <div class="relative">
            <input
              type={showNewPassword() ? 'text' : 'password'}
              id="newPassword"
              value={newPassword()}
              onInput={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder="請輸入您的新密碼"
              required
            />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600" onClick={toggleShowNewPassword}>
              <EyeIcon closed={!showNewPassword()} />
            </div>
          </div>
        </div>

        <div class="mb-6">
          <label class={labelClass} for="confirmPassword">確認新密碼</label>
          <div class="relative">
            <input
              type={showConfirmPassword() ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder="請再次輸入您的新密碼"
              required
            />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600" onClick={toggleShowConfirmPassword}>
              <EyeIcon closed={!showConfirmPassword()} />
            </div>
          </div>
          {passwordError() && <p class="text-red-500 text-sm mt-2">{passwordError()}</p>}
        </div>

        <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between mt-8 gap-4 md:gap-6">
          <div class="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-4 w-full md:w-auto">
            <button
              type="submit"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md focus:outline-none focus:shadow-outline w-full md:w-auto"
            >
              更新密碼
            </button>
            <button
              type="button"
              onClick={handleReset}
              class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-md focus:outline-none focus:shadow-outline w-full md:w-auto"
            >
              重置
            </button>
          </div>
        </div>
      </div>

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
                <svg class="w-16 h-16 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              ) : (
                <svg class="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2 2m0 0l2-2m-2-2v4m-3 3h6a9 9 0 000-18h-6a9 9 0 000 18z"></path>
                </svg>
              )}
              <h3 class="text-xl font-semibold mb-3 text-gray-800">
                {notificationType() === 'success' ? '成功！' : '失敗！'}
              </h3>
              <p class="text-center text-gray-600 mb-6">{notificationMessage()}</p>
              <button
                onClick={handleCloseNotificationModal}
                class={`px-6 py-2 rounded-md font-semibold text-white ${
                  notificationType() === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                了解
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
          onClick={handleCancelConfirm}
        >
          <div
            class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-auto transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: showConfirmModal() ? 'translateY(0)' : 'translateY(-20px)',
            }}
          >
            <div class="flex flex-col items-center">
              <svg class="w-16 h-16 text-yellow-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

export default UpdatePasswordForm;
