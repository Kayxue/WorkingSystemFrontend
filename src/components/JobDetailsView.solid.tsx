import { createResource, createSignal, For, Show } from "solid-js";
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
  description: string;
  requirements: string;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  publishedAt: string;
  environmentPhotos?: (string | { url: string })[];
};

interface JobDetailsViewProps {
  gigId: string;
}

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
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to fetch job: ${response.status} ${errorText}`);
    }

    const job = await response.json();
    console.log('Job data loaded successfully:', !!job);
    console.log('Environment photos count:', job?.environmentPhotos?.length || 0);
    
    return job;
  } catch (fetchError: any) {
    console.error('Fetch error:', fetchError);
    throw new Error(`Network error: ${fetchError?.message || 'Unknown error'}`);
  }
}

function formatDateToDDMMYYYY(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function stripQuotes(str: any): string {
  if (!str) return "";
  if (typeof str !== 'string') return String(str);
  if (str.startsWith('"') && str.endsWith('"')) {
    return str.slice(1, -1);
  }
  return str;
}

export default function JobDetailsView(props: JobDetailsViewProps) {
  const [jobData] = createResource(() => props.gigId, fetchJobData);
  const [selectedPhoto, setSelectedPhoto] = createSignal<string | null>(null);
  const [imageErrors, setImageErrors] = createSignal<Set<number>>(new Set());

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set([...prev, index]));
  };

  const openPhotoModal = (photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    document.body.style.overflow = 'hidden';
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
    document.body.style.overflow = 'auto';
  };

  const getPhotoUrl = (photo: string | { url: string }): string => {
    return typeof photo === 'string' ? photo : photo.url || '';
  };

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePhotoModal();
  });

  return (
    <div class={styles.jobDetailsContainer}>
      <Show when={jobData.loading}>
        <p class={styles.loading}>Loading job details...</p>
      </Show>

      <Show when={jobData.error}>
        {(err) => (
          <div class={styles.errorContainer}>
            <h1>Job Not Found</h1>
            <p class={styles.error}>
              Error: {(err() as Error).message}
            </p>
            <p>Job ID: {props.gigId}</p>
          </div>
        )}
      </Show>

      <Show when={jobData()}>
        {(job) => {
          const jobInfo = job();
          const location = [jobInfo.address, jobInfo.district, jobInfo.city]
            .filter(Boolean)
            .join(', ') || 'Location not specified';

          return (
            <>
              <h1 class={styles.jobTitle}>{jobInfo.title}</h1>
              
              <div class={styles.infoGrid}>
                <div class={styles.infoItem}>
                  <span class={styles.label}>Date:</span>
                  {formatDateToDDMMYYYY(jobInfo.dateStart)} – {formatDateToDDMMYYYY(jobInfo.dateEnd)}
                </div>
                <div class={styles.infoItem}>
                  <span class={styles.label}>Time:</span>
                  {jobInfo.timeStart || 'Not specified'} – {jobInfo.timeEnd || 'Not specified'}
                </div>
                <div class={styles.infoItem}>
                  <span class={styles.label}>Rate:</span>
                  {jobInfo.hourlyRate || 'Not specified'} NTD/hour
                </div>
                <div class={styles.infoItem}>
                  <span class={styles.label}>Status:</span>
                  <span class={`${styles.status} ${jobInfo.isActive ? styles.active : styles.inactive}`}>
                    {jobInfo.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div class={styles.locationItem}>
                <span class={styles.label}>Location:</span>
                {location}
              </div>

              <section class={styles.section}>
                <h2>Job Description</h2>
                <div class={styles.contentBox}>
                  {stripQuotes(jobInfo.description || 'No description provided')}
                </div>
              </section>

              <section class={styles.section}>
                <h2>Requirements</h2>
                <div class={styles.contentBox}>
                  {stripQuotes(jobInfo.requirements || 'No specific requirements listed')}
                </div>
              </section>

              <section class={styles.section}>
                <Show 
                  when={jobInfo.environmentPhotos && jobInfo.environmentPhotos.length > 0}
                  fallback={
                    <>
                      <h2>Environment Photos</h2>
                      <div class={styles.noPhotos}>
                        No environment photos available for this job.
                      </div>
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
                              fallback={
                                <div class={styles.photoError}>
                                  Failed to load image
                                </div>
                              }
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
                <div class={styles.infoGrid}>
                  <div class={styles.infoItem}>
                    <span class={styles.label}>Contact Person:</span>
                    {jobInfo.contactPerson || 'Not specified'}
                  </div>
                  <div class={styles.infoItem}>
                    <span class={styles.label}>Phone:</span>
                    <Show 
                      when={jobInfo.contactPhone}
                      fallback="Not provided"
                    >
                      <a href={`tel:${jobInfo.contactPhone}`}>{jobInfo.contactPhone}</a>
                    </Show>
                  </div>
                  <div class={styles.infoItem}>
                    <span class={styles.label}>Email:</span>
                    <Show 
                      when={jobInfo.contactEmail}
                      fallback="Not provided"
                    >
                      <a href={`mailto:${jobInfo.contactEmail}`}>{jobInfo.contactEmail}</a>
                    </Show>
                  </div>
                  <div class={styles.infoItem}>
                    <span class={styles.label}>Posted on:</span>
                    {formatDateToDDMMYYYY(jobInfo.publishedAt) || 'Date not available'}
                  </div>
                </div>
              </section>

              {/* Photo Modal */}
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
}