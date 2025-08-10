// File: JobLayoutInteractive.solid.tsx
import { createSignal, Show, Switch, Match, onMount, onCleanup } from "solid-js";
import JobDetailsView from "./JobDetailsView.solid";
import JobApplicationsView from "./JobApplicationsView.solid";
import JobRatingView from "./JobRatingView.solid"; // Import the new rating component
import styles from "../../styles/JobLayout.module.css";

type View = 'details' | 'applications' | 'rating'; // Add 'rating' to View type

interface JobLayoutProps {
  gigId: string;
  initialSection: string;
  initialStatus: string;
}

export default function JobLayout(props: JobLayoutProps) {
  const [currentView, setCurrentView] = createSignal<View>(props.initialSection as View || 'details');
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(false);

  const navigationItems = [
    { id: 'details' as View, label: 'Job Details', icon: '📋', shortcut: 'Alt+1' },
    { id: 'applications' as View, label: 'Applications', icon: '👥', shortcut: 'Alt+2' },
    { id: 'rating' as View, label: 'Rating', icon: '⭐', shortcut: 'Alt+3' }, // Add rating item
  ];

  const showSection = (sectionId: View) => {
    setCurrentView(sectionId);
    const url = new URL(window.location.href);
    url.searchParams.set('section', sectionId);
    if (sectionId == 'applications') {
      url.searchParams.set('status', props.initialStatus);
    } else {
      url.searchParams.delete('status');
    }
    window.history.pushState({}, '', url.toString());
  };

  const handlePopState = () => {
    const params = new URLSearchParams(window.location.search);
    const section = (params.get('section') || 'details') as View;
    setCurrentView(section);
  };

  const goBack = () => {
    window.history.back();
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed());
  };

  const handleResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.altKey && e.key === '1') {
      e.preventDefault();
      showSection('details');
    } else if (e.altKey && e.key === '2') {
      e.preventDefault();
      showSection('applications');
    } else if (e.altKey && e.key === '3') { // Add shortcut for rating
      e.preventDefault();
      showSection('rating');
    } else if (e.altKey && e.key === 's') {
      e.preventDefault();
      toggleSidebar();
    } else if (e.key === 'Escape' && isMobile() && !sidebarCollapsed()) {
      setSidebarCollapsed(true);
    }
  };

  onMount(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('popstate', handlePopState);
  });

  return (
    <div class={styles.jobLayoutContainer}>
      <aside class={`${styles.sidebar} ${sidebarCollapsed() ? styles.collapsed : ''}`}>
        <div class={styles.sidebarHeader}>
          <Show when={!sidebarCollapsed()}>
            <h3 class={styles.sidebarTitle}>Job Management</h3>
          </Show>
          <button 
            class={styles.collapseButton}
            onClick={toggleSidebar}
            title={sidebarCollapsed() ? 'Expand sidebar (Alt+S)' : 'Collapse sidebar (Alt+S)'}
          >
            {sidebarCollapsed() ? '→' : '←'}
          </button>
        </div>

        <nav class={styles.navigation}>
          {navigationItems.map(item => (
            <button
              class={`${styles.navItem} ${currentView() === item.id ? styles.active : ''}`}
              onClick={() => showSection(item.id)}
              title={item.shortcut}
            >
              <span class={styles.navIcon}>{item.icon}</span>
              <Show when={!sidebarCollapsed()}>
                <span class={styles.navLabel}>{item.label}</span>
              </Show>
            </button>
          ))}
        </nav>

        <div class={styles.sidebarFooter}>
          <a class={styles.backButton} href="/dashboard">
            <span class={styles.navIcon}>←</span>
            <Show when={!sidebarCollapsed()}>
              <span class={styles.navLabel}>Back to Dashboard</span>
            </Show>
          </a>
        </div>
      </aside>

      <main class={styles.mainContent}>
        <Switch fallback={<div>Loading...</div>}>
          <Match when={currentView() === 'details'}>
            <JobDetailsView gigId={props.gigId} />
          </Match>
          <Match when={currentView() === 'applications'}>
            <JobApplicationsView gigId={props.gigId} initialStatus={props.initialStatus} />
          </Match>
          <Match when={currentView() === 'rating'}> {/* Add Match for rating */}
            <JobRatingView gigId={props.gigId} />
          </Match>
        </Switch>
      </main>

      <Show when={isMobile() && !sidebarCollapsed()}>
        <div class={styles.mobileOverlay} onClick={() => setSidebarCollapsed(true)} />
      </Show>
    </div>
  );
}