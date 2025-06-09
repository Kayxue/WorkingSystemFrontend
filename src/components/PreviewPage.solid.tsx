import { createResource, createSignal, For, onMount, Show } from "solid-js";
import styles from "../styles/DashboardForm.module.css";

type JobOffer = {
  gigId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  publishedAt: string;
  isActive: boolean;
};

async function fetchJobOffers():Promise<JobOffer[]> {
  const response = await fetch("http://localhost:3000/gig/", {
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
  
  onMount( ()=> {
    setTriggerFetch(true);
  })

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
              <div class={styles.jobCard}>
                <h2 class={styles.jobTitle}>{job.title}</h2>
                <p class={styles.jobRate}>
                  Dates: {formatDateToDDMMYYYY(job.dateStart)} to {formatDateToDDMMYYYY(job.dateEnd)}
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
    </div>
  );
}
