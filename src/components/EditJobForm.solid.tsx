import { createSignal, Show, createEffect, onCleanup, For } from "solid-js";
import styles from '../styles/PostJobForm.module.css';
import areaDataJson from '../static/AreaData.json';

interface FilePreview {
  file: File;
  url: string;
}

interface Requirements {
  experience: string;
  skills: string[];
}

interface ExistingPhoto {
  id: string;
  url: string;
  filename: string;
}

const [gigId, setGigId] = createSignal<string | null>(null);

export default function EditJobForm() {
  const [title, setTitle] = createSignal("");
  const [dateStart, setDateStart] = createSignal("");
  const [dateEnd, setDateEnd] = createSignal("");
  const [timeStart, setTimeStart] = createSignal("");
  const [timeEnd, setTimeEnd] = createSignal("");
  const [hourlyRate, setHourlyRate] = createSignal(0);
  const [city, setCity] = createSignal("");
  const [district, setDistrict] = createSignal("");
  const [address, setAddress] = createSignal("");
  const [description, setDescription] = createSignal("");
  
  const [requirements, setRequirements] = createSignal<Requirements>({
    experience: "",
    skills: []
  });
  
  const [contactPerson, setContactPerson] = createSignal("");
  const [contactPhone, setContactPhone] = createSignal("");
  const [contactEmail, setContactEmail] = createSignal("");
  const [files, setFiles] = createSignal<FilePreview[]>([]);

  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isFetching, setIsFetching] = createSignal(false);

  const [areaData, setAreaData] = createSignal<Record<string, string[]>>({});
  const [districtList, setDistrictList] = createSignal<string[]>([]);
  const [existingPhotos, setExistingPhotos] = createSignal<ExistingPhoto[]>([]);
  const [previewImage, setPreviewImage] = createSignal<string | null>(null);
  const [deletedPhotoNames, setDeletedPhotoNames] = createSignal<string[]>([]);
  const [skillInput, setSkillInput] = createSignal("");
  const [originalData, setOriginalData] = createSignal<any>({});

  const MAX_FILES = 3;
  const MAX_SIZE_MB = 2;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const deepEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== typeof obj2) return false;
    
    if (typeof obj1 === 'object') {
      if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
      
      if (Array.isArray(obj1)) {
        if (obj1.length !== obj2.length) return false;
        return obj1.every((item, index) => deepEqual(item, obj2[index]));
      }
      
      const keys1 = Object.keys(obj1);
      const keys2 = Object.keys(obj2);
      if (keys1.length !== keys2.length) return false;
      
      return keys1.every(key => deepEqual(obj1[key], obj2[key]));
    }
    
    return false;
  };

  const getChangedFields = () => {
    const current = {
      title: title().trim(),
      dateStart: dateStart(),
      dateEnd: dateEnd(),
      timeStart: timeStart(),
      timeEnd: timeEnd(),
      hourlyRate: hourlyRate(),
      city: city(),
      district: district(),
      address: address().trim(),
      description: description().trim(),
      requirements: requirements(),
      contactPerson: contactPerson().trim(),
      contactPhone: contactPhone().trim(),
      contactEmail: contactEmail().trim()
    };

    const original = originalData();
    const changedFields: any = {};

    const fieldPairs = [
      ['dateStart', 'dateEnd'],
      ['timeStart', 'timeEnd'],
      ['city', 'district']
    ];

    Object.keys(current).forEach(key => {
      if (!deepEqual(current[key], original[key])) {
        changedFields[key] = current[key];
      }
    });

    // If one field in a pair changed, include both fields
    fieldPairs.forEach(pair => {
      const [field1, field2] = pair;
      if (changedFields[field1] || changedFields[field2]) {
        changedFields[field1] = current[field1];
        changedFields[field2] = current[field2];
      }
    });

    return changedFields;
  };

  const hasChanges = () => {
    const changedFields = getChangedFields();
    const hasFieldChanges = Object.keys(changedFields).length > 0;
    const hasPhotoChanges = files().length > 0 || deletedPhotoNames().length > 0;
    return hasFieldChanges || hasPhotoChanges;
  };

  const handleDateStartChange = (value: string) => {
    setError("");
    setDateStart(value);
    
    if (dateEnd() && dateEnd() < value) {
      setDateEnd("");
    }
  };

  const handleDateEndChange = (value: string) => {
    const startDate = dateStart();
    
    if (startDate && value < startDate) {
      setError("End date cannot be before start date.");
      return;
    }
    setError("");
    setDateEnd(value);
  };

  createEffect(async () => {
    try {
      setAreaData(areaDataJson);
    } catch (err) {
      console.error("Error loading area data", err);
    }
  });

  createEffect(() => {
    const selectedCity = city();
    if (selectedCity && areaData()[selectedCity]) {
      setDistrictList(areaData()[selectedCity]);
    } else {
      setDistrictList([]);
      setDistrict("");
    }
  });

  createEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("gigId");
    setGigId(id);
  });

  createEffect(async () => {
    const id = gigId();
    if (!id) {
      setError("無效的職缺ID");
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    setError("");
    
    try {
      const res = await fetch(`/api/gig/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "取得職缺資料失敗");
        setIsFetching(false);
        return;
      }

      const data = await res.json();
      console.log(data);

      setTitle(data.title || "");
      setDateStart(data.dateStart ? data.dateStart.slice(0, 10) : "");
      setDateEnd(data.dateEnd ? data.dateEnd.slice(0, 10) : "");
      setTimeStart(data.timeStart || "");
      setTimeEnd(data.timeEnd || "");
      setHourlyRate(data.hourlyRate || 0);
      setCity(data.city || "");
      setDistrict(data.district || "");
      setAddress(data.address || "");
      setDescription(data.description || "");
      setRequirements({
        experience: data.requirements?.experience || "",
        skills: data.requirements?.skills || []
      });
      setContactPerson(data.contactPerson || "");
      setContactPhone(data.contactPhone || "");
      setContactEmail(data.contactEmail || "");

      setOriginalData({
        title: data.title || "",
        dateStart: data.dateStart ? data.dateStart.slice(0, 10) : "",
        dateEnd: data.dateEnd ? data.dateEnd.slice(0, 10) : "",
        timeStart: data.timeStart || "",
        timeEnd: data.timeEnd || "",
        hourlyRate: data.hourlyRate || 0,
        city: data.city || "",
        district: data.district || "",
        address: data.address || "",
        description: data.description || "",
        requirements: {
          experience: data.requirements?.experience || "",
          skills: data.requirements?.skills || []
        },
        contactPerson: data.contactPerson || "",
        contactPhone: data.contactPhone || "",
        contactEmail: data.contactEmail || ""
      });

      const photosArray = data.photos || data.environmentPhotos;
      if (photosArray && Array.isArray(photosArray)) {
        const photoArray = photosArray.map((photo: any, index: number) => {
          const photoId = photo.id || photo._id || photo.photoId || `photo_${index}`;
          const photoUrl = photo.url || photo.path || photo.src;
          const photoName = photo.filename || photo.name || photo.originalName || `photo_${index}.jpg`;
          
          return {
            id: photoId,
            url: photoUrl,
            filename: photoName
          };
        }).filter(photo => photo.url);
        
        setExistingPhotos(photoArray);
      } else {
        setExistingPhotos([]);
      }

    } catch (e) {
      console.error("Fetch error:", e);
      setError("取得資料時發生錯誤，請稍後再試");
    } finally {
      setIsFetching(false);
    }
  });

  const updateRequirementExperience = (experience: string) => {
    setRequirements(prev => ({ ...prev, experience }));
  };

  const addSkill = () => {
    const skill = skillInput().trim();
    if (skill && !requirements().skills.includes(skill)) {
      setRequirements(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setRequirements(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSkillInputKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (!input.files) return;

    setError('');
    const newFiles = Array.from(input.files);
    const totalFiles = files().length + existingPhotos().length + newFiles.length;

    if (totalFiles > MAX_FILES) {
      setError(`最多只能上傳 ${MAX_FILES} 個文件。`);
      return;
    }

    const validFiles = newFiles.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`文件格式無效: ${file.name}. 只接受 JPG, PNG.`);
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
    URL.revokeObjectURL(fileToDelete.url);
    setFiles(current => current.filter((_, i) => i !== index));
  };

  const handleExistingPhotoDelete = (photoId: string) => {
    const photoToDelete = existingPhotos().find(photo => photo.id === photoId);
    if (photoToDelete) {
      setDeletedPhotoNames(current => [...current, photoToDelete.filename]);
    }
    setExistingPhotos(current => current.filter(photo => photo.id !== photoId));
  };
  
  onCleanup(() => {
    files().forEach(file => URL.revokeObjectURL(file.url));
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    
    const today = getTodayDate();

    // Validation
    if (dateEnd() < today) {
      setError("End date cannot be in the past. Please select today or a future date.");
      return;
    }

    if (dateEnd() && dateEnd() < dateStart()) {
      setError("End date cannot be before start date. Please select an end date that is the same or after the start date.");
      return;
    }

    if (!requirements().experience.trim()) {
      setError("Experience is required.");
      return;
    }

    if (requirements().skills.length === 0) {
      setError("At least one skill is required.");
      return;
    }

    // Validate required fields
    if (!title().trim() || !dateStart() || !dateEnd() || !timeStart() || !timeEnd() || 
        !city() || !district() || !address().trim() || !description().trim() || 
        !contactPerson().trim() || !contactPhone().trim() || !contactEmail().trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (hourlyRate() <= 0) {
      setError("Hourly rate must be greater than 0.");
      return;
    }

    // Check if there are any changes to submit
    if (!hasChanges()) {
      setError("No changes detected. Please modify at least one field before updating.");
      return;
    }

    setIsLoading(true);

    const id = gigId();
    if (!id) {
      setError("無效的職缺ID，無法更新");
      setIsLoading(false);
      return;
    }

    try {
      const changedFields = getChangedFields();
      const formData = new FormData();
      
      // Append all changed fields
      Object.entries(changedFields).forEach(([key, value]) => {
        if (key === 'requirements') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      // Add new photos
      if (files().length > 0) {
        files().forEach(filePreview => {
          formData.append('environmentPhotos', filePreview.file);
        });
      }

      // Add deleted photo names
      if (deletedPhotoNames().length > 0) {
        formData.append("deletedPhotoFiles", JSON.stringify(deletedPhotoNames()));
      }

      // Add existing photo names to keep
      if (existingPhotos().length > 0) {
        const keepPhotoNames = existingPhotos().map(photo => {
          // Extract filename from URL or use the name property
          if (typeof photo === 'string') {
            return photo.includes('/') ? photo.split('/').pop() : photo;
          }
          return photo.name || photo.url?.split('/').pop();
        });
        formData.append("keepPhotoNames", JSON.stringify(keepPhotoNames));
      }

      const response = await fetch(`/api/gig/${id}`, {
        method: "PUT",
        headers: {
          "platform": "web-employer",
        },
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        console.error("API Error Details:", {
          status: response.status,
          statusText: response.statusText,
          body: result
        });
        setError(result.message || result.error || `Update failed (${response.status}): ${response.statusText}`);
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      alert("Changes saved successfully!");
      window.location.href = "/dashboard";

    } catch (err) {
      console.error("Submit error:", err);
      setError("發生錯誤，請檢查網路或稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  const totalPhotos = () => existingPhotos().length + files().length;

  return (
    <div class={styles.postjobContainer}>
      <div class={styles.headerSection}>
        <button 
          type="button" 
          class={styles.backButton}
          onClick={() => window.history.back()}
        >
          <svg class={styles.backIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <span class={styles.headerTitle}>編輯職位</span>
      </div>

      <Show when={isFetching()}>
        <div class={styles.loadingMessage}>載入中...</div>
      </Show>

      <Show when={!isFetching()}>
        <form class={styles.postjobFormWrapper} onSubmit={handleSubmit}>
          {/* Show changes indicator */}
          <Show when={hasChanges()}>
            <div class={styles.changesIndicator || "changes-indicator"} style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 12px; margin-bottom: 16px; color: #1976d2;">
              <svg style="width: 16px; height: 16px; display: inline-block; margin-right: 8px;" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
              </svg>
              您有未儲存的更改
            </div>
          </Show>

          {/* 1. Title Section */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              職位名稱
            </h3>
            <label class={styles.postjobLabel}>
              <span>職位名稱 <span class={styles.required}>*</span></span>
              <input
                class={styles.postjobInput}
                type="text"
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
                required
              />
            </label>
          </div>

          {/* 2. Time Section */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              工作時間
            </h3>
            <div class={styles.postjobRow}>
              <label class={styles.postjobRowLabel}>
                <span>開始日期 <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="date"
                  value={dateStart()}
                  onInput={(e) => handleDateStartChange(e.currentTarget.value)}
                  required
                />
              </label>
              <label class={styles.postjobRowLabel}>
                <span>結束日期 <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="date"
                  value={dateEnd()}
                  onInput={(e) => handleDateEndChange(e.currentTarget.value)}
                  required
                />
              </label>
            </div>

            <div class={styles.postjobRow}>
              <label class={styles.postjobRowLabel}>
                <span>開始時間 <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="time"
                  value={timeStart()}
                  onInput={(e) => setTimeStart(e.currentTarget.value)}
                  required
                />
              </label>
              <label class={styles.postjobRowLabel}>
                <span>結束時間 <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="time"
                  value={timeEnd()}
                  onInput={(e) => setTimeEnd(e.currentTarget.value)}
                  required
                />
              </label>
            </div>
          </div>

          {/* 3. Hourly Rate Section */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
              </svg>
              薪資
            </h3>
            <label class={styles.postjobLabel}>
              <span>時薪（新台幣） <span class={styles.required}>*</span></span>
              <input
                class={styles.postjobInput}
                type="number"
                value={hourlyRate()}
                onInput={(e) => setHourlyRate(parseInt(e.currentTarget.value) || 0)}
                min="0"
                required
              />
            </label>
          </div>

          {/* 4. Location Section */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              工作地點
            </h3>
            <div class={styles.postjobRow}>
              <label class={styles.postjobRowLabel}>
                <span>縣市 <span class={styles.required}>*</span></span>
                <select
                  class={styles.postjobSelect}
                  value={city()}
                  onInput={(e) => setCity(e.currentTarget.value)}
                  required
                >
                  <option value="">選擇縣市</option>
                  {Object.keys(areaData()).map((cityName) => (
                    <option value={cityName}>{cityName}</option>
                  ))}
                </select>
              </label>

              <label class={styles.postjobRowLabel}>
                <span>區域 <span class={styles.required}>*</span></span>
                <select
                  class={styles.postjobSelect}
                  value={district()}
                  onInput={(e) => setDistrict(e.currentTarget.value)}
                  required
                  disabled={!districtList().length}
                >
                  <option value="">選擇區域</option>
                  {districtList().map((dist) => (
                    <option value={dist}>{dist}</option>
                  ))}
                </select>
              </label>
            </div>

            <label class={styles.postjobLabel}>
              <span>地址 <span class={styles.required}>*</span></span>
              <input
                class={styles.postjobInput}
                type="text"
                value={address()}
                onInput={(e) => setAddress(e.currentTarget.value)}
                required
              />
            </label>
          </div>

          {/* 5. Job Description Section */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              工作說明
            </h3>
            <label class={styles.postjobLabel}>
              <span>工作說明 <span class={styles.required}>*</span></span>
              <textarea
                class={styles.postjobTextarea}
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                rows={4}
                required
              />
            </label>
          </div>

          {/* 6. Job Requirements Section */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
              職位要求
            </h3>
            
            <div class={styles.requirementField}>
              <label class={styles.postjobLabel}>
                <span>經驗要求 <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="text"
                  value={requirements().experience}
                  onInput={(e) => updateRequirementExperience(e.currentTarget.value)}
                  required
                />
              </label>
            </div>

            <div class={styles.requirementField}>
              <label class={styles.postjobLabel}>
                <span>技能要求 <span class={styles.required}>*</span></span>
                
                <div class={styles.skillsContainer}>
                  <div class={styles.skillInputSection}>
                    <div class={styles.skillInputWrapper}>
                      <div class={styles.skillInputBox}>
                        <svg class={styles.skillInputIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                        </svg>
                        <input
                          class={styles.skillInput}
                          type="text"
                          value={skillInput()}
                          onInput={(e) => setSkillInput(e.currentTarget.value)}
                          onKeyPress={handleSkillInputKeyPress}
                          placeholder="新增技能"
                        />
                      </div>
                      <button
                        type="button"
                        class={`${styles.addSkillButton} ${!skillInput().trim() ? styles.addSkillButtonDisabled : ''}`}
                        onClick={addSkill}
                        disabled={!skillInput().trim()}
                      >
                        <svg class={styles.addButtonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Add
                      </button>
                    </div>
                    
                    <div class={styles.skillInputHint}>
                      💡 按 <kbd class={styles.kbd}>Enter</kbd> 或點擊新增來加入此技能
                    </div>
                  </div>

                  <Show when={requirements().skills.length > 0}>
                    <div class={styles.skillsDisplay}>
                      <div class={styles.skillsHeader}>
                        <svg class={styles.skillsHeaderIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                        </svg>
                        <span class={styles.skillsHeaderText}>
                          已新增 {requirements().skills.length} 項技能
                        </span>
                      </div>
                      
                      <div class={styles.skillTags}>
                        <For each={requirements().skills}>
                          {(skill, index) => (
                            <div class={`${styles.skillTag} ${styles.skillTagAnimated}`}>
                              <span class={styles.skillTagText}>{skill}</span>
                              <button
                                type="button"
                                class={styles.removeSkillButton}
                                onClick={() => removeSkill(skill)}
                                title={`移除 ${skill}`}
                              >
                                <svg class={styles.removeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>
                  
                  <Show when={requirements().skills.length === 0}>
                    <div class={styles.skillsEmptyState}>
                      <div class={styles.emptyStateIcon}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                      </div>
                      <p class={styles.emptyStateText}>尚未新增技能</p>
                      <p class={styles.emptyStateSubtext}>請至少新增一項技能要求才能繼續</p>
                    </div>
                  </Show>
                </div>
              </label>
            </div>
          </div>

          {/* 7. Environment Photos Section */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              環境照片
            </h3>

            <div class={styles.fileUploadSection}>
              <label class={styles.postjobLabel}>
                <span>工作環境照片 <span class={styles.fileHint}>(最多：{MAX_FILES} 張照片，每張 {MAX_SIZE_MB}MB)</span></span>
              </label>
              
              <Show when={totalPhotos() < MAX_FILES}>
                <div class={styles.uploadArea}>
                  <label for="file-upload" class={styles.uploadBox}>
                    <div class={styles.uploadContent}>
                      <svg class={styles.uploadIcon} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p class={styles.uploadText}><span class={styles.uploadBold}>點擊新增照片</span></p>
                      <p class={styles.uploadSubtext}>JPG、PNG（最大：{MAX_SIZE_MB}MB）</p>
                    </div>
                    <input 
                      id="file-upload" 
                      type="file" 
                      class={styles.hiddenInput} 
                      onChange={handleFileChange} 
                      accept={ALLOWED_EXTENSIONS.join(',')} 
                      multiple 
                    />
                  </label>
                </div>
              </Show>

              <Show when={totalPhotos() > 0}>
                <div class={styles.fileGrid}>
                  <For each={existingPhotos()}>
                    {(photo) => (
                      <div class={styles.filePreview}>
                        <img 
                          src={photo.url}
                          alt="現有工作場所照片"
                          class={styles.previewImage}
                          onClick={() => setPreviewImage(photo.url)}
                          style={{ cursor: 'pointer' }}
                        />
                        <p class={styles.fileName} title={photo.filename}>{photo.filename}</p>
                        <button 
                          onClick={() => handleExistingPhotoDelete(photo.id)} 
                          type="button" 
                          class={styles.deleteButton}
                          title="刪除照片"
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </For>

                  <For each={files()}>
                    {(filePreview, index) => (
                      <div class={styles.filePreview}>
                        {filePreview.file.type.startsWith('image/') ? (
                          <img 
                            src={filePreview.url} 
                            alt="預覽" 
                            class={styles.previewImage}
                            onClick={() => setPreviewImage(filePreview.url)}
                            style={{ cursor: 'pointer' }}
                          />
                        ) : (
                          <div class={styles.previewDocument}>
                            <svg class={styles.documentIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span class={styles.documentLabel}>文件</span>
                          </div>
                        )}
                        <p class={styles.fileName} title={filePreview.file.name}>{filePreview.file.name}</p>
                        <button 
                          onClick={() => handleFileDelete(index())} 
                          type="button" 
                          class={styles.deleteButton}
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </For>
                </div>

                <Show when={previewImage()}>
                  <div 
                    class={styles.modal} 
                    onClick={() => setPreviewImage(null)}
                  >
                    <div class={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                      <button 
                        class={styles.modalClose}
                        onClick={() => setPreviewImage(null)}
                        type="button"
                      >
                        ✕
                      </button>
                      <img 
                        src={previewImage()!} 
                        alt="照片預覽" 
                        class={styles.modalImage}
                      />
                    </div>
                  </div>
                </Show>
              </Show>
            </div>
          </div>

          {/* 8. Contact Information Section */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              聯絡資訊
            </h3>
            <div class={styles.postjobRow}>
              <label class={styles.postjobRowLabel}>
                <span>聯絡人 <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="text"
                  value={contactPerson()}
                  onInput={(e) => setContactPerson(e.currentTarget.value)}
                  required
                />
              </label>
              <label class={styles.postjobRowLabel}>
                <span>聯絡人電話 <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="tel"
                  value={contactPhone()}
                  onInput={(e) => setContactPhone(e.currentTarget.value)}
                  required
                />
              </label>
            </div>

            <label class={styles.postjobLabel}>
              <span>聯絡人電子郵件 <span class={styles.required}>*</span></span>
              <input
                class={styles.postjobInput}
                type="email"
                value={contactEmail()}
                onInput={(e) => setContactEmail(e.currentTarget.value)}
                required
              />
            </label>
          </div>

          {/* Error and Success Messages */}
          <Show when={error()}>
            <div class={styles.errorMessage}>{error()}</div>
          </Show>
          <Show when={success()}>
            <div class={styles.successMessage}>更新成功！</div>
          </Show>

          {/* Submit Button */}
          <button 
            class={`${styles.postjobBtn} ${!hasChanges() ? styles.postjobBtnDisabled || 'opacity-50 cursor-not-allowed' : ''}`} 
            type="submit" 
            disabled={isLoading() || !hasChanges()}
          >
            {isLoading() ? "更新中..." : hasChanges() ? "更新" : "無需儲存任何更改"}
          </button>
        </form>
      </Show>
    </div>
  );
}