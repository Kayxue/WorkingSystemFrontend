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
  
  // Changed to handle requirements as JSON object
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
  
  // Track deleted existing photos
  const [deletedPhotoIds, setDeletedPhotoIds] = createSignal<string[]>([]);

  // For handling skills as tags
  const [skillInput, setSkillInput] = createSignal("");

  const MAX_FILES = 3;
  const MAX_SIZE_MB = 2;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Validate date selection
  const handleDateStartChange = (value: string) => {
    setError("");
    setDateStart(value);
    
    // If end date is before the new start date, reset it
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

  // Load area data
  createEffect(async () => {
    try {
      setAreaData(areaDataJson);
    } catch (err) {
      console.error("Error loading area data", err);
    }
  });

  // Update district list when city changes
  createEffect(() => {
    const selectedCity = city();
    if (selectedCity && areaData()[selectedCity]) {
      setDistrictList(areaData()[selectedCity]);
    } else {
      setDistrictList([]);
      setDistrict("");
    }
  });

  // Initialize gigId from URL params
  createEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("gigId");
    setGigId(id);
  });

  // Fetch gig data when gigId is available
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

      // Set form data
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

      // Set existing photos if available - check both possible property names
      const photosArray = data.photos || data.environmentPhotos;
      if (photosArray && Array.isArray(photosArray)) {
        const photoArray = photosArray.map((photo: any, index: number) => {
          // Handle different possible photo object structures
          const photoId = photo.id || photo._id || photo.photoId || `photo_${index}`;
          const photoUrl = photo.url || photo.path || photo.src;
          const photoName = photo.filename || photo.name || photo.originalName || `photo_${index}.jpg`;
          
          console.log("Processing photo:", photo); // Debug log
          
          return {
            id: photoId,
            url: photoUrl,
            filename: photoName
          };
        }).filter(photo => photo.url); // Only include photos with valid URLs
        
        console.log("Setting existing photos:", photoArray); // Debug log
        setExistingPhotos(photoArray);
      } else {
        console.log("No photos found in response. Checked data.photos:", data.photos, "and data.environmentPhotos:", data.environmentPhotos); // Debug log
        setExistingPhotos([]);
      }

    } catch (e) {
      console.error("Fetch error:", e);
      setError("取得資料時發生錯誤，請稍後再試");
    } finally {
      setIsFetching(false);
    }
  });

  // Handle requirements updates
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
    // Add to deleted photos list
    setDeletedPhotoIds(current => [...current, photoId]);
    // Remove from existing photos display
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

    setIsLoading(true);

    const id = gigId();
    if (!id) {
      setError("無效的職缺ID，無法更新");
      setIsLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title().trim());
      formData.append("dateStart", dateStart());
      formData.append("dateEnd", dateEnd());
      formData.append("timeStart", timeStart());
      formData.append("timeEnd", timeEnd());
      formData.append("hourlyRate", hourlyRate().toString());
      formData.append("city", city());
      formData.append("district", district());
      formData.append("address", address().trim());
      formData.append("description", description().trim());
      
      // Send requirements as JSON string
      formData.append("requirements", JSON.stringify(requirements()));
      
      formData.append("contactPerson", contactPerson().trim());
      formData.append("contactPhone", contactPhone().trim());
      formData.append("contactEmail", contactEmail().trim());
      formData.append("publishedAt", new Date().toISOString());

      // Add new photos
      files().forEach(filePreview => {
        formData.append('environmentPhotos', filePreview.file);
      });

      // Include photo management info for existing photos
      if (deletedPhotoIds().length > 0) {
        formData.append("deletedPhotoIds", JSON.stringify(deletedPhotoIds()));
      }
      if (existingPhotos().length > 0) {
        formData.append("keepPhotoIds", JSON.stringify(existingPhotos().map(photo => photo.id)));
      }

      console.log("Submitting FormData for update");

      const response = await fetch(`/api/gig/${id}`, {
        method: "PUT",
        headers: {
          "platform": "web-employer",
        },
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        setSuccess(true);
        alert("Changes saved successfully!");
        window.location.href = "/dashboard";
      } else {
        const result = await response.json().catch(() => ({}));
        console.error("API Error Details:", {
          status: response.status,
          statusText: response.statusText,
          body: result
        });
        setError(result.message || result.error || `Update failed (${response.status}): ${response.statusText}`);
      }

      // If there are new files to upload, handle them separately
      if (files().length > 0) {
        const formData = new FormData();
        files().forEach(filePreview => {
          formData.append('environmentPhotos', filePreview.file);
        });

        const fileResponse = await fetch(`/api/gig/${id}/photos`, {
          method: "POST",
          headers: {
            "platform": "web-employer",
          },
          credentials: "include",
          body: formData,
        });

        if (!fileResponse.ok) {
          const fileResult = await fileResponse.json().catch(() => ({}));
          console.warn("Photo upload failed:", fileResult);
          // Don't fail the entire update if photos fail
          setError("Job updated but photo upload failed. Please try uploading photos again.");
          return;
        }
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
        <span class={styles.headerTitle}>Edit Job</span>
      </div>

      <Show when={isFetching()}>
        <div class={styles.loadingMessage}>載入中...</div>
      </Show>

      <Show when={!isFetching()}>
        <form class={styles.postjobFormWrapper} onSubmit={handleSubmit}>
          {/* 1. Title Section */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Job Title
            </h3>
            <label class={styles.postjobLabel}>
              <span>Title <span class={styles.required}>*</span></span>
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
              Schedule
            </h3>
            <div class={styles.postjobRow}>
              <label class={styles.postjobRowLabel}>
                <span>Start Date <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="date"
                  value={dateStart()}
                  onInput={(e) => handleDateStartChange(e.currentTarget.value)}
                  required
                />
              </label>
              <label class={styles.postjobRowLabel}>
                <span>End Date <span class={styles.required}>*</span></span>
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
                <span>Start Time <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="time"
                  value={timeStart()}
                  onInput={(e) => setTimeStart(e.currentTarget.value)}
                  required
                />
              </label>
              <label class={styles.postjobRowLabel}>
                <span>End Time <span class={styles.required}>*</span></span>
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
              Compensation
            </h3>
            <label class={styles.postjobLabel}>
              <span>Hourly Rate (TWD) <span class={styles.required}>*</span></span>
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
              Location
            </h3>
            <div class={styles.postjobRow}>
              <label class={styles.postjobRowLabel}>
                <span>City <span class={styles.required}>*</span></span>
                <select
                  class={styles.postjobSelect}
                  value={city()}
                  onInput={(e) => setCity(e.currentTarget.value)}
                  required
                >
                  <option value="">Select City</option>
                  {Object.keys(areaData()).map((cityName) => (
                    <option value={cityName}>{cityName}</option>
                  ))}
                </select>
              </label>

              <label class={styles.postjobRowLabel}>
                <span>District <span class={styles.required}>*</span></span>
                <select
                  class={styles.postjobSelect}
                  value={district()}
                  onInput={(e) => setDistrict(e.currentTarget.value)}
                  required
                  disabled={!districtList().length}
                >
                  <option value="">Select District</option>
                  {districtList().map((dist) => (
                    <option value={dist}>{dist}</option>
                  ))}
                </select>
              </label>
            </div>

            <label class={styles.postjobLabel}>
              <span>Address <span class={styles.required}>*</span></span>
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
              Job Description
            </h3>
            <label class={styles.postjobLabel}>
              <span>Description <span class={styles.required}>*</span></span>
              <textarea
                class={styles.postjobTextarea}
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                rows={4}
                required
              />
            </label>
          </div>

          {/* 6. Job Requirements Section - JSON */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
              Job Requirements
            </h3>
            
            {/* Experience Field */}
            <div class={styles.requirementField}>
              <label class={styles.postjobLabel}>
                <span>Experience <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="text"
                  value={requirements().experience}
                  onInput={(e) => updateRequirementExperience(e.currentTarget.value)}
                  required
                />
              </label>
            </div>

            {/* Skills Field */}
            <div class={styles.requirementField}>
              <label class={styles.postjobLabel}>
                <span>Required Skills <span class={styles.required}>*</span></span>
                
                <div class={styles.skillsContainer}>
                  {/* Skill Input */}
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
                          placeholder="Add a skill"
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
                      💡 Press <kbd class={styles.kbd}>Enter</kbd> or click Add to include this skill
                    </div>
                  </div>

                  {/* Skills Display */}
                  <Show when={requirements().skills.length > 0}>
                    <div class={styles.skillsDisplay}>
                      <div class={styles.skillsHeader}>
                        <svg class={styles.skillsHeaderIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                        </svg>
                        <span class={styles.skillsHeaderText}>
                          {requirements().skills.length} skill{requirements().skills.length !== 1 ? 's' : ''} added
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
                                title={`Remove ${skill}`}
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
                  
                  {/* Empty State */}
                  <Show when={requirements().skills.length === 0}>
                    <div class={styles.skillsEmptyState}>
                      <div class={styles.emptyStateIcon}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                      </div>
                      <p class={styles.emptyStateText}>No skills added yet</p>
                      <p class={styles.emptyStateSubtext}>Add at least one skill requirement to continue</p>
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
              Environment Photos
            </h3>

            <div class={styles.fileUploadSection}>
              <label class={styles.postjobLabel}>
                <span>Workplace Photos <span class={styles.fileHint}>(Max: {MAX_FILES} photos, {MAX_SIZE_MB}MB each)</span></span>
              </label>
              
              {/* Show upload area only if we haven't reached the limit */}
              <Show when={totalPhotos() < MAX_FILES}>
                <div class={styles.uploadArea}>
                  <label for="file-upload" class={styles.uploadBox}>
                    <div class={styles.uploadContent}>
                      <svg class={styles.uploadIcon} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p class={styles.uploadText}><span class={styles.uploadBold}>Click to add photo</span></p>
                      <p class={styles.uploadSubtext}>JPG, PNG (Max: {MAX_SIZE_MB}MB)</p>
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

              {/* Photo grid showing existing and new photos */}
              <Show when={totalPhotos() > 0}>
                <div class={styles.fileGrid}>
                  {/* Display existing photos first */}
                  <For each={existingPhotos()}>
                    {(photo) => (
                      <div class={styles.filePreview}>
                        <img src={photo.url} alt="Existing workplace photo" class={styles.previewImage} />
                        <p class={styles.fileName} title={photo.filename}>{photo.filename}</p>
                        <button 
                          onClick={() => handleExistingPhotoDelete(photo.id)} 
                          type="button" 
                          class={styles.deleteButton}
                          title="Remove photo"
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </For>

                  {/* Display new files */}
                  <For each={files()}>
                    {(filePreview, index) => (
                      <div class={styles.filePreview}>
                        <img src={filePreview.url} alt="New workplace photo" class={styles.previewImage} />
                        <p class={styles.fileName} title={filePreview.file.name}>{filePreview.file.name}</p>
                        <button 
                          onClick={() => handleFileDelete(index())} 
                          type="button" 
                          class={styles.deleteButton}
                          title="Remove photo"
                        >
                          &times;
                        </button>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>

          {/* 8. Contact Information Section */}
          <div class={styles.formSection}>
            <h3 class={styles.sectionTitle}>
              <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Contact Information
            </h3>
            <div class={styles.postjobRow}>
              <label class={styles.postjobRowLabel}>
                <span>Contact Person <span class={styles.required}>*</span></span>
                <input
                  class={styles.postjobInput}
                  type="text"
                  value={contactPerson()}
                  onInput={(e) => setContactPerson(e.currentTarget.value)}
                  required
                />
              </label>
              <label class={styles.postjobRowLabel}>
                <span>Contact Phone <span class={styles.required}>*</span></span>
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
              <span>Contact Email <span class={styles.required}>*</span></span>
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
          <button class={styles.postjobBtn} type="submit" disabled={isLoading()}>
            {isLoading() ? "更新中..." : "Update Job"}
          </button>
        </form>
      </Show>
    </div>
  );
}