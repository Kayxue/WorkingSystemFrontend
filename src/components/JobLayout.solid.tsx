// File: JobLayoutInteractive.solid.tsx
import { createSignal, Show, Switch, Match, onMount, onCleanup } from "solid-js";
import JobDetailsView from "./JobDetailsView.solid";
import JobApplicationsView from "./JobApplicationsView.solid";
import styles from "../styles/JobLayout.module.css";

type View = 'details' | 'applications';

interface JobLayoutProps {
  gigId: string;
}

export default function JobLayout(props: JobLayoutProps) {
  const [currentView, setCurrentView] = createSignal<View>('details');
  const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(false);

  const navigationItems = [
    { id: 'details' as View, label: 'Job Details', icon: '📋', shortcut: 'Alt+1' },
    { id: 'applications' as View, label: 'Applications', icon: '👥', shortcut: 'Alt+2' },
  ];

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
      setCurrentView('details');
    } else if (e.altKey && e.key === '2') {
      e.preventDefault();
      setCurrentView('applications');
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
  });

  onCleanup(() => {
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('keydown', handleKeyDown);
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
              onClick={() => setCurrentView(item.id)}
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
          <button class={styles.backButton} onClick={goBack}>
            <span class={styles.navIcon}>←</span>
            <Show when={!sidebarCollapsed()}>
              <span class={styles.navLabel}>Back to Dashboard</span>
            </Show>
          </button>
        </div>
      </aside>

      <main class={styles.mainContent}>
        <Switch fallback={<div>Loading...</div>}>
          <Match when={currentView() === 'details'}>
            <JobDetailsView gigId={props.gigId} />
          </Match>
          <Match when={currentView() === 'applications'}>
            <JobApplicationsView gigId={props.gigId} />
          </Match>
        </Switch>
      </main>

      <Show when={isMobile() && !sidebarCollapsed()}>
        <div class={styles.mobileOverlay} onClick={() => setSidebarCollapsed(true)} />
      </Show>
    </div>
  );
}
