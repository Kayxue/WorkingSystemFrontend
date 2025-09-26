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
  status: string;
};

function formatDateToDDMMYYYY(dateStr: string): string {
  const date = new Date(dateStr);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function DashboardPage() {
  const [activeFilter, setActiveFilter] = createSignal("Ongoing");
  const [currentPage, setCurrentPage] = createSignal(1);
  const itemsPerPage = 10;
  const [totalJobCount, setTotalJobCount] = createSignal(0);
  const [totalPages, setTotalPages] = createSignal(0);
  const [jobOffers, setJobOffers] = createSignal<JobOffer[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [pageInput, setPageInput] = createSignal("1");
  const [startPage, setStartPage] = createSignal(1);
  const [isDropdownOpen, setIsDropdownOpen] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(false);
  const pageWindowSize = 10;

  const filterOptions = ["Ongoing", "Not Started", "Unpublished", "Completed", "Closed"];

  // Check screen size and set mobile state
  createEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 900);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  });

  // Close dropdown when clicking outside
  createEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.filterDropdownContainer}`)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen()) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  });

  function getStatusForAPI(filter: string): string {
    const statusMap: Record<string, string> = {
      Closed: "closed",
      Completed: "completed",
      Unpublished: "unpublished",
      "Not Started": "not_started"
    };
    return statusMap[filter] || "";
  }

  function handleFilterChange(filter: string) {
    setActiveFilter(filter);
    setStartPage(1);
    setCurrentPage(1);
    setPageInput("1");
    setIsDropdownOpen(false);
  }

  async function fetchJobOffers(status?: string) {
    try {
      setIsLoading(true);
      let offset = (currentPage() - 1) * itemsPerPage;
      let url = `/api/gig/my-gigs?offset=${offset}&limit=${itemsPerPage}`;
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
      setJobOffers(data.gigs);
      setTotalJobCount(data.pagination?.totalCount || 0);
      setTotalPages(data.pagination?.totalPage || 0);
    } catch (err) {
      console.error("Failed to fetch job offers:", err);
    } finally {
      setIsLoading(false);
    }
  }

  createEffect(() => {
    const status = getStatusForAPI(activeFilter());
    fetchJobOffers(status);
  });

  const paginatedJobs = createMemo(() => jobOffers());

  function generatePaginationPages() {
    const total = totalPages();
    const start = startPage();
    const end = Math.min(start + pageWindowSize - 1, total);
    const pages: (number | string)[] = [];

    if (start > 1) pages.push("prev");
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (end < total) pages.push("next");

    return pages;
  }

  function shiftPageWindow(direction: "prev" | "next") {
    const total = totalPages();
    const current = startPage();
    const newStart =
      direction === "prev"
        ? Math.max(1, current - pageWindowSize)
        : Math.min(current + pageWindowSize, total - pageWindowSize + 1);

    setStartPage(newStart);
    setCurrentPage(newStart);
    setPageInput(String(newStart));
    fetchJobOffers(getStatusForAPI(activeFilter()));
  }

  function jumpToPage() {
    const page = parseInt(pageInput());
    const total = totalPages();
    if (!isNaN(page) && page >= 1 && page <= total) {
      setCurrentPage(page);
      const windowStart = Math.floor((page - 1) / pageWindowSize) * pageWindowSize + 1;
      setStartPage(windowStart);
      fetchJobOffers(getStatusForAPI(activeFilter()));
      setPageInput(String(page));
    }
  }

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
      await fetchJobOffers(getStatusForAPI(activeFilter()));
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
      await fetchJobOffers(getStatusForAPI(activeFilter()));
    } catch (err) {
      console.error("Toggle listing failed:", err);
    }
  }

  function getJobStatusColor(job: JobOffer) {
    if (job.status === "已刊登") return styles.green; //published
    if (job.status === "待刊登") return styles.yellow; //not started
    if (job.status === "已下架") return styles.red; //unpublished
    if (job.status === "已結束") return styles.red; //completed
    if (job.status === "已關閉") return styles.red; //closed
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
        
        <Show when={!isMobile()}>
          {/* Desktop view - show all buttons */}
          <For each={filterOptions}>
            {(filter) => (
              <button
                classList={{ [styles.btn]: true, active: activeFilter() === filter }}
                onClick={() => handleFilterChange(filter)}
              >
                {filter}
              </button>
            )}
          </For>
        </Show>

        <Show when={isMobile()}>
          {/* Mobile view - show dropdown */}
          <div class={styles.filterDropdownContainer}>
            <button
              class={`${styles.btn} active`}
              classList={{ [styles.dropdownButton]: true }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen())}
            >
              {activeFilter()}
              <svg 
                class={styles.dropdownArrow}
                classList={{ 
                  [styles.open]: isDropdownOpen(), 
                  [styles.closed]: !isDropdownOpen() 
                }}
                width="12" 
                height="12" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2"
              >
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            
            <Show when={isDropdownOpen()}>
              <div class={styles.dropdownMenu}>
                <For each={filterOptions}>
                  {(filter) => (
                    <button
                      class={styles.dropdownItem}
                      classList={{ [styles.active]: activeFilter() === filter }}
                      onClick={() => handleFilterChange(filter)}
                    >
                      {filter}
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      <Show when={isLoading()}>
        <div class={styles.spinner}></div>
      </Show>

      <Show when={!isLoading()}>
        <Show when={jobOffers() && jobOffers().length > 0} fallback={<p class={styles.dashboardEmpty}>No job postings found.</p>}>

          <div style={{ "margin-bottom": "10px", "text-align": "center" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                jumpToPage();
              }}
            >
              Page{" "}
              <input
                type="number"
                min="1"
                max={totalPages()}
                value={pageInput()}
                onInput={(e) => setPageInput(e.currentTarget.value)}
                style={{ width: "60px", "text-align": "center"}}
              />{" "}
              of {totalPages()} pages ({totalJobCount()} jobs)
            </form>
          </div>

          <div class={styles.paginationContainer}>
            <button
              class={styles.pageButton}
              disabled={currentPage() === 1}
              onClick={() => {
                const newPage = currentPage() - 1;
                setCurrentPage(newPage);
                setPageInput(String(newPage));
                const windowStart = Math.floor((newPage - 1) / pageWindowSize) * pageWindowSize + 1;
                setStartPage(windowStart);
                fetchJobOffers(getStatusForAPI(activeFilter()));
              }}
            >
              &lt;
            </button>

            <For each={generatePaginationPages()}>
              {(page) => typeof page === "number" ? (
                <button
                  classList={{
                    [styles.pageButton]: true,
                    [styles.activePage]: currentPage() === page,
                  }}
                  onClick={() => {
                    setCurrentPage(page);
                    setPageInput(String(page));
                    fetchJobOffers(getStatusForAPI(activeFilter()));
                  }}
                >
                  {page}
                </button>
              ) : (
                <button
                  class={styles.pageButton}
                  onClick={() => shiftPageWindow(page === "prev" ? "prev" : "next")}
                >
                  ...
                </button>
              )}
            </For>

            <button
              class={styles.pageButton}
              disabled={currentPage() === totalPages()}
              onClick={() => {
                const newPage = currentPage() + 1;
                setCurrentPage(newPage);
                setPageInput(String(newPage));
                const nextWindowStart = Math.floor((newPage - 1) / pageWindowSize) * pageWindowSize + 1;
                setStartPage(nextWindowStart);
                fetchJobOffers(getStatusForAPI(activeFilter()));
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
                    <div class={styles.jobStatusContainer}>
                      Status: 
                      <p
                        class={`${styles.jobStatus} ${getJobStatusColor(job)}`}
                      >
                        {job.status}
                      </p>
                    </div>
                  </div>

                  <Show when={job.status!="已關閉" && job.status!="已結束"}>
                    <div class={styles.jobCardActions}>
                      <button
                        class={`${styles.actionButton} ${styles.blue}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/edit-job?gigId=${job.gigId}`;
                        }}
                      >
                        Edit
                      </button>
                      <Show when={job.status!="待刊登"}>
                        <button
                          class={`${styles.actionButton} ${job.unlistedAt? styles.green :styles.red}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleListing(job.gigId);
                          }}
                        >
                          {job.unlistedAt?"Publish":"Unpublish"}
                        </button>
                      </Show>
                      <button
                        class={`${styles.actionButton} ${styles.red}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.confirm("Are you sure to close this job?\nThis action cannot be undone!");
                          toggleStatus(job.gigId);
                        }}
                      >
                        Close job
                      </button>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      <footer class={styles.footer}>
        <div class={styles.footerContent}>
          <p>&copy; 2025 WorkNow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}