import { createSignal, createEffect, onCleanup, Show, For } from "solid-js";
import styles from '../styles/PostJobForm.module.css';
import areaDataJson from '../static/AreaData.json';


interface FilePreview {
  file: File;
  url: string;
}

export default function PostJobForm() {
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
  const [requirements, setRequirements] = createSignal("");
  const [contactPerson, setContactPerson] = createSignal("");
  const [contactPhone, setContactPhone] = createSignal("");
  const [contactEmail, setContactEmail] = createSignal("");
  const [files, setFiles] = createSignal<FilePreview[]>([]);

  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);

  const [areaData, setAreaData] = createSignal<Record<string, string[]>>({});
  const [districtList, setDistrictList] = createSignal<string[]>([]);

  const MAX_FILES = 3;
  const MAX_SIZE_MB = 2;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png"];

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
      setDistrict("");
    } else {
      setDistrictList([]);
    }
  });

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
  
  onCleanup(() => {
    files().forEach(file => URL.revokeObjectURL(file.url));
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title());
      formData.append("dateStart", dateStart());
      formData.append("dateEnd", dateEnd());
      formData.append("timeStart", timeStart());
      formData.append("timeEnd", timeEnd());
      formData.append("hourlyRate", hourlyRate().toString());
      formData.append("city", city());
      formData.append("district", district());
      formData.append("address", address());
      formData.append("description", description());
      formData.append("requirements", requirements());
      formData.append("contactPerson", contactPerson());
      formData.append("contactPhone", contactPhone());

      files().forEach(filePreview => {
        formData.append('environmentPhotos', filePreview.file);
      });

      formData.append("contactEmail", contactEmail());
      formData.append("publishedAt", new Date().toISOString());

      const response = await fetch("/api/gig/create", {
        method: "POST",
        headers: {
          "platform": "web-employer",
        },
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        setSuccess(true);
        alert("Job posted successfully");
        window.location.href = "/dashboard";
      } else {
        const result = await response.json().catch(() => ({}));
        setError(result.message || "發佈失敗，請稍後再試。");
      }
    } catch (err) {
      setError("發生錯誤，請檢查網路或稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

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
        <span class={styles.headerTitle}>New Job</span>
      </div>

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
                onInput={(e) => setDateStart(e.currentTarget.value)}
                required
              />
            </label>
            <label class={styles.postjobRowLabel}>
              <span>End Date <span class={styles.required}>*</span></span>
              <input
                class={styles.postjobInput}
                type="date"
                value={dateEnd()}
                onInput={(e) => setDateEnd(e.currentTarget.value)}
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

        {/* 5. Job Information Section */}
        <div class={styles.formSection}>
          <h3 class={styles.sectionTitle}>
            <svg class={styles.sectionIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Job Information
          </h3>
          <label class={styles.postjobLabel}>
            <span>Job Description <span class={styles.required}>*</span></span>
            <textarea
              class={styles.postjobTextarea}
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
              rows={5}
            />
          </label>

          <label class={styles.postjobLabel}>
            <span>Job Requirements <span class={styles.required}>*</span></span>
            <input
              class={styles.postjobInput}
              type="text"
              value={requirements()}
              onInput={(e) => setRequirements(e.currentTarget.value)}
            />
          </label>

          <div class={styles.fileUploadSection}>
            <label class={styles.postjobLabel}>
              <span>Environment Photos <span class={styles.fileHint}>(Max: {MAX_FILES} photos, {MAX_SIZE_MB}MB each)</span></span>
            </label>
            
            {files().length < MAX_FILES && (
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
            )}

            <div class={styles.fileGrid}>
              <For each={files()}>
                {(filePreview, index) => (
                  <div class={styles.filePreview}>
                    {filePreview.file.type.startsWith('image/') ? (
                      <img src={filePreview.url} alt="Preview" class={styles.previewImage} />
                    ) : (
                      <div class={styles.previewDocument}>
                        <svg class={styles.documentIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <span class={styles.documentLabel}>Document</span>
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
          </div>
        </div>

        {/* 6. Contact Information Section */}
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

        <Show when={error()}>
          <div class={styles.errorMessage}>{error()}</div>
        </Show>
        <Show when={success()}>
          <div class={styles.successMessage}>發布成功！</div>
        </Show>

        <button class={styles.postjobBtn} type="submit" disabled={isLoading()}>
          {isLoading() ? "發布中..." : "Post Job"}
        </button>
      </form>
    </div>
  );
}