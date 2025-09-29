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
};

async function fetchJobData(gigId: string): Promise<JobData> {
  const response = await fetch(`/api/gig/${encodeURIComponent(gigId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", platform: "web-employer" },
    credentials: "include",
  });
  // Changed error message to English
  if (!response.ok) throw new Error(`Failed to fetch job: ${response.status}`);
  return await response.json();
}

function getJobStatusColor(status: string) {
  // Assuming the original status strings correspond to these meanings:
  // "已刊登" -> Published (Green)
  // "待刊登" -> Pending/Draft (Yellow)
  // "已下架" / "已結束" / "已關閉" -> Taken Down/Ended/Closed (Red)
  if (status === "已刊登") return styles.green;
  if (status === "待刊登") return styles.yellow;
  if (status === "已下架" || status === "已結束" || status === "已關閉") return styles.red;
  return styles.unknown;
}

export default function JobLayout(props: JobLayoutProps) {
  const [jobData] = createResource(() => props.gigId, fetchJobData);
  const [activeSection, setActiveSection] = createSignal("details");
  const [isUserClicking, setIsUserClicking] = createSignal(false);

  const [generatedCode, setGeneratedCode] = createSignal<string | null>(null);
  const [loadingCode, setLoadingCode] = createSignal(false);

  let contentWrapperRef: HTMLDivElement | undefined;
  let tabNavigationRef: HTMLDivElement | undefined;
  let observer: IntersectionObserver;

  const navigationItems = [
    { id: "details", label: "Job Info", icon: "📋", shortcut: "Alt+1" },
    { id: "applications", label: "View Applicants", icon: "👥", shortcut: "Alt+2" },
    { id: "rating", label: "Rating", icon: "⭐", shortcut: "Alt+3" },
    { id: "attendance", label: "Attendance", icon: "⏰", shortcut: "Alt+4" },
  ];

  const switchToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el && contentWrapperRef) {
      setIsUserClicking(true);
      setActiveSection(sectionId);
      el.scrollIntoView({ behavior: "smooth", block: "start" });

      const url = new URL(window.location.href);
      url.searchParams.set("section", sectionId);
      window.history.pushState({}, "", url.toString());

      // Set a short timeout to re-enable IO tracking after scroll animation finishes
      const scrollEndTimeout = setTimeout(() => setIsUserClicking(false), 600);
      onCleanup(() => clearTimeout(scrollEndTimeout));
    }
  };

  const setupIntersectionObserver = () => {
    if (!contentWrapperRef || !tabNavigationRef) return;
    // Calculate the total sticky header height to use as rootMargin for IO
    const headerHeight = document.querySelector(`.${styles.jobTitleHeader}`)?.clientHeight || 85;
    const tabHeight = tabNavigationRef.offsetHeight;
    const stickyAreaHeight = headerHeight + tabHeight;
    // Set rootMargin to trigger intersection slightly before the section hits the bottom of the sticky area
    const rootMarginValue = `-${stickyAreaHeight - 5}px 0px 0px 0px`;

    observer = new IntersectionObserver(
      (entries) => {
        if (isUserClicking()) return;
        // Find the top-most intersecting section
        const topEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (topEntry) {
          const newSectionId = topEntry.target.id;
          if (activeSection() !== newSectionId) {
            setActiveSection(newSectionId);
            // Update URL search params without adding a history entry
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
    // Scroll instantly to the section when using back/forward buttons
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.altKey && e.key === "1") switchToSection("details");
    else if (e.altKey && e.key === "2") switchToSection("applications");
    else if (e.altKey && e.key === "3") switchToSection("rating");
    else if (e.altKey && e.key === "4") switchToSection("attendance");
  };

  const generateAttendanceCode = async () => {
    setLoadingCode(true);
    try {
      const res = await fetch(`/api/gig/${props.gigId}/generate-attendance-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate attendance code");
      const data = await res.json();
      setGeneratedCode(data.attendanceCode);
    } catch (err) {
      console.error(err);
      alert("Error generating attendance code");
    } finally {
      setLoadingCode(false);
    }
  };

  const closeModal = () => setGeneratedCode(null);

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("popstate", handlePopState);

    const params = new URLSearchParams(window.location.search);
    const section = params.get("section") || "details";

    // Timeout to ensure DOM is fully rendered before setting up IO and scrolling
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
          <h1 class={styles.jobTitle}>
            {jobData.loading ? "Loading..." : jobData()?.title || "Job Details"}
          </h1>

          <Show when={jobData()?.status}>
            <p class={styles.jobStatus}>
              Status:{" "}
              <span class={`${styles.status} ${getJobStatusColor(jobData()!.status)}`}>
                {jobData()!.status}
              </span>
            </p>
          </Show>
        </div>

        <div class={styles.headerButtons}>
          <button
            class={`${styles.backButton} ${styles.generateCodeButton}`}
            onClick={generateAttendanceCode}
            disabled={loadingCode()}
          >
            {loadingCode() ? "Generating..." : "Generate Code"}
          </button>

          <a class={styles.backButton} href="/dashboard">
            <span class={styles.backIcon}>←</span>
            <span>Back to Dashboard</span>
          </a>
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
        {/* All content sections are inside the scrollable wrapper */}
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
          <JobAttendanceView gigId={props.gigId} />
        </section>

        {/* --- FOOTER IS NOW INSIDE contentWrapper TO BE SCROLLABLE --- */}
        <footer class={styles.footer}>
          <div class={styles.footerContent}>
            <p>&copy; 2025 WorkNow. All rights reserved.</p>
          </div>
        </footer>
      </div>

      {/* Modal to show generated code */}
      {generatedCode() && (
        <div class={styles.modalOverlay} onClick={closeModal}>
          <div class={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2>Attendance Code</h2>
            <p class={styles.codeText}>{generatedCode()}</p>
            <button class={styles.modalCloseButton} onClick={closeModal}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}