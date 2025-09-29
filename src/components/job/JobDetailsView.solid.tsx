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
  status: string; // 已刊登, 待刊登, 已下架, 已結束, 已關閉
};

interface JobDetailsViewProps {
  gigId: string;
  sharedJobData?: Resource<JobData>; // Optional shared data from parent
}

async function fetchJobData(gigId: string): Promise<JobData> {
  const res = await fetch(`/api/gig/${encodeURIComponent(gigId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", platform: "web-employer" },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch job: ${res.status}`);
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

// status color helper ala DashboardPage
function getJobStatusColor(status: string) {
  if (status === "已刊登") return styles.green;
  if (status === "待刊登") return styles.yellow;
  if (status === "已下架") return styles.red;
  if (status === "已結束") return styles.red;
  if (status === "已關閉") return styles.red;
  return styles.unknown;
}

const JobDetailsView: Component<JobDetailsViewProps> = (props) => {
  // Use shared data if available, otherwise create our own resource
  const [localJobData] = createResource(() => {
    // Only fetch if we don't have shared data
    return props.sharedJobData ? null : props.gigId;
  }, fetchJobData);
  
  // Use shared data or local data
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

  return (
    <div class={styles.jobDetailsContainer}>
      <Show when={jobData()?.loading}>
        <p class={styles.loading}>Loading job details...</p>
      </Show>

      <Show when={jobData()?.error}>
        {(err) => (
          <div class={styles.errorContainer}>
            <h1>Job Not Found</h1>
            <p class={styles.error}>{(err() as Error).message}</p>
            <p>Job ID: {props.gigId}</p>
            <button class={styles.backButton} onClick={goBack}>
              ← Back
            </button>
          </div>
        )}
      </Show>

      <Show when={jobData()?.()}>
        {(job) => {
          const jobInfo = job();
          const location = [jobInfo.address, jobInfo.district, jobInfo.city]
            .filter(Boolean)
            .join(", ") || "Location not specified";

          const mapsQuery = encodeURIComponent(location);
          const mapsSrc = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

          return (
            <>
              <div class={styles.headerRow}>
                <h1 class={styles.jobTitle}>Job Info</h1>
                <button
                  class={styles.editButton}
                  onClick={() =>
                    (window.location.href = `/edit-job?gigId=${encodeURIComponent(jobInfo.gigId)}`)
                  }
                >
                  ✎ Edit
                </button>
              </div>

              <p>
                <span class={styles.label}>Date :</span> {formatDateToDDMMYYYY(jobInfo.dateStart)} –{" "}
                {formatDateToDDMMYYYY(jobInfo.dateEnd)}
              </p>
              <p>
                <span class={styles.label}>Time :</span> {jobInfo.timeStart || "-"} –{" "}
                {jobInfo.timeEnd || "-"}
              </p>
              <p>
                <span class={styles.label}>Rate :</span> {jobInfo.hourlyRate || "-"} NTD/hour
              </p>
              <p>
                <span class={styles.label}>Status :</span>{" "}
                <span class={`${styles.status} ${getJobStatusColor(jobInfo.status)}`}>
                  {jobInfo.status}
                </span>
              </p>
              <p>
                <span class={styles.label}>Location :</span> {location}
              </p>

              {/* Google Maps */}
              <Show when={location !== "Location not specified"}>
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

              <section class={styles.section}>
                <h2>Job Description</h2>
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
                            <strong>Details:</strong> {jobInfo.description.details}
                          </p>
                        )}
                        {"responsibilities" in jobInfo.description && (
                          <p>
                            <strong>Responsibilities:</strong> {jobInfo.description.responsibilities}
                          </p>
                        )}
                      </div>
                    ) : (
                      "No description provided"
                    )
                  }
                >
                  {stripQuotes(jobInfo.description)}
                </Show>
              </section>

              <section class={styles.section}>
                <h2>Requirements</h2>
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
                            <strong>Experience:</strong> {jobInfo.requirements.experience}
                          </p>
                        )}
                        {"skills" in jobInfo.requirements &&
                          Array.isArray(jobInfo.requirements.skills) && (
                            <>
                              <strong>Skills:</strong>
                              <ul>
                                {jobInfo.requirements.skills.map((s: any) => (
                                  <li>{s}</li>
                                ))}
                              </ul>
                            </>
                          )}
                      </div>
                    ) : (
                      "No requirements listed"
                    )
                  }
                >
                  {stripQuotes(jobInfo.requirements)}
                </Show>
              </section>

              {/* Environment photos */}
              <section class={styles.section}>
                <Show
                  when={jobInfo.environmentPhotos && jobInfo.environmentPhotos.length > 0}
                  fallback={
                    <>
                      <h2>Environment Photos</h2>
                      <div class={styles.noPhotos}>No environment photos available for this job.</div>
                    </>
                  }
                >
                  <h2>Environment Photos ({jobInfo.environmentPhotos?.length || 0})</h2>
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
                              fallback={<div class={styles.photoError}>Failed to load image</div>}
                            >
                              <img
                                src={photoUrl}
                                alt={`Environment photo ${index() + 1}`}
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

              <section class={styles.section}>
                <h2>Contact Information</h2>
                <p>
                  <span class={styles.label}>Contact Person:</span>{" "}
                  {jobInfo.contactPerson || "-"}
                </p>
                <p>
                  <span class={styles.label}>Phone:</span>{" "}
                  <Show when={jobInfo.contactPhone} fallback="-">
                    <a href={`tel:${jobInfo.contactPhone}`}>{jobInfo.contactPhone}</a>
                  </Show>
                </p>
                <p>
                  <span class={styles.label}>Email:</span>{" "}
                  <Show when={jobInfo.contactEmail} fallback="-">
                    <a href={`mailto:${jobInfo.contactEmail}`}>{jobInfo.contactEmail}</a>
                  </Show>
                </p>
                <p>
                  <span class={styles.label}>Posted on:</span>{" "}
                  {formatDateToDDMMYYYY(jobInfo.publishedAt)}
                </p>
              </section>

              <Show when={selectedPhoto()}>
                <div class={styles.photoModal} onClick={closePhotoModal}>
                  <div class={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <button class={styles.modalClose} onClick={closePhotoModal}>
                      ×
                    </button>
                    <img src={selectedPhoto()!} alt="Full photo" />
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