import { createResource, For, Show } from "solid-js";
import styles from "../styles/DashboardForm.module.css";

type JobOffer = {
  gigId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  publishedAt: string;
};

async function fetchJobOffers() {
  const response = await fetch("http://localhost:3000/gig/my-gigs", {
    headers: {
      "Content-Type": "application/json",
      platform: "web-employer",
    },
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("Response error:", text);
    throw new Error("Failed to fetch job offers");
  }

  const data = await response.json();
  return data.gigs;
}

export default function DashboardPage() {
  const [jobOffers] = createResource<JobOffer[]>(fetchJobOffers);

  return (
    <div class={styles.dashboardContainer}>
      <h1 class={styles.dashboardTitle}>Your Job Postings</h1>

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


      <Show when={jobOffers() && jobOffers()!.length > 0} fallback={<p class={styles.dashboardEmpty}>No job postings found.</p>}>
        <div class={styles.jobList}>
          <For each={jobOffers()}>
            {(job) => (
              <div class={styles.jobCard}>
                <h2 class={styles.jobTitle}>{job.title}</h2>
                <p class={styles.jobRate}>Dates: {job.dateStart} to {job.dateEnd}</p>
                <p class={styles.jobTime}>Time: {job.timeStart} - {job.timeEnd}</p>
                <p class={styles.jobPostedAt}>Posted on: {new Date(job.publishedAt).toLocaleDateString()}</p>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
