//dashboard tsx
import { createEffect, createSignal, createMemo, For, Show } from "solid-js";
import styles from "../styles/DashboardForm.module.css";

type JobOffer = {
  gigId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  publishedAt: string;
  unlistedAt: string;
  isActive: boolean;
};

function formatDateToDDMMYYYY(dateStr: string): string {
  const date = new Date(dateStr);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = createSignal("All");
  const [currentPage, setCurrentPage] = createSignal(1);
  const itemsPerPage = 10;
  const [jobOffers, setJobOffers] = createSignal<JobOffer[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [hasMorePages, setHasMorePages] = createSignal(false);

  async function fetchJobOffers(status?: string, page: number = 1) {
    try {
      setIsLoading(true);
      const offset = (page - 1) * itemsPerPage;
      let url = `/api/gig/my-gigs?offset=${offset}`;
      if (status && status.trim() !== "") {
        url += `&status=${encodeURIComponent(status)}`;
      }
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          platform: "web-employer",
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
      setJobOffers(data.gigs || []);
      setHasMorePages(data.pagination?.hasMore || false);
    } catch (err) {
      console.error("Failed to fetch job offers:", err);
    } finally {
      setIsLoading(false);
    }
  }

  createEffect(() => {
    const status = {
      "Ongoing": "ongoing",
      "Completed": "completed",
      "Not Started": "not_started",
      "All": ""
    }[activeFilter()];
    setCurrentPage(1);
    fetchJobOffers(status, 1);
  });
    
  const totalPages = createMemo(() => {
    return hasMorePages() ? currentPage() +1 :currentPage();
  });

  const paginatedJobs = createMemo(() => jobOffers());

  async function handleDelete(gigId: string) {
    const confirmed = confirm("Are you sure you want to delete this job?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/gig/${gigId}`, {
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
      const res = await fetch(`/api/gig/${gigId}/toggle-status`, {
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
      }
    } catch (err) {
      console.error("Toggle failed:", err);
      alert("An error occurred while toggling job status.");
    }
  }

  return (
    <div class={styles.dashboardContainer}>
      <div class={styles.viewToggle}>
        <button class={`${styles.viewButton} ${styles.active}`}>Listings</button>
        <button
          class={styles.viewButton}
          onClick={() => {
            window.location.href = "/calendar";
          }}
        >
          Calendar
        </button>
      </div>

      <div class={styles.filter}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 4 21 4 14 12.5 14 19 10 21 10 12.5 3 4" />
        </svg>

        <button
          classList={{ [styles.btn]: true, active: activeFilter() === "All" }}
          onClick={() => setActiveFilter("All")}
        >
          All
        </button>
        <button
          classList={{ [styles.btn]: true, active: activeFilter() === "Ongoing" }}
          onClick={() => setActiveFilter("Ongoing")}
        >
          Ongoing
        </button>
        <button
          classList={{ [styles.btn]: true, active: activeFilter() === "Completed" }}
          onClick={() => setActiveFilter("Completed")}
        >
          Completed
        </button>
        <button
          classList={{ [styles.btn]: true, active: activeFilter() === "Not Started" }}
          onClick={() => setActiveFilter("Not Started")}
        >
          Not Started
        </button>
      </div>

      <Show when={isLoading()}>
          <div class={styles.spinner}></div>
      </Show>

      <Show when={!isLoading()}>
        <Show
          when={jobOffers() && jobOffers()!.length > 0}
          fallback={<p class={styles.dashboardEmpty}>No job postings found.</p>}
        >

          <div class={styles.paginationContainer}>
            <button
              class={styles.pageButton}
              disabled={currentPage() === 1}
              onClick={() => {
                const newPage = currentPage() - 1;
                setCurrentPage(newPage);
                fetchJobOffers(
                  activeFilter() === "All" ? "" : activeFilter().toLowerCase(),
                  newPage
                );
              }}
            >
              &lt;
            </button>
            <For each={[...Array(totalPages()).keys()]}>
              {(index) => {
                const page = index + 1;
                return (
                  <button
                    classList={{
                      [styles.pageButton]: true,
                      [styles.activePage]: currentPage() === page,
                    }}
                    onClick={() => {
                      setCurrentPage(page);
                      fetchJobOffers(
                        activeFilter() === "All" ? "" : activeFilter().toLowerCase(),
                        page
                      );
                    }}
                  >
                    {page}
                  </button>
                );
              }}
            </For>
            <button
              class={styles.pageButton}
              disabled={currentPage() === totalPages()}
              onClick={() => {
                const newPage = currentPage() + 1;
                setCurrentPage(newPage);
                fetchJobOffers(
                  activeFilter() === "All" ? "" : activeFilter().toLowerCase(),
                  newPage
                );
              }}
            >
              &gt;
            </button>
          </div>

          <div class={styles.jobList}>
            <For each={paginatedJobs()}>
              {(job) => (
                <div
                  class={styles.jobCard}
                  onClick={() => (window.location.href = `/job/${job.gigId}`)}
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
      </Show>
    </div>
  );
}
