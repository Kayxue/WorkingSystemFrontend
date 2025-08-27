import { createSignal, For, Show, createMemo, createEffect } from "solid-js";
import styles from "../styles/CalendarForm.module.css";
import _gigId_ from "../pages/job/[gigId].astro";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type JobOffer = {
  gigId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  publishedAt: string;
  unlistedAt: string;
  isActive?: boolean;
  environmentPhotos: {url: string}[];
};

function generateDates(year: number, month: number) {
  const date = new Date(year, month, 1);
  const dates = [];
  const firstDay = date.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    dates.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    dates.push(d);
  }
  return dates;
}

function isToday(y: number, m: number, d: number): boolean {
  const today = new Date();
  return (
    y === today.getFullYear() &&
    m === today.getMonth() &&
    d === today.getDate()
  );
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = createSignal(today.getFullYear());
  const [month, setMonth] = createSignal(today.getMonth());
  const [gigMap, setGigMap] = createSignal<Record<number, JobOffer[]>>({});
  const [selectedDay, setSelectedDay] = createSignal<number | null>(null);
  const [gigCount, setGigCount] = createSignal<number | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [startPage, setStartPage] = createSignal(1);
  const [pageInput, setPageInput] = createSignal("");
  const [showFloatingButton, setShowFloatingButton] = createSignal(false);
  const [showCalendar, setShowCalendar] = createSignal(true); // New state for calendar visibility
  const pageWindowSize = 10;
  const itemsPerPage = 4;
  let selectedGigsref: HTMLDivElement | undefined;

  async function loadAndGroupGigs(y: number, m: number) {
    setIsLoading(true);
    setGigMap({});
    setGigCount(null);
    let allGigs: JobOffer[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 100;

    try {
      while (hasMore) {
        const url = `/api/gig/employer/calendar?year=${y}&month=${m + 1}&offset=${offset}&limit=${limit}`;
        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json", platform: "web-employer" },
          credentials: "include",
        });

        if (!response.ok) {
          const text = await response.text();
          console.error("Error status:", response.status);
          console.error("Error body:", text);
          throw new Error("Failed to fetch calendar data");
        }

        const data = await response.json();
        if (Array.isArray(data.gigs)) {
          allGigs = allGigs.concat(data.gigs);
        }
        
        hasMore = data.pagination?.hasMore || false;
        if (hasMore) {
          offset += limit;
        }
      }

      setGigCount(allGigs.length);

      const grouped: Record<number, JobOffer[]> = {};
      for (const gig of allGigs) {
        const start = new Date(gig.dateStart);
        const end = new Date(gig.dateEnd);
        const current = new Date(start);
        current.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        while (current <= end) {
          const day = current.getDate();
          if (!grouped[day]) grouped[day] = [];
          grouped[day].push(gig);
          current.setDate(current.getDate() + 1);
        }
      }
      setGigMap(grouped);
    } catch (err) {
      console.error("Failed to load gigs:", err);
    } finally {
      setIsLoading(false);
    }
  }

  createEffect(() => {
    const y = year();
    const m = month();
    loadAndGroupGigs(y, m);
  });

  const dates = createMemo(() => generateDates(year(), month()));

  const selectedGigs = () => {
    if (selectedDay() === null) return [];
    return gigMap()[selectedDay()!] ?? [];
  };

  const totalPages = createMemo(() =>
    Math.ceil(selectedGigs().length / itemsPerPage)
  );

  const selectedPaginatedGig = createMemo(() => {
    const gigs = selectedGigs();
    const start = (currentPage() - 1) * itemsPerPage;
    return gigs.slice(start, start + itemsPerPage);
  });

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
    const newStart = direction === "prev"
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
      setPageInput(String(page));
    }
  }

  function toggleCalendar() {
    setShowCalendar(!showCalendar());
  }

  return (
    <div class={styles.calendar}>
      <div class={styles.viewToggle}>
        <button
          class={styles.viewButton}
          onClick={() => {
            window.location.href = "/dashboard";
          }}
        >
          Listings
        </button>
        <button class={`${styles.viewButton} ${styles.active}`}>
          Calendar
        </button>
      </div>

      <Show when={showCalendar()}>
        <div class={styles.header}>
          <button
            class={styles.navButton}
            onClick={() => {
              setMonth((m) => {
                if (m === 0) {
                  setYear((y) => y - 1);
                  return 11;
                }
                return m - 1;
              });
              setSelectedDay(null);
              setShowFloatingButton(false);
            }}
          >
            &lt;
          </button>

          <div class={styles.selectGroup}>
            <button
              class={styles.todayButton}
              onClick={() => {
                const now = new Date();
                setYear(now.getFullYear());
                setMonth(now.getMonth());
              }}
            >
              Today
            </button>

            <select
              class={styles.select}
              onInput={(e) => {
                setYear(parseInt(e.currentTarget.value));
                setSelectedDay(null);
                setShowFloatingButton(false);
              }}
            >
              <For each={Array.from({ length: 31 }, (_, i) => 2020 + i)}>
                {(y) => (
                  <option value={y} selected={y === year()}>
                    {y}
                  </option>
                )}
              </For>
            </select>

            <select
              class={styles.select}
              onInput={(e) => {
                setMonth(parseInt(e.currentTarget.value));
                setSelectedDay(null);
                setShowFloatingButton(false);
              }}
            >
              <For
                each={[
                  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                ]}
              >
                {(m, i) => (
                  <option value={i()} selected={i() === month()}>
                    {m}
                  </option>
                )}
              </For>
            </select>
          </div>

          <button
            class={styles.navButton}
            onClick={() => {
              setMonth((m) => {
                if (m === 11) {
                  setYear((y) => y + 1);
                  return 0;
                }
                return m + 1;
              });
              setSelectedDay(null);
              setShowFloatingButton(false);
            }}
          >
            &gt;
          </button>
        </div>

        <Show when={isLoading()}>
            <div class={styles.spinner}></div>
        </Show>

        <Show when={gigCount()!==null}>
          <div class={styles.gridWrapper}>
            <div class={styles.grid}>
              <For each={days}>{(day) => <div class={styles.dayHeader}>{day}</div>}</For>
              <For each={dates()}>
                {(day) => {
                  const y = year();
                  const m = month();
                  const gigsToday = () => (typeof day === "number" ? gigMap()[day]?.length ?? 0 : 0);

                  return (
                    <div
                      classList={{
                        [styles.day]: true,
                        [styles.emptyDay]: day === null,
                        [styles.selectedDay]: day !== null && selectedDay() === day
                      }}
                      onClick={() => {
                        if (day !== null) {
                          const jobsCount = gigMap()[day]?.length ?? 0;
                          setSelectedDay(day);
                          setCurrentPage(1);
                          setStartPage(1);
                          setPageInput("1");
                          setShowFloatingButton(true);
                          setShowCalendar(false); // Hide calendar when day is selected
                        }
                      }}
                      style={{ cursor: day !== null ? "pointer" : "default" }}
                    >
                      {day !== null ? (
                        <>
                          <span
                            classList={{
                              [styles.today]: isToday(y, m, day),
                              [styles.selectedDayRing]: selectedDay() === day,
                            }}
                          >
                            {day}
                          </span>
                          <div class={styles.gigCount}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#55b6f2" stroke-width="2"
                              stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                              <path d="M2 13h20" />
                            </svg> {gigsToday()}
                          </div>
                        </>
                      ) : (
                        ""
                      )}
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>
      </Show>

      <Show when={selectedDay() !== null}>
        <div class={styles.selectedGigs} ref={el => (selectedGigsref =el)}>
          <div class={styles.jobsHeader}>
            <button 
              class={styles.calendarToggleButton}
              onClick={toggleCalendar}
              title="Toggle Calendar View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            <div class={styles.jobsLoadedText}>
              Jobs section loaded for {month()+1}/{selectedDay()}! Found {selectedGigs().length} jobs.
            </div>
          </div>
          
          <Show when={selectedGigs().length > 0} fallback={<p>No jobs on this day.</p>}>
            <div class={styles.jobCard}>
              <div class={styles.gridOfGigs}>
                <For each={selectedPaginatedGig()}>
                  {(gig) => (
                    <div
                      class={styles.photoContainer}
                      onClick={() => (window.location.href = `/job/${gig.gigId}`)}
                    >
                      <Show
                        when={gig.environmentPhotos?.length > 0}
                        fallback={
                          <div class={styles.noPhoto}>
                            No environment photos available for this job.
                          </div>
                        }
                      >
                        <img
                          src={gig.environmentPhotos![0].url}
                          alt="工作環境"
                          class={styles.environmentPhoto}
                        />
                      </Show>
                      <div class={styles.jobInfo}>
                        <div>{gig.title} ({gig.timeStart} – {gig.timeEnd})</div>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>

            <div class={styles.pagination}>
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
            <div style={{ "margin": "10px", "text-align": "center" }}>
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
                  style={{ width: "60px", "text-align": "center" }}
                />{" "}
                of {totalPages()} pages.
              </form>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}