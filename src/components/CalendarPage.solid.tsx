import { createSignal, For, Show, createMemo, createEffect } from "solid-js";
import styles from "../styles/CalendarForm.module.css";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type JobOffer = {
  gigId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  hourlyRate?: string;
  city?: string;
  district?: string;
  address?: string;
  description?: string;
  requirements?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  publishedAt?: string;
  isActive?: boolean;
};

async function fetchJobOffers(year: number, month: number): Promise<JobOffer[]> {
  const url = "/api/gig/my-gigs?year=" + year + "&month=" + (month + 1);

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
  return data.gigs;
}

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

  async function loadAndGroupGigs(y: number, m: number) {
    try {
      setGigMap({});

      const allGigs = await fetchJobOffers(y, m);
      const grouped: Record<number, JobOffer[]> = {};

      for (const gig of allGigs) {
        const start = new Date(gig.dateStart);
        const end = new Date(gig.dateEnd);
        const current = new Date(start);
        current.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        while (current <= end) {
          const isSameMonth = current.getFullYear() === y && current.getMonth() === m;
          if (isSameMonth) {
            const day = current.getDate();
            if (!grouped[day]) grouped[day] = [];
            grouped[day].push(gig);
          }
          current.setDate(current.getDate() + 1);
        }
      }

      setGigMap(grouped);
    } catch (err) {
      console.error("Failed to load gigs:", err);
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
            setMonth((m) => {
              if (m === 0) {
                setYear((y) => y - 1);
                return 11;
              }
              return m - 1;
            });
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
          }}
        >
          &gt;
        </button>
      </div>

      <Show when={Object.keys(gigMap()).length}>
        <div class={styles.grid}>
          <For each={days}>{(day) => <div class={styles.dayHeader}>{day}</div>}</For>
          <For each={dates()}>
            {(day) => {
              const y = year();
              const m = month();
              const gigsToday = typeof day === "number" ? gigMap()[day]?.length ?? 0 : 0;

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
                      <span class={isToday(y, m, day) ? styles.today : ""}>{day}</span>
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
    
      <Show when={selectedDay() !== null}>
        <div class={styles.selectedGigs}>
          <h3>
            Jobs on {year()}-{(month() + 1).toString().padStart(2, "0")}-{
              selectedDay()!.toString().padStart(2, "0")
            }<br />
            {selectedGigs().length} work(s)
          </h3>
          <ul>
            <For each={selectedGigs()}>
              {(gig) => (
                <li>
                  <strong>{gig.title}</strong> ({gig.timeStart}–{gig.timeEnd})
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
