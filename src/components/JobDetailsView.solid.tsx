// src/pages/job/[gigId].tsx (or .tsx component wrapped by your routing/astro layer)
import { createResource, createSignal, For, Show, onMount, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import styles from "../styles/JobDetails.module.css";

type JobData = {
  gigId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  hourlyRate: string;
  isActive: boolean;
  address: string;
  district: string;
  city: string;
  description: any; // can be string / array / object
  requirements: any; // same flexibility
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  publishedAt: string;
  environmentPhotos?: (string | { url: string })[];
};

interface JobDetailsViewProps {
  gigId: string;
}

// Fetch job data from API
async function fetchJobData(gigId: string): Promise<JobData> {
  try {
    const response = await fetch(`/api/gig/${encodeURIComponent(gigId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "platform": "web-employer",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", response.status, errorText);
      throw new Error(`Failed to fetch job: ${response.status} ${errorText}`);
    }

    const job = await response.json();
    return job;
  } catch (err: any) {
    console.error("Fetch error:", err);
    throw new Error(`Network error: ${err?.message || "Unknown error"}`);
  }
}

// Utility: format ISO date to DD-MM-YYYY
function formatDateToDDMMYYYY(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Utility: strip surrounding quotes if present
function stripQuotes(str: any): string {
  if (!str) return "";
  if (typeof str !== "string") return String(str);
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1);
  }
  return str;
}

// Component
const JobDetailsView: Component<JobDetailsViewProps> = (props) => {
  // Resource for job data
  const [jobData] = createResource(() => props.gigId, fetchJobData);

  // Modal and image error state
  const [selectedPhoto, setSelectedPhoto] = createSignal<string | null>(null);
  const [imageErrors, setImageErrors] = createSignal<Set<number>>(new Set());

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set([...prev, index]));
  };

  const openPhotoModal = (photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    document.body.style.overflow = "hidden";
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
    document.body.style.overflow = "auto";
  };

  const getPhotoUrl = (photo: string | { url: string }): string => {
    return typeof photo === "string" ? photo : photo.url || "";
  };

  const goBack = () => {
    window.history.back();
  };

  // Escape key closes modal; set up listener properly
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      closePhotoModal();
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
    // ensure body overflow restored
    document.body.style.overflow = "auto";
  });

  return (
    <div class={styles.jobDetailsContainer}>
      {/* Loading state */}
      <Show when={jobData.loading}>
        <p class={styles.loading}>Loading job details...</p>
      </Show>

      {/* Error state */}
      <Show when={jobData.error}>
        {(err) => (
          <div class={styles.errorContainer}>
            <h1>Job Not Found</h1>
            <p class={styles.error}>Error: {(err() as Error).message}</p>
            <p>Job ID: {props.gigId}</p>
            <button class={styles.backButton} onClick={goBack}>
              ← Back to Dashboard
            </button>
          </div>
        )}
      </Show>

      {/* Main content */}
      <Show when={jobData()}>
        {(job) => {
          const jobInfo = job();
          const location = [jobInfo.address, jobInfo.district, jobInfo.city]
            .filter(Boolean)
            .join(", ") || "Location not specified";

          return (
            <>
              {/* Header with title + edit button */}
              <div class={styles.headerRow}>
                <h1 class={styles.jobTitle}>{jobInfo.title}</h1>
                <button
                  class={styles.editButton}
                  onClick={() =>
                    (window.location.href = `/edit-job?gigId=${encodeURIComponent(
                      jobInfo.gigId
                    )}`)
                  }
                >
                  ✎ Edit Job
                </button>
              </div>

              {/* Basic info grid */}
              <div class={styles.infoGrid}>
                <div class={styles.infoItem}>
                  <span class={styles.label}>Date:</span>
                  {formatDateToDDMMYYYY(jobInfo.dateStart)} – {formatDateToDDMMYYYY(jobInfo.dateEnd)}
                </div>
                <div class={styles.infoItem}>
                  <span class={styles.label}>Time:</span>
                  {jobInfo.timeStart || "Not specified"} – {jobInfo.timeEnd || "Not specified"}
                </div>
                <div class={styles.infoItem}>
                  <span class={styles.label}>Rate:</span>
                  {jobInfo.hourlyRate || "Not specified"} NTD/hour
                </div>
                <div class={styles.infoItem}>
                  <span class={styles.label}>Status:</span>
                  <span class={`${styles.status} ${jobInfo.isActive ? styles.active : styles.inactive}`}>
                    {jobInfo.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Location */}
              <div class={styles.locationItem}>
                <span class={styles.label}>Location:</span> {location}
              </div>

              {/* Description */}
              <section class={styles.section}>
                <h2>Job Description</h2>
                <div class={styles.contentBox}>
                  {typeof jobInfo.description === "string" ? (
                    stripQuotes(jobInfo.description)
                  ) : Array.isArray(jobInfo.description) ? (
                    <ul>
                      {jobInfo.description.map((item: any, i: number) => (
                        <li>{String(item)}</li>
                      ))}
                    </ul>
                  ) : jobInfo.description && typeof jobInfo.description === "object" ? (
                    <div>
                      {"details" in jobInfo.description && (
                        <p>
                          <strong>Details:</strong> {String(jobInfo.description.details)}
                        </p>
                      )}
                      {"responsibilities" in jobInfo.description && (
                        <p>
                          <strong>Responsibilities:</strong> {String(jobInfo.description.responsibilities)}
                        </p>
                      )}
                    </div>
                  ) : (
                    "No description provided"
                  )}
                </div>
              </section>

              {/* Requirements */}
              <section class={styles.section}>
                <h2>Requirements</h2>
                <div class={styles.contentBox}>
                  {typeof jobInfo.requirements === "string" ? (
                    stripQuotes(jobInfo.requirements)
                  ) : Array.isArray(jobInfo.requirements) ? (
                    <ul>
                      {jobInfo.requirements.map((item: any, i: number) => (
                        <li>{String(item)}</li>
                      ))}
                    </ul>
                  ) : jobInfo.requirements && typeof jobInfo.requirements === "object" ? (
                    <div>
                      {"experience" in jobInfo.requirements && (
                        <p>
                          <strong>Experience:</strong> {String(jobInfo.requirements.experience)}
                        </p>
                      )}
                      {"skills" in jobInfo.requirements &&
                        Array.isArray(jobInfo.requirements.skills) && (
                          <>
                            <strong>Skills:</strong>
                            <ul>
                              {jobInfo.requirements.skills.map((skill: any, i: number) => (
                                <li>{String(skill)}</li>
                              ))}
                            </ul>
                          </>
                        )}
                    </div>
                  ) : (
                    "No specific requirements listed"
                  )}
                </div>
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

                        if (!photoUrl) {
                          console.warn(`Photo ${index() + 1} has no URL:`, photo);
                          return null;
                        }

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

              {/* Contact info */}
              <section class={styles.section}>
                <h2>Contact Information</h2>
                <div class={styles.infoGrid}>
                  <div class={styles.infoItem}>
                    <span class={styles.label}>Contact Person:</span> {jobInfo.contactPerson || "Not specified"}
                  </div>
                  <div class={styles.infoItem}>
                    <span class={styles.label}>Phone:</span>
                    <Show when={jobInfo.contactPhone} fallback="Not provided">
                      <a href={`tel:${jobInfo.contactPhone}`}>{jobInfo.contactPhone}</a>
                    </Show>
                  </div>
                  <div class={styles.infoItem}>
                    <span class={styles.label}>Email:</span>
                    <Show when={jobInfo.contactEmail} fallback="Not provided">
                      <a href={`mailto:${jobInfo.contactEmail}`}>{jobInfo.contactEmail}</a>
                    </Show>
                  </div>
                  <div class={styles.infoItem}>
                    <span class={styles.label}>Posted on:</span>{" "}
                    {formatDateToDDMMYYYY(jobInfo.publishedAt) || "Date not available"}
                  </div>
                </div>
              </section>

              {/* Photo modal */}
              <Show when={selectedPhoto()}>
                <div class={styles.photoModal} onClick={closePhotoModal}>
                  <div class={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <button class={styles.modalClose} onClick={closePhotoModal}>
                      ×
                    </button>
                    <img src={selectedPhoto()!} alt="Full size photo" />
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
