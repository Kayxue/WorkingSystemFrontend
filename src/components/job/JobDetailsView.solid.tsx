import { createResource, createSignal, For, Show, onMount, onCleanup } from "solid-js";
import type { Component, Resource } from "solid-js";
import styles from "../../styles/JobDetails.module.css";

type JobData = {
  gigId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  hourlyRate: string;
  address: string;
  district: string;
  city: string;
  description: any;
  requirements: any;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  publishedAt: string;
  unlistedAt?: string;
  environmentPhotos?: (string | { url: string })[];
  status: string;
};

interface JobDetailsViewProps {
  gigId: string;
  sharedJobData?: Resource<JobData>; // 可選：從父元件傳入的共用資料
}

async function fetchJobData(gigId: string): Promise<JobData> {
  const res = await fetch(`/api/gig/${encodeURIComponent(gigId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", platform: "web-employer" },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`無法取得職缺資料：${res.status}`);
  return await res.json();
}

function formatDateToDDMMYYYY(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
}

function stripQuotes(str: any) {
  if (!str) return "";
  if (typeof str !== "string") return String(str);
  if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1);
  return str;
}

const JobDetailsView: Component<JobDetailsViewProps> = (props) => {
  const [localJobData] = createResource(() => (props.sharedJobData ? null : props.gigId), fetchJobData);
  const jobData = () => props.sharedJobData || localJobData;

  const [selectedPhoto, setSelectedPhoto] = createSignal<string | null>(null);
  const [imageErrors, setImageErrors] = createSignal<Set<number>>(new Set());

  const handleImageError = (i: number) => setImageErrors((prev) => new Set([...prev, i]));
  const openPhotoModal = (url: string) => {
    setSelectedPhoto(url);
    document.body.style.overflow = "hidden";
  };
  const closePhotoModal = () => {
    setSelectedPhoto(null);
    document.body.style.overflow = "auto";
  };
  const getPhotoUrl = (photo: string | { url: string }) => (typeof photo === "string" ? photo : photo.url || "");
  const goBack = () => window.history.back();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") closePhotoModal();
  };

  onMount(() => document.addEventListener("keydown", handleKeyDown));
  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "auto";
  });

const showEditButton = (status: string) =>
  status.includes("已刊登") || status.includes("待刊登") || status.includes("已下架");

  return (
    <div class={styles.jobDetailsContainer}>
      <Show when={jobData()?.loading}>
        <p class={styles.loading}>載入職缺詳情中...</p>
      </Show>

      <Show when={jobData()?.error}>
        {(err) => (
          <div class={styles.errorContainer}>
            <h1>找不到職缺</h1>
            <p class={styles.error}>{(err() as Error).message}</p>
            <p>職缺編號：{props.gigId}</p>
            <button class={styles.backButton} onClick={goBack}>
              ← 返回
            </button>
          </div>
        )}
      </Show>

      <Show when={jobData()?.()}>
        {(job) => {
          const jobInfo = job();
          const location =
            [jobInfo.address, jobInfo.district, jobInfo.city].filter(Boolean).join(", ") || "未提供地點資訊";

          const mapsQuery = encodeURIComponent(location);
          const mapsSrc = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

          return (
            <>
              {/* 標題與編輯按鈕 */}
              <div class={styles.headerRow}>
                <h1 class={styles.jobTitle}>工作詳情</h1>
                <Show when={showEditButton(jobInfo.status)}>
                  <button
                    class={styles.editButton}
                    onClick={() =>
                      (window.location.href = `/edit-job?gigId=${encodeURIComponent(jobInfo.gigId)}`)
                    }
                  >
                    ✎ 編輯
                  </button>
                </Show>
              </div>

              {/* 職缺詳情 */}
              <p>
                <span class={styles.label}>日期：</span> {formatDateToDDMMYYYY(jobInfo.dateStart)} –{" "}
                {formatDateToDDMMYYYY(jobInfo.dateEnd)}
              </p>
              <p>
                <span class={styles.label}>時間：</span> {jobInfo.timeStart || "-"} – {jobInfo.timeEnd || "-"}
              </p>
              <p>
                <span class={styles.label}>時薪：</span> {jobInfo.hourlyRate || "-"} 元/小時
              </p>
              <p>
                <span class={styles.label}>地點：</span> {location}
              </p>

              {/* Google 地圖 */}
              <Show when={location !== "未提供地點資訊"}>
                <div class={styles.mapContainer}>
                  <iframe
                    src={mapsSrc}
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowfullscreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </Show>

              {/* 職缺描述 */}
              <section class={styles.section}>
                <h2>職缺描述</h2>
                <Show
                  when={typeof jobInfo.description === "string"}
                  fallback={
                    Array.isArray(jobInfo.description) ? (
                      <ul>
                        {jobInfo.description.map((i: any) => (
                          <li>{i}</li>
                        ))}
                      </ul>
                    ) : jobInfo.description && typeof jobInfo.description === "object" ? (
                      <div>
                        {"details" in jobInfo.description && (
                          <p>
                            <strong>詳細內容：</strong> {jobInfo.description.details}
                          </p>
                        )}
                        {"responsibilities" in jobInfo.description && (
                          <p>
                            <strong>工作內容：</strong> {jobInfo.description.responsibilities}
                          </p>
                        )}
                      </div>
                    ) : (
                      "未提供職缺描述"
                    )
                  }
                >
                  {stripQuotes(jobInfo.description)}
                </Show>
              </section>

              {/* 任職條件 */}
              <section class={styles.section}>
                <h2>任職條件</h2>
                <Show
                  when={typeof jobInfo.requirements === "string"}
                  fallback={
                    Array.isArray(jobInfo.requirements) ? (
                      <ul>
                        {jobInfo.requirements.map((i: any) => (
                          <li>{i}</li>
                        ))}
                      </ul>
                    ) : jobInfo.requirements && typeof jobInfo.requirements === "object" ? (
                      <div>
                        {"experience" in jobInfo.requirements && (
                          <p>
                            <strong>經驗要求：</strong> {jobInfo.requirements.experience}
                          </p>
                        )}
                        {"skills" in jobInfo.requirements &&
                          Array.isArray(jobInfo.requirements.skills) && (
                            <>
                              <strong>技能要求：</strong>
                              <ul>
                                {jobInfo.requirements.skills.map((s: any) => (
                                  <li>{s}</li>
                                ))}
                              </ul>
                            </>
                          )}
                      </div>
                    ) : (
                      "未提供任職條件"
                    )
                  }
                >
                  {stripQuotes(jobInfo.requirements)}
                </Show>
              </section>

              {/* 工作環境照片 */}
              <section class={styles.section}>
                <Show
                  when={jobInfo.environmentPhotos && jobInfo.environmentPhotos.length > 0}
                  fallback={
                    <>
                      <h2>工作環境照片</h2>
                      <div class={styles.noPhotos}>目前沒有可顯示的工作環境照片。</div>
                    </>
                  }
                >
                  <h2>工作環境照片（{jobInfo.environmentPhotos?.length || 0}）</h2>
                  <div class={styles.photoGallery}>
                    <For each={jobInfo.environmentPhotos}>
                      {(photo, index) => {
                        const photoUrl = getPhotoUrl(photo);
                        const hasError = () => imageErrors().has(index());

                        if (!photoUrl) return null;

                        return (
                          <div class={styles.photoItem}>
                            <Show
                              when={!hasError()}
                              fallback={<div class={styles.photoError}>圖片載入失敗</div>}
                            >
                              <img
                                src={photoUrl}
                                alt={`工作環境照片 ${index() + 1}`}
                                onClick={() => openPhotoModal(photoUrl)}
                                onError={() => handleImageError(index())}
                                loading="lazy"
                              />
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </section>

              {/* 聯絡資訊 */}
              <section class={styles.section}>
                <h2>聯絡資訊</h2>
                <p>
                  <span class={styles.label}>聯絡人：</span> {jobInfo.contactPerson || "-"}
                </p>
                <p>
                  <span class={styles.label}>電話：</span>{" "}
                  <Show when={jobInfo.contactPhone} fallback="-">
                    <a href={`tel:${jobInfo.contactPhone}`}>{jobInfo.contactPhone}</a>
                  </Show>
                </p>
                <p>
                  <span class={styles.label}>電子郵件：</span>{" "}
                  <Show when={jobInfo.contactEmail} fallback="-">
                    <a href={`mailto:${jobInfo.contactEmail}`}>{jobInfo.contactEmail}</a>
                  </Show>
                </p>
              </section>

              {/* 照片彈窗 */}
              <Show when={selectedPhoto()}>
                <div class={styles.photoModal} onClick={closePhotoModal}>
                  <div class={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <button class={styles.modalClose} onClick={closePhotoModal}>
                      ×
                    </button>
                    <img src={selectedPhoto()!} alt="完整圖片" />
                  </div>
                </div>
              </Show>
            </>
          );
        }}
      </Show>
    </div>
  );
};

export default JobDetailsView;
