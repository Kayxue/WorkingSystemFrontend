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
  isCurrentlyListed: boolean;
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

  async function toggleStatus(gigId: string) {
    try {
      const res = await fetch(`/api/gig/${gigId}/toggle-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          platform: "web-employer",
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      await fetchJobOffers(activeFilter() === "All" ? "" : activeFilter().toLowerCase(), currentPage());
    } catch (err) {
      console.error("Toggle status failed:", err);
    }
  }

  async function toggleListing(gigId: string) {
    try {
      const res = await fetch(`/api/gig/${gigId}/toggle-listing`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          platform: "web-employer",
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle listing");
      await fetchJobOffers(activeFilter() === "All" ? "" : activeFilter().toLowerCase(), currentPage());
    } catch (err) {
      console.error("Toggle listing failed:", err);
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
                <div class={styles.jobCardWrapper}>
                  <div
                    class={styles.jobCard}
                    onClick={() => (window.location.href = `/job/${job.gigId}`)}
                    style={{ cursor: "pointer" }}
                  >
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

                  <div class={styles.jobCardActions}>
                    <button
                      class={`${styles.actionButton} ${job.isActive ? styles.blue : styles.grey}`}
                      disabled={!job.isCurrentlyListed}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/edit-job?gigId=${job.gigId}`;
                      }}
                    >
                      Edit - {String(job.isActive)} / {String(job.isCurrentlyListed)}
                    </button>
                    <button
                      class={`${styles.actionButton} ${job.isCurrentlyListed ? styles.blue : styles.grey}`}
                      disabled={!job.isCurrentlyListed}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus(job.gigId);
                      }}
                    >
                      {job.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      class={`${styles.actionButton} ${!job.isActive || !job.isCurrentlyListed ? styles.blue : styles.grey}`}
                      disabled={!job.isActive}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleListing(job.gigId);
                      }}
                    >
                      {job.isCurrentlyListed ? "Listed" : "NotListed"}
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}
