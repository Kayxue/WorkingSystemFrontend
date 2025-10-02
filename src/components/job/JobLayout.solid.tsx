import { createSignal, onMount, onCleanup, For, createResource, Show } from "solid-js";
import JobDetailsView from "./JobDetailsView.solid";
import JobApplicationsView from "./JobApplicationsView.solid";
import JobRatingView from "./JobRatingView.solid";
import JobAttendanceView from "./JobAttendanceView.solid";
import styles from "../../styles/JobLayout.module.css";

interface JobLayoutProps {
  gigId: string;
}

type JobData = {
  gigId: string;
  title: string;
  dateStart: string;
  dateEnd: string;
  timeStart: string;
  timeEnd: string;
  hourlyRate: string;
  address: string;
  district: string;
  city: string;
  description: any;
  requirements: any;
  contactPerson: string;
  contactPhone?: string;
  contactEmail?: string;
  publishedAt: string;
  unlistedAt?: string;
  environmentPhotos?: (string | { url: string })[];
  status: string;
  attendanceCodeInfo?: {
    attendanceCode: string;
    validDate: string;
    expiresAt: string;
  };
};

async function fetchJobData(gigId: string): Promise<JobData> {
  const response = await fetch(`/api/gig/${encodeURIComponent(gigId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", platform: "web-employer" },
    credentials: "include",
  });
  if (!response.ok) throw new Error(`Failed to fetch job: ${response.status}`);
  return await response.json();
}

function getJobStatusColor(status: string) {
  if (status === "已刊登") return styles.green;
  if (status === "待刊登") return styles.yellow;
  if (status === "已下架" || status === "已結束" || status === "已關閉") return styles.red;
  return styles.unknown;
}

export default function JobLayout(props: JobLayoutProps) {
  const [jobData, { refetch: refetchJobData }] = createResource(() => props.gigId, fetchJobData);
  const [activeSection, setActiveSection] = createSignal("details");
  const [isUserClicking, setIsUserClicking] = createSignal(false);
  const [showCodeModal, setShowCodeModal] = createSignal(false);

  let contentWrapperRef: HTMLDivElement | undefined;
  let tabNavigationRef: HTMLDivElement | undefined;
  let observer: IntersectionObserver;

  const navigationItems = [
    { id: "details", label: "Job Info", icon: "📋", shortcut: "Alt+1" },
    { id: "applications", label: "View Applicants", icon: "👥", shortcut: "Alt+2" },
    { id: "rating", label: "Rating", icon: "⭐", shortcut: "Alt+3" },
    { id: "attendance", label: "Attendance", icon: "⏰", shortcut: "Alt+4" },
  ];

  // Smooth scroll ke section
  const switchToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el || !contentWrapperRef) return;

    setActiveSection(sectionId);
    setIsUserClicking(true);

    el.scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(() => setIsUserClicking(false), 400);

    const url = new URL(window.location.href);
    url.searchParams.set("section", sectionId);
    window.history.pushState({}, "", url.toString());
  };

  const setupIntersectionObserver = () => {
    if (!contentWrapperRef || !tabNavigationRef) return;
    const headerHeight = document.querySelector(`.${styles.jobTitleHeader}`)?.clientHeight || 85;
    const tabHeight = tabNavigationRef.offsetHeight;
    const stickyAreaHeight = headerHeight + tabHeight;
    const rootMarginValue = `-${stickyAreaHeight - 5}px 0px 0px 0px`;

    observer = new IntersectionObserver(
      (entries) => {
        if (isUserClicking()) return;
        const topEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (topEntry) {
          const newSectionId = topEntry.target.id;
          if (activeSection() !== newSectionId) {
            setActiveSection(newSectionId);
            const url = new URL(window.location.href);
            url.searchParams.set("section", newSectionId);
            window.history.replaceState({}, "", url.toString());
          }
        }
      },
      { root: contentWrapperRef, rootMargin: rootMarginValue, threshold: [0, 0.001, 0.5] }
    );

    navigationItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
  };

  const handlePopState = () => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get("section") || "details";
    setActiveSection(section);
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.altKey && e.key === "1") switchToSection("details");
    else if (e.altKey && e.key === "2") switchToSection("applications");
    else if (e.altKey && e.key === "3") switchToSection("rating");
    else if (e.altKey && e.key === "4") switchToSection("attendance");
  };

  const openAttendanceCodeModal = () => {
    if (!jobData()?.attendanceCodeInfo) {
      alert("No attendance code available for this job.");
      return;
    }
    setShowCodeModal(true);
  };

  const closeModal = () => setShowCodeModal(false);

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);

    const params = new URLSearchParams(window.location.search);
    const section = params.get("section") || "details";

    setTimeout(() => {
      setupIntersectionObserver();
      setActiveSection(section);
      const el = document.getElementById(section);
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    }, 100);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("popstate", handlePopState);
    if (observer) observer.disconnect();
  });

  return (
    <div class={styles.jobLayoutContainer}>
      <div class={styles.jobTitleHeader}>
        <div class={styles.jobTitleWrapper}>
          <button
            class={styles.backButton}
            onClick={() => {
              if (document.referrer) window.location.href = document.referrer;
              else window.location.href = "/dashboard"; // fallback
            }}
          >
            <svg class={styles.backIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>

          <h1 class={styles.jobTitle}>
            {jobData.loading ? "Loading..." : jobData()?.title || "Job Details"}
          </h1>

          <Show when={jobData()?.status}>
            <p class={styles.jobStatus}>
              <span class={`${styles.status} ${getJobStatusColor(jobData()!.status)}`}>
                {jobData()!.status}
              </span>
            </p>
          </Show>
        </div>

        <div class={styles.headerButtons}>
          <Show when={jobData()?.status === "已刊登"}>
            <button
              class={`${styles.backButton} ${styles.generateCodeButton}`}
              onClick={openAttendanceCodeModal}
              disabled={!jobData()?.attendanceCodeInfo}
            >
              Attendance Code
            </button>
          </Show>
        </div>
      </div>

      <div class={styles.tabNavigation} ref={tabNavigationRef}>
        <div class={styles.tabContainer}>
          <For each={navigationItems}>
            {(item) => (
              <button
                class={`${styles.tabButton} ${activeSection() === item.id ? styles.activeTab : ""}`}
                onClick={() => switchToSection(item.id)}
                title={item.shortcut}
              >
                <span class={styles.tabIcon}>{item.icon}</span>
                <span class={styles.tabLabel}>{item.label}</span>
              </button>
            )}
          </For>
        </div>
      </div>

      <div class={styles.contentWrapper} ref={contentWrapperRef}>
        <section id="details" class={styles.sectionBlock}>
          <JobDetailsView gigId={props.gigId} sharedJobData={jobData} />
        </section>
        <section id="applications" class={styles.sectionBlock}>
          <JobApplicationsView gigId={props.gigId} />
        </section>
        <section id="rating" class={styles.sectionBlock}>
          <JobRatingView gigId={props.gigId} />
        </section>
        <section id="attendance" class={styles.sectionBlock}>
          <JobAttendanceView gigId={props.gigId} sharedJobData={jobData} />
        </section>
      </div>

      <Show when={showCodeModal()}>
        <div class={styles.modalOverlay} onClick={closeModal}>
          <div class={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button class={styles.modalCloseX} onClick={closeModal}>
              ×
            </button>
            <h2>Attendance Code</h2>
            <Show when={jobData()?.attendanceCodeInfo}>
              {(info) => (
                <>
                  <p class={styles.codeText}>{info().attendanceCode}</p>
                  <div class={styles.codeDetails}>
                    <p>
                      <strong>Valid from:</strong> {new Date(info().validDate).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Expires:</strong> {new Date(info().expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </>
              )}
            </Show>
            <button class={styles.modalCloseButton} onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
