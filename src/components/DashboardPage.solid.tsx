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
  const [searchQuery, setSearchQuery] = createSignal("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = createSignal(false);
  const pageWindowSize = 10;

  const filterOptions = [
    { label: "已開始", value: "Ongoing" },
    { label: "未開始", value: "Not Started" },
    { label: "已下架", value: "Unpublished" },
    { label: "已結束", value: "Completed" },
    { label: "已關閉", value: "Closed" }
  ];

  createEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.filterDropdownContainer}`)) {
        setIsDropdownOpen(false);
      }
      if (!target.closest(`.${styles.searchFilterDropdown}`)) {
        setIsFilterDropdownOpen(false);
      }
    };

    if (isDropdownOpen() || isFilterDropdownOpen()) {
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

  async function fetchJobOffers() {
    try {
      setIsLoading(true);
      
      let offset = (currentPage() - 1) * itemsPerPage;
      let url = `/api/gig/my-gigs?offset=${offset}&limit=${itemsPerPage}`;
      const status = getStatusForAPI(activeFilter());
      if (status && status.trim() !== "") {
        url += `&status=${encodeURIComponent(status)}`;
      }
      if (searchQuery().trim() !== "") {
        url += `&search=${encodeURIComponent(searchQuery())}`;
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

  // Watch for filter changes
  createEffect(() => {
    activeFilter();
    setCurrentPage(1);
    setStartPage(1);
    setPageInput("1");
  });

  // Watch for currentPage, activeFilter, and searchQuery changes
  createEffect(() => {
    currentPage();
    activeFilter();
    searchQuery();
    fetchJobOffers();
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
  }

  function jumpToPage() {
    const page = parseInt(pageInput());
    const total = totalPages();
    if (!isNaN(page) && page >= 1 && page <= total) {
      setCurrentPage(page);
      const windowStart = Math.floor((page - 1) / pageWindowSize) * pageWindowSize + 1;
      setStartPage(windowStart);
    }
  }

  function handleSearchKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      setCurrentPage(1);
      setStartPage(1);
      setPageInput("1");
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setCurrentPage(1);
    setStartPage(1);
    setPageInput("1");
  }

  async function toggleStatus(gigId: string) {
    const confirmed = window.confirm("確定要關閉此職位嗎？\n此操作無法復原！");
    if (!confirmed) return;
    
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
      await fetchJobOffers();
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
      await fetchJobOffers();
    } catch (err) {
      console.error("Toggle listing failed:", err);
    }
  }

  function getJobStatusColor(status: string) {
    if (status === "已刊登") return styles.green;
    if (status === "未開始") return styles.yellow;
    if (status === "已下架") return styles.red;
    if (status === "已結束") return styles.red;
    if (status === "已關閉") return styles.red;
    if (status === "正在進行") return styles.blue;
  }

  return (
    <div class={styles.dashboardContainer}>
      <div class={styles.viewToggle}>
        <button class={`${styles.viewButton} ${styles.active}`}>職缺列表</button>
        <button
          class={styles.viewButton}
          onClick={() => {
            window.location.href = "/calendar";
          }}
        >
          行事曆
        </button>
      </div>
        
      {/* Search Bar */}
      <div class={styles.searchContainer}>
        <div class={styles.searchInputWrapper}>
          <svg class={styles.searchIcon} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            class={styles.searchInput}
            placeholder="搜尋職位名稱..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyPress={handleSearchKeyPress}
          />
          <Show when={searchQuery().trim() !== ""}>
            <button
              class={styles.clearSearchButton}
              onClick={clearSearch}
              title="清除搜尋"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </Show>
        </div>
        
        <div class={styles.searchFilterDropdown}>
          <button
            class={styles.filterButton}
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen())}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
            <span>{filterOptions.find(f => f.value === activeFilter())?.label}</span>
            <svg 
              class={styles.dropdownArrow}
              classList={{ 
                [styles.open]: isFilterDropdownOpen(), 
                [styles.closed]: !isFilterDropdownOpen() 
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
          
          <Show when={isFilterDropdownOpen()}>
            <div class={styles.filterDropdownMenu}>
              <For each={filterOptions}>
                {(filter) => (
                  <button
                    class={styles.filterDropdownItem}
                    classList={{ [styles.active]: activeFilter() === filter.value }}
                    onClick={() => {
                      handleFilterChange(filter.value);
                      setIsFilterDropdownOpen(false);
                    }}
                  >
                    {filter.label}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>

      <Show when={isLoading()}>
        <div class={styles.spinner}></div>
      </Show>

      <Show when={!isLoading()}>
        <Show when={jobOffers() && jobOffers().length > 0} fallback={<p class={styles.dashboardEmpty}>沒有職位。</p>}>

          <div style={{ "margin-bottom": "10px", "text-align": "center" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                jumpToPage();
              }}
            >
              第{" "}
              <input
                type="number"
                min="1"
                max={totalPages()}
                value={pageInput()}
                onInput={(e) => setPageInput(e.currentTarget.value)}
                style={{ 
                  width: "40px", 
                  "text-align": "center",
                }}
              />
              頁，共 {totalPages()} 頁（{totalJobCount()} 個職位）
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
                      日期：{formatDateToDDMMYYYY(job.dateStart)} 至 {formatDateToDDMMYYYY(job.dateEnd)}
                    </p>
                    <p class={styles.jobTime}>
                      時間：{job.timeStart} - {job.timeEnd}
                    </p>
                    
                    {job.status.startsWith("已下架,") || job.status.startsWith("已刊登,") ? (
                      <div class={styles.jobStatusContainer}>
                        狀態：
                        <p
                          class={`${styles.jobStatus} ${getJobStatusColor(job.status.split(",")[0])}`}
                        >
                          {job.status.split(",")[0]}
                        </p>
                        <p
                          class={`${styles.jobStatus} ${getJobStatusColor(job.status.split(",")[1])}`}
                        >
                          {job.status.split(",")[1]}
                        </p>
                      </div>
                    ): (
                      <div class={styles.jobStatusContainer}>
                        狀態：
                        <p
                          class={`${styles.jobStatus} ${getJobStatusColor(job.status)}`}
                        >
                          {job.status}
                        </p>
                      </div>
                    )}

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
                        編輯
                      </button>
                      <Show when={job.status!="待刊登"}>
                        <button
                          class={`${styles.actionButton} ${job.unlistedAt? styles.green :styles.red}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleListing(job.gigId);
                          }}
                        >
                          {job.unlistedAt?"刊登":"下架"}
                        </button>
                      </Show>
                      <button
                        class={`${styles.actionButton} ${styles.red}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStatus(job.gigId);
                        }}
                      >
                        關閉職位
                      </button>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>
    </div>
  );
}