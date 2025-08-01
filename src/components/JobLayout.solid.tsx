import { createSignal, Show, Switch, Match } from "solid-js";
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

  const navigationItems = [
    { id: 'details' as View, label: 'Job Details', icon: '📋' },
    { id: 'applications' as View, label: 'Applications', icon: '👥' },
  ];

  const goBack = () => {
    window.history.back();
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed());
  };

  return (
    <div class={styles.jobLayoutContainer}>
      {/* Sidebar */}
      <aside class={`${styles.sidebar} ${sidebarCollapsed() ? styles.collapsed : ''}`}>
        <div class={styles.sidebarHeader}>
          <Show when={!sidebarCollapsed()}>
            <h3 class={styles.sidebarTitle}>Job Management</h3>
          </Show>
          <button 
            class={styles.collapseButton}
            onClick={toggleSidebar}
            title={sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed() ? '→' : '←'}
          </button>
        </div>
        
        <nav class={styles.navigation}>
          {navigationItems.map((item) => (
            <button
              class={`${styles.navItem} ${currentView() === item.id ? styles.active : ''}`}
              onClick={() => setCurrentView(item.id)}
              title={sidebarCollapsed() ? item.label : ''}
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

      {/* Main Content */}
      <main class={styles.mainContent}>
        <Switch>
          <Match when={currentView() === 'details'}>
            <JobDetailsView gigId={props.gigId} />
          </Match>
          <Match when={currentView() === 'applications'}>
            <JobApplicationsView gigId={props.gigId} />
          </Match>
        </Switch>
      </main>
    </div>
  );
}