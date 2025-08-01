import { createResource, createSignal, For, Show } from "solid-js";
import styles from "../styles/JobApplications.module.css";

type Application = {
  id: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  appliedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  resume?: string;
};

interface JobApplicationsViewProps {
  gigId: string;
}

async function fetchApplications(gigId: string): Promise<Application[]> {
  try {
    const response = await fetch(`/api/gig/${encodeURIComponent(gigId)}/applications`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "platform": "web-employer",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`Failed to fetch applications: ${response.status} ${errorText}`);
    }

    const applications = await response.json();
    console.log('Applications loaded successfully:', applications.length);
    
    return applications;
  } catch (fetchError: any) {
    console.error('Fetch error:', fetchError);
    throw new Error(`Network error: ${fetchError?.message || 'Unknown error'}`);
  }
}

function formatDateToDDMMYYYY(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function JobApplicationsView(props: JobApplicationsViewProps) {
  const [applications, { refetch }] = createResource(() => props.gigId, fetchApplications);
  const [selectedApplication, setSelectedApplication] = createSignal<Application | null>(null);
  const [statusFilter, setStatusFilter] = createSignal<'all' | 'pending' | 'accepted' | 'rejected'>('all');

  const filteredApplications = () => {
    const apps = applications();
    if (!apps) return [];
    
    if (statusFilter() === 'all') return apps;
    return apps.filter(app => app.status === statusFilter());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'accepted': return styles.statusAccepted;
      case 'rejected': return styles.statusRejected;
      default: return '';
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'platform': 'web-employer',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update application status');
      }

      // Refresh the applications list
      refetch();
    } catch (error) {
      console.error('Error updating application status:', error);
      alert('Failed to update application status. Please try again.');
    }
  };

  const openApplicationModal = (application: Application) => {
    setSelectedApplication(application);
    document.body.style.overflow = 'hidden';
  };

  const closeApplicationModal = () => {
    setSelectedApplication(null);
    document.body.style.overflow = 'auto';
  };

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeApplicationModal();
  });

  return (
    <div class={styles.applicationsContainer}>
      <div class={styles.header}>
        <h1 class={styles.pageTitle}>Job Applications</h1>
        
        <div class={styles.filterContainer}>
          <label for="status-filter">Filter by status:</label>
          <select 
            id="status-filter" 
            class={styles.statusFilter}
            value={statusFilter()}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Applications</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <Show when={applications.loading}>
        <p class={styles.loading}>Loading applications...</p>
      </Show>

      <Show when={applications.error}>
        {(err) => (
          <div class={styles.errorContainer}>
            <h2>Error Loading Applications</h2>
            <p class={styles.error}>
              Error: {(err() as Error).message}
            </p>
          </div>
        )}
      </Show>

      <Show when={applications()}>
        <div class={styles.applicationsGrid}>
          <Show 
            when={filteredApplications().length > 0}
            fallback={
              <div class={styles.noApplications}>
                No applications found for the selected filter.
              </div>
            }
          >
            <For each={filteredApplications()}>
              {(application) => (
                <div class={styles.applicationCard}>
                  <div class={styles.cardHeader}>
                    <h3 class={styles.applicantName}>{application.applicantName}</h3>
                    <span class={`${styles.status} ${getStatusColor(application.status)}`}>
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </span>
                  </div>
                  
                  <div class={styles.cardContent}>
                    <p class={styles.applicantInfo}>
                      <strong>Email:</strong> {application.applicantEmail}
                    </p>
                    <Show when={application.applicantPhone}>
                      <p class={styles.applicantInfo}>
                        <strong>Phone:</strong> {application.applicantPhone}
                      </p>
                    </Show>
                    <p class={styles.applicantInfo}>
                      <strong>Applied:</strong> {formatDateToDDMMYYYY(application.appliedAt)}
                    </p>
                    <Show when={application.message}>
                      <p class={styles.message}>
                        <strong>Message:</strong> {application.message?.substring(0, 100)}
                        {application.message && application.message.length > 100 ? '...' : ''}
                      </p>
                    </Show>
                  </div>

                  <div class={styles.cardActions}>
                    <button 
                      class={styles.viewButton}
                      onClick={() => openApplicationModal(application)}
                    >
                      View Details
                    </button>
                    
                    <Show when={application.status === 'pending'}>
                      <div class={styles.actionButtons}>
                        <button 
                          class={styles.acceptButton}
                          onClick={() => updateApplicationStatus(application.id, 'accepted')}
                        >
                          Accept
                        </button>
                        <button 
                          class={styles.rejectButton}
                          onClick={() => updateApplicationStatus(application.id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>

      {/* Application Details Modal */}
      <Show when={selectedApplication()}>
        <div class={styles.applicationModal} onClick={closeApplicationModal}>
          <div class={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div class={styles.modalHeader}>
              <h2>Application Details</h2>
              <button class={styles.modalClose} onClick={closeApplicationModal}>
                ×
              </button>
            </div>
            
            <div class={styles.modalBody}>
              <div class={styles.applicantDetails}>
                <h3>{selectedApplication()!.applicantName}</h3>
                <p><strong>Email:</strong> <a href={`mailto:${selectedApplication()!.applicantEmail}`}>{selectedApplication()!.applicantEmail}</a></p>
                <Show when={selectedApplication()!.applicantPhone}>
                  <p><strong>Phone:</strong> <a href={`tel:${selectedApplication()!.applicantPhone}`}>{selectedApplication()!.applicantPhone}</a></p>
                </Show>
                <p><strong>Applied on:</strong> {formatDateToDDMMYYYY(selectedApplication()!.appliedAt)}</p>
                <p><strong>Status:</strong> 
                  <span class={`${styles.status} ${getStatusColor(selectedApplication()!.status)}`}>
                    {selectedApplication()!.status.charAt(0).toUpperCase() + selectedApplication()!.status.slice(1)}
                  </span>
                </p>
              </div>

              <Show when={selectedApplication()!.message}>
                <div class={styles.messageSection}>
                  <h4>Application Message</h4>
                  <div class={styles.fullMessage}>
                    {selectedApplication()!.message}
                  </div>
                </div>
              </Show>

              <Show when={selectedApplication()!.resume}>
                <div class={styles.resumeSection}>
                  <h4>Resume</h4>
                  <a 
                    href={selectedApplication()!.resume} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class={styles.resumeLink}
                  >
                    Download Resume
                  </a>
                </div>
              </Show>
            </div>

            <Show when={selectedApplication()!.status === 'pending'}>
              <div class={styles.modalActions}>
                <button 
                  class={styles.acceptButton}
                  onClick={() => {
                    updateApplicationStatus(selectedApplication()!.id, 'accepted');
                    closeApplicationModal();
                  }}
                >
                  Accept Application
                </button>
                <button 
                  class={styles.rejectButton}
                  onClick={() => {
                    updateApplicationStatus(selectedApplication()!.id, 'rejected');
                    closeApplicationModal();
                  }}
                >
                  Reject Application
                </button>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}