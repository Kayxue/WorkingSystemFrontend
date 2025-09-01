import { createSignal, createEffect, For, onCleanup } from 'solid-js';
import AvatarSection from './AvatarSection.solid.tsx';
import areaData from '../../static/AreaData.json';

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
  ratingStats: {
    totalRatings: number; // 評價總數
    averageRating: number; // 平均評分
  }
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

  const [selectedCity, setSelectedCity] = createSignal<string>('');
  const [selectedDistrict, setSelectedDistrict] = createSignal<string>('');
  const [addressLine, setAddressLine] = createSignal<string>('');
  const [districts, setDistricts] = createSignal<string[]>([]);

  const [isCityDropdownOpen, setIsCityDropdownOpen] = createSignal(false);
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = createSignal(false);
  const [isIndustryDropdownOpen, setIsIndustryDropdownOpen] = createSignal(false);
  let cityDropdownRef: HTMLDivElement | undefined;
  let districtDropdownRef: HTMLDivElement | undefined;
  let industryDropdownRef: HTMLDivElement | undefined; 

  const industryTypes = ['餐飲', '批發/零售', '倉儲運輸', '展場活動', '其他']; 

  const parseAddress = (fullAddress: string) => {
    if (!fullAddress) return;

    const cities = Object.keys(areaData);
    let city = '';
    let district = '';
    let restOfAddress = fullAddress;

    for (const c of cities) {
      if (fullAddress.startsWith(c)) {
        city = c;
        const possibleDistricts = areaData[c as keyof typeof areaData];
        let tempAddress = fullAddress.substring(c.length, 6);
        
        for (const d of possibleDistricts) {
          if (tempAddress.startsWith(d)) {
            district = d.trim();
            restOfAddress = fullAddress.substring(c.length + d.length).trim();
            break;
          }
        }
        break;
      }
    }
    
    setSelectedCity(city);
    if (city) {
      setDistricts(areaData[city as keyof typeof areaData]);
    }
    setSelectedDistrict(district);
    // console.log("districts", selectedDistrict());
    setAddressLine(restOfAddress);
  };

  createEffect(() => {
    setFormData({
      ...props.initialEmployerData,
      employerPhoto: props.initialEmployerData.employerPhoto || null,
    });
    parseAddress(props.initialEmployerData.address);
  });

  createEffect(() => {
    const city = selectedCity();
    if (city) {
      setDistricts(areaData[city as keyof typeof areaData]);
    } else {
      setDistricts([]);
      setSelectedDistrict('');
    }
  });

  createEffect(() => {
    const fullAddress = `${selectedCity()}${selectedDistrict()}${addressLine()}`;
    if (fullAddress !== formData().address) {
      setFormData(prev => ({ ...prev, address: fullAddress }));
      setHaveChanges(true);
    }
  });

  createEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isCityDropdownOpen() && cityDropdownRef && !cityDropdownRef.contains(e.target as Node)) {
        setIsCityDropdownOpen(false);
      }
      if (isDistrictDropdownOpen() && districtDropdownRef && !districtDropdownRef.contains(e.target as Node)) {
        setIsDistrictDropdownOpen(false);
      }
      if (isIndustryDropdownOpen() && industryDropdownRef && !industryDropdownRef.contains(e.target as Node)) {
        setIsIndustryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside);
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
    setHaveChanges(true);
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
      parseAddress(props.initialEmployerData.address);
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
        averageRating={formData().ratingStats.averageRating}
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
          <div class="relative" ref={industryDropdownRef}>
            <button
              type="button"
              class={`${selectClass} w-full flex justify-between items-center text-left`}
              onClick={() => setIsIndustryDropdownOpen(!isIndustryDropdownOpen())}
            >
              <span class="truncate">{formData().industryType || '選擇產業類型'}</span>
              <svg class="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isIndustryDropdownOpen() && (
              <div class="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-300">
                <ul class="py-1">
                  <For each={industryTypes}>{(type) =>
                    <li
                      class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, industryType: type }));
                        setHaveChanges(true);
                        setIsIndustryDropdownOpen(false);
                      }}
                    >
                      {type}
                    </li>
                  }</For>
                </ul>
              </div>
            )}
          </div>
        </div>
        {/* 手機號碼 */}
        <div>
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
      </div>

      <div class="mb-6">
        <label for="address" class={labelClass}>地址</label>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* City Dropdown */}
          <div class="relative" ref={cityDropdownRef}>
            <button
              type="button"
              class={`${selectClass} w-full flex justify-between items-center text-left`}
              onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen())}
            >
              <span class="truncate">{selectedCity() || '選擇城市'}</span>
              <svg class="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isCityDropdownOpen() && (
              <div class="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-300">
                <ul class="py-1">
                  <For each={Object.keys(areaData)}>{(city) =>
                    <li
                      class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setSelectedCity(city);
                        setIsCityDropdownOpen(false);
                        setSelectedDistrict('');
                      }}
                    >
                      {city}
                    </li>
                  }</For>
                </ul>
              </div>
            )}
          </div>

          {/* District Dropdown */}
          <div class="relative" ref={districtDropdownRef}>
            <button
              type="button"
              class={`${selectClass} w-full flex justify-between items-center text-left disabled:cursor-not-allowed disabled:bg-gray-200`}
              onClick={() => selectedCity() && setIsDistrictDropdownOpen(!isDistrictDropdownOpen())}
              disabled={!selectedCity()}
            >
              <span class="truncate">{selectedDistrict() || '選擇區域'}</span>
              <svg class="w-4 h-4 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isDistrictDropdownOpen() && (
              <div class="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-300">
                <ul class="py-1">
                  <For each={districts()}>{(district) =>
                    <li
                      class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setSelectedDistrict(district);
                        setIsDistrictDropdownOpen(false);
                      }}
                    >
                      {district}
                    </li>
                  }</For>
                </ul>
              </div>
            )}
          </div>

          <input
            type="text"
            id="addressLine"
            name="addressLine"
            value={addressLine()}
            onInput={(e) => setAddressLine(e.currentTarget.value)}
            class={inputClass}
            placeholder="街道巷弄門牌號碼"
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