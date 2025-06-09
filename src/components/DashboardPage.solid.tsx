import { createResource, createSignal, For, onMount, Show } from "solid-js";
import styles from "../styles/DashboardForm.module.css";

type JobOffer = {
  gigId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  hourlyRate: string;
  city: string;
  district: string;
  address: string;
  description: string;
  requirements: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  publishedAt: string;
  isActive: boolean;
};

async function fetchJobOffers():Promise<JobOffer[]> {
  const response = await fetch("http://localhost:3000/gig/my-gigs", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "platform": "web-employer",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Error status:", response.status);
    console.error("Error body:", text);
    throw new Error("Failed to fetch job offers");
  }

  const data = await response.json();
  return data.gigs;
}

async function fetchGigDetails(gigId: string): Promise<JobOffer> {
  const response = await fetch(`http://localhost:3000/gig/${gigId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "platform": "web-employer",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to fetch gig details:", text);
    throw new Error("Failed to fetch gig details");
  }

  const data = await response.json();
  return data;
}

function formatDateToDDMMYYYY(dateStr: string): string {
  const date = new Date(dateStr);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function DashboardPage() {
  const [triggerFetch,setTriggerFetch] = createSignal(false);
  const [jobOffers, { refetch }] = createResource(triggerFetch, fetchJobOffers);
  
  const [selectedJob, setSelectedJob] = createSignal<JobOffer | null>(null);
  const [showModal, setShowModal] = createSignal(false);

  onMount( ()=> {
    setTriggerFetch(true);
  })

  async function openModal(job: JobOffer) {
    try {
      const fullDetails = await fetchGigDetails(job.gigId);
      setSelectedJob(fullDetails);
      setShowModal(true);
    } catch (error) {
      alert("Failed to load full job details");
      console.error(error);
    }
  }

  function closeModal() {
    setShowModal(false);
    setSelectedJob(null);
  }

  async function handleDelete(gigId: string) {
    const confirmed = confirm("Are you sure you want to delete this job?");
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:3000/gig/${gigId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        alert("Failed to delete: " + errorText);
      } else {
        alert("Job deleted successfully");
        await refetch();
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("An error occurred while deleting.");
    }
  }

  function handleEdit(gigId: string) {
    window.location.href = `/edit-job?gigId=${gigId}`;
  }

  async function handleToggleStatus(gigId: string) {
    try {
      const res = await fetch(`http://localhost:3000/gig/${gigId}/toggle-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
      });

      const result = await res.json();

      if (!res.ok) {
        alert("Failed to toggle job status: " + (result?.message || res.statusText));
      } else {
        await refetch();
      }
    } catch (err) {
      console.error("Toggle failed:", err);
      alert("An error occurred while toggling job status.");
    }
  }

  function stripQuotes(str: string) {
    if (!str) return "";
    if (str.startsWith('"') && str.endsWith('"')) {
        return str.slice(1, -1);
    }
    return str;
  }

  return (
    <div class={styles.dashboardContainer}>
      <Show when={jobOffers.loading}>
        <p class={styles.dashboardLoading}>Loading job postings...</p>
      </Show>

      <Show when={jobOffers.error}>
        {(err) => (
          <p class={styles.dashboardError}>
            Error loading jobs: {(err() as Error).message}
          </p>
        )}
      </Show>

      <Show
        when={jobOffers() && jobOffers()!.length > 0}
        fallback={<p class={styles.dashboardEmpty}>No job postings found.</p>}
      >
        <div class={styles.jobList}>
          <For each={jobOffers()}>
            {(job) => (
              <div
                class={styles.jobCard}
                onClick={() => openModal(job)}
                style={{ cursor: "pointer" }}
              >
                <div
                  class={styles.cardIcons}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    class={styles.iconButton}
                    onClick={() => handleToggleStatus(job.gigId)}
                    title={job.isActive ? "Deactivate" : "Activate"}
                  >
                    {job.isActive ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.42 21.42 0 0 1 5.17-6.18" />
                        <path d="M1 1l22 22" />
                        <path d="M9.53 9.53a3.5 3.5 0 0 0 4.95 4.95" />
                        <path d="M14.47 14.47a3.5 3.5 0 0 1-4.95-4.95" />
                        <path d="M12 12v0" />
                      </svg>
                    )}
                  </button>
                  <button class={styles.iconButton} onClick={() => handleEdit(job.gigId)} title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button class={styles.iconButton} onClick={() => handleDelete(job.gigId)} title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>

                <h2 class={styles.jobTitle}>{job.title}</h2>
                <p class={styles.jobRate}>
                  Date: {formatDateToDDMMYYYY(job.dateStart)} to {formatDateToDDMMYYYY(job.dateEnd)}
                </p>
                <p class={styles.jobTime}>
                  Time: {job.timeStart} - {job.timeEnd}
                </p>
                <p class={styles.jobPostedAt}>
                  Posted on: {formatDateToDDMMYYYY(job.publishedAt)}
                </p>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={showModal()}>
        <div class={styles.modalOverlay} onClick={closeModal}>
          <div
            class={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button class={styles.modalCloseBtn} onClick={closeModal}>
              &times;
            </button>
            <h2>{selectedJob()?.title}</h2>
            <p>
              <strong>Date:</strong>{" "}
              {formatDateToDDMMYYYY(selectedJob()?.dateStart || "")} to{" "}
              {formatDateToDDMMYYYY(selectedJob()?.dateEnd || "")}
            </p>
            <p>
              <strong>Time:</strong> {selectedJob()?.timeStart} -{" "}
              {selectedJob()?.timeEnd}
            </p>
            <p>
              <strong>Hourly Rate:</strong>{" "}
              {selectedJob()?.hourlyRate}NTD
            </p>
            <p>
              <strong>Address:</strong>{" "}
              {selectedJob()?.address},{" "}{selectedJob()?.district},{" "}{selectedJob()?.city}.
            </p>
            <p>
              <strong>Job Description:</strong>{" "}
              {stripQuotes(selectedJob()?.description||"")}
            </p>
            <p>
              <strong>Job Requirement:</strong>{" "}
              {stripQuotes(selectedJob()?.requirements||"")}
            </p>
            <p>
              <strong>Contact Person:</strong>{" "}
              {selectedJob()?.contactPerson}
            </p>
            <p>
              <strong>Contact Phone:</strong>{" "}
              {selectedJob()?.contactPhone}
            </p>
            <p>
              <strong>Contact Email:</strong>{" "}
              {selectedJob()?.contactEmail}
            </p>
            <p>
              <strong>Posted on:</strong>{" "}
              {formatDateToDDMMYYYY(selectedJob()?.publishedAt || "")}
            </p>
            <p>
              <strong>Status:</strong>{" "}
              {selectedJob()?.isActive ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
      </Show>
    </div>
  );
}
