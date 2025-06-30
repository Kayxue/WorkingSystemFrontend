import { createSignal, For, Show, onMount } from "solid-js";
import styles from "../styles/CalendarForm.module.css";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

async function fetchJobOffers(): Promise<JobOffer[]> {
  const response = await fetch("http://localhost:3000/gig/my-gigs", {
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
  return data.gigs;
}

function generateDates(year: number, month: number) {
  const date = new Date(year, month, 1);
  const dates = [];

  const firstDay = date.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    dates.push(null); // empty cells
  }

  for (let d = 1; d <= totalDays; d++) {
    dates.push(d);
  }

  return dates;
}

function formatDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const yyyy = date.getFullYear();
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isSameMonthYear(dateStr: string, y: number, m: number) {
  const d = new Date(dateStr);
  return d.getFullYear() === y && d.getMonth() === m;
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = createSignal(today.getFullYear());
  const [month, setMonth] = createSignal(today.getMonth());
  const [gigMap, setGigMap] = createSignal<Record<string, JobOffer[]>>({});
  const [selectedDay, setSelectedDay] = createSignal<number | null>(null);

  async function loadAndGroupGigs() {
    try {
      const allGigs = await fetchJobOffers();
      const grouped: Record<string, JobOffer[]> = {};

      for (const gig of allGigs) {
        const start = new Date(gig.dateStart);
        const end = new Date(gig.dateEnd);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const rangeStart = new Date(start);
        const rangeEnd = new Date(end);

        for (
          let date = new Date(rangeStart);
          date <= rangeEnd;
          date.setDate(date.getDate() + 1)
        ) {
          const dateKey = formatDate(date);
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(gig);
        }
      }

      setGigMap(grouped);
    } catch (err) {
      console.error("Failed to load gigs:", err);
    }
  }

  onMount(loadAndGroupGigs);

  const dates = () => generateDates(year(), month());

  const selectedGigs = () => {
    if (selectedDay() === null) return [];
    const dateKey = formatDate(new Date(year(), month(), selectedDay()!));
    return gigMap()[dateKey] ?? [];
  };

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
        <button class={styles.viewButton}>Calendar</button>
      </div>

      <div class={styles.header}>
        <button
          class={styles.navButton}
          onClick={() => {
            setMonth(m => (m === 0 ? 11 : m - 1));
            setSelectedDay(null);
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
              setSelectedDay(null);
            }}
          >
            Today
          </button>

          <select
            class={styles.select}
            onInput={(e) => {
              setYear(parseInt(e.currentTarget.value));
              setSelectedDay(null);
            }}
          >
            <For each={Array.from({ length: 11 }, (_, i) => 2020 + i)}>
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
            setMonth(m => (m === 11 ? 0 : m + 1));
            setSelectedDay(null);
          }}
        >
          &gt;
        </button>
      </div>

      {/* Calendar Grid */}
      <Show when={Object.keys(gigMap()).length}>
        <div class={styles.grid}>
          <For each={days}>{(day) => <div class={styles.dayHeader}>{day}</div>}</For>
          <For each={dates()}>
            {(day) => {
              const isToday = (() => {
                if (day === null) return false;
                const cellDate = new Date(year(), month(), day);
                return (
                  cellDate.getFullYear() === today.getFullYear() &&
                  cellDate.getMonth() === today.getMonth() &&
                  cellDate.getDate() === today.getDate()
                );
              })();

              const dateKey =
                day !== null ? formatDate(new Date(year(), month(), day)) : null;
              const gigsToday =
                dateKey && gigMap()[dateKey] && isSameMonthYear(dateKey, year(), month())
                  ? gigMap()[dateKey].length
                  : 0;

              return (
                <div
                  class={`${styles.day} ${day === null ? styles.emptyDay : ""} ${
                    selectedDay() === day ? styles.selectedDay : ""
                  }`}
                  onClick={() => day !== null && setSelectedDay(day)}
                  style={{ cursor: day !== null ? "pointer" : "default" }}
                >
                  {day !== null ? (
                    <>
                      <span class={isToday ? styles.today : ""}>{day}</span>
                      <div class={styles.gigCount}>{gigsToday} work(s)</div>
                    </>
                  ) : (
                    ""
                  )}
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      {/* Selected Day Jobs */}
      <Show when={selectedDay() !== null}>
        <div class={styles.selectedGigs}>
          <h3>
            Jobs on {year()}-{(month() + 1).toString().padStart(2, "0")}-
            {selectedDay()!.toString().padStart(2, "0")}
            <br />
            {selectedGigs().length} work(s)
          </h3>
          <ul>
            <For each={selectedGigs()}>
              {(gig) => (
                <li>
                  <strong>{gig.title}</strong> ({formatDate(gig.dateStart)} ~{" "}
                  {formatDate(gig.dateEnd)})
                </li>
              )}
            </For>
            <Show when={selectedGigs().length === 0}>
              <li>No jobs on this day.</li>
            </Show>
          </ul>
        </div>
      </Show>
    </div>
  );
}
