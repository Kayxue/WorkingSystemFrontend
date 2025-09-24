// File: JobLayout.solid.tsx
import { createSignal, onMount, onCleanup, For, createResource } from "solid-js";
import JobDetailsView from "./JobDetailsView.solid";
import JobApplicationsView from "./JobApplicationsView.solid";
import JobRatingView from "./JobRatingView.solid";
import JobAttendanceView from "./JobAttendanceView.solid";
import styles from "../../styles/JobLayout.module.css";

interface JobLayoutProps {
	gigId: string;
	initialStatus: string;
}

async function fetchJobTitle(gigId: string): Promise<string> {
	try {
		const response = await fetch(`/api/gig/${encodeURIComponent(gigId)}`, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				platform: "web-employer",
			},
			credentials: "include",
		});
		if (!response.ok) throw new Error(`Failed to fetch job: ${response.status}`);
		const job = await response.json();
		return job.title || "Job Details";
	} catch (err: any) {
		console.error("Error fetching job title:", err);
		return "Job Details";
	}
}

export default function JobLayout(props: JobLayoutProps) {
	const [jobTitle] = createResource(() => props.gigId, fetchJobTitle);
	const [activeSection, setActiveSection] = createSignal("details");
	const [isUserClicking, setIsUserClicking] = createSignal(false);

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

			const scrollEndTimeout = setTimeout(() => setIsUserClicking(false), 600);
			onCleanup(() => clearTimeout(scrollEndTimeout));
		}
	};

	const setupIntersectionObserver = () => {
		if (!contentWrapperRef || !tabNavigationRef) return;
		const headerHeight = document.querySelector(`.${styles.jobTitleHeader}`)?.offsetHeight || 85;
		const tabHeight = tabNavigationRef.offsetHeight;
		const stickyAreaHeight = headerHeight + tabHeight;
		const rootMarginValue = `-${stickyAreaHeight - 5}px 0px 0px 0px`;

		observer = new IntersectionObserver(
			(entries) => {
				if (isUserClicking()) return;
				let topMostIntersectingEntry = entries
					.filter(entry => entry.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
				if (topMostIntersectingEntry) {
					const newSectionId = topMostIntersectingEntry.target.id;
					if (activeSection() !== newSectionId) {
						setActiveSection(newSectionId);
						const url = new URL(window.location.href);
						url.searchParams.set("section", newSectionId);
						window.history.replaceState({}, "", url.toString());
					}
				}
			},
			{
				root: contentWrapperRef,
				rootMargin: rootMarginValue,
				threshold: [0, 0.001, 0.5],
			}
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
				<h1 class={styles.jobTitle}>
					{jobTitle.loading ? "Loading..." : jobTitle()}
				</h1>
				<a class={styles.backButton} href="/dashboard">
					<span class={styles.backIcon}>←</span>
					<span>Back to Dashboard</span>
				</a>
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
					<JobDetailsView gigId={props.gigId} />
				</section>
				<section id="applications" class={styles.sectionBlock}>
					<JobApplicationsView gigId={props.gigId} initialStatus={props.initialStatus} />
				</section>
				<section id="rating" class={styles.sectionBlock}>
					<JobRatingView gigId={props.gigId} />
				</section>
				<section id="attendance" class={styles.sectionBlock}>
					<JobAttendanceView gigId={props.gigId} />
				</section>
			</div>
      <footer class={styles.footer}>
        <div class={styles.footerContent}>
          <p>&copy; 2025 WorkNow. All rights reserved.</p>
        </div>
      </footer>
		</div>
    
	);
  
}
