import { createResource, createSignal, For, Show, onMount, onCleanup } from "solid-js";

type Application = {
  applicationId: string;
  workerId: string;
  workerName: string;
  workerEmail: string;
  workerPhone?: string;
  workerEducation?: string;
  workerSchool?: string;
  workerMajor?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedAt: string;
};

interface JobApplicationsViewProps {
  gigId: string;
}

async function fetchApplications(gigId: string): Promise<Application[]> {
  // Mock data for demonstration
  const mockData: Application[] = [
    { id: '1', applicantName: 'John Doe', applicantEmail: 'john.doe@example.com', applicantPhone: '123-456-7890', appliedAt: new Date().toISOString(), status: 'pending', message: 'I am very interested in this position and have relevant experience.' },
    { id: '2', applicantName: 'Jane Smith', applicantEmail: 'jane.smith@example.com', appliedAt: new Date().toISOString(), status: 'accepted', resume: '#' },
    { id: '3', applicantName: 'Peter Jones', applicantEmail: 'peter.jones@example.com', applicantPhone: '098-765-4321', appliedAt: new Date().toISOString(), status: 'rejected', message: 'Looking forward to hearing from you.' },
    { id: '4', applicantName: 'Mary Johnson', applicantEmail: 'mary.j@example.com', appliedAt: new Date().toISOString(), status: 'pending' },
  ];
  // In a real scenario, you would fetch from your API
  // return mockData;
  
  try {
    const response = await fetch(`/api/application/gig/${encodeURIComponent(gigId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json", "platform": "web-employer" },
      credentials: "include",
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch applications: ${response.status} ${errorText}`);
    }
<<<<<<< Updated upstream

    const result = await response.json();
    console.log('Applications loaded successfully:', result.data.applications.length);
    
    return result.data.applications;
=======
    return await response.json();
>>>>>>> Stashed changes
  } catch (fetchError: any) {
    // Returning mock data on error for demonstration
    console.error('Fetch error:', fetchError);
    return mockData;
    // throw new Error(`Network error: ${fetchError?.message || 'Unknown error'}`);
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  } catch {
    return dateStr;
  }
}

const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function JobApplicationsView(props: JobApplicationsViewProps) {
  const [applications, { refetch }] = createResource(() => props.gigId, fetchApplications);
  const [selectedApplication, setSelectedApplication] = createSignal<Application | null>(null);
  const [statusFilter, setStatusFilter] = createSignal<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>('all');

  const filteredApplications = () => {
    const apps = applications();
    if (!apps) return [];
    if (statusFilter() === 'all') return apps;
    return apps.filter(app => app.status === statusFilter());
  };

<<<<<<< Updated upstream
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return styles.statusPending;
      case 'approved': return styles.statusAccepted;
      case 'rejected': return styles.statusRejected;
      case 'cancelled': return styles.statusRejected;
      default: return '';
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/application/${applicationId}/review`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'platform': 'web-employer',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update application status: ${errorText}`);
      }

      // Refresh the applications list
=======
  const updateApplicationStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      // const response = await fetch(`/api/applications/${applicationId}/status`, {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json', 'platform': 'web-employer' },
      //   credentials: 'include',
      //   body: JSON.stringify({ status: newStatus }),
      // });
      // if (!response.ok) throw new Error('Failed to update status');
      console.log(`Updating status for ${applicationId} to ${newStatus}`);
>>>>>>> Stashed changes
      refetch();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status.');
    }
  };

  const openApplicationModal = (app: Application) => setSelectedApplication(app);
  const closeApplicationModal = () => setSelectedApplication(null);

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeApplicationModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => document.removeEventListener('keydown', handleKeyDown));
  });

  return (
    <div class="space-y-6">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg shadow">
        <h1 class="text-xl font-bold text-gray-800">Job Applications</h1>
        <div class="flex items-center space-x-2">
          <label for="status-filter" class="text-sm font-medium text-gray-700">Filter:</label>
          <select 
            id="status-filter" 
            class="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm"
            value={statusFilter()}
            onChange={(e) => setStatusFilter(e.currentTarget.value as any)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <Show when={applications.loading}>
        <p class="text-center text-gray-500 py-10">Loading applications...</p>
      </Show>

      <Show when={applications.error}>
        {err => <div class="text-center bg-red-50 p-8 rounded-lg"><h2 class="text-xl font-bold text-red-700">Error Loading Applications</h2><p class="text-red-600 mt-2">{(err() as Error).message}</p></div>}
      </Show>

      <Show when={filteredApplications()} fallback={<div class="text-center text-gray-500 py-10 bg-white rounded-lg shadow">No applications found.</div>}>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <For each={filteredApplications()}>
            {app => (
              <div class="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                <div class="p-5 flex-1">
                  <div class="flex justify-between items-start">
                    <h3 class="text-lg font-semibold text-gray-900">{app.applicantName}</h3>
                    <span class={`px-2 py-1 text-xs font-bold rounded-full ${statusStyles[app.status]}`}>{app.status}</span>
                  </div>
                  <p class="text-sm text-gray-500 mt-1">{app.applicantEmail}</p>
                  <p class="text-sm text-gray-500">Applied: {formatDate(app.appliedAt)}</p>
                </div>
                <div class="p-5 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
                  <button onClick={() => openApplicationModal(app)} class="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none">
                    Details
                  </button>
                  <Show when={app.status === 'pending'}>
                    <button onClick={() => updateApplicationStatus(app.id, 'accept')} class="px-3 py-1 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none">
                      Accept
                    </button>
                    <button onClick={() => updateApplicationStatus(app.id, 'reject')} class="px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none">
                      Reject
                    </button>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Modal */}
      <Show when={selectedApplication()}>
        {app => (
          <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeApplicationModal}>
            <div class="bg-white rounded-lg shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 class="text-xl font-bold">{app.applicantName}</h2>
                <button onClick={closeApplicationModal} class="text-gray-400 hover:text-gray-600">&times;</button>
              </div>
              <div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                <p><strong class="font-medium text-gray-600">Email:</strong> <a href={`mailto:${app.applicantEmail}`} class="text-blue-600 hover:underline">{app.applicantEmail}</a></p>
                <Show when={app.applicantPhone}><p><strong class="font-medium text-gray-600">Phone:</strong> {app.applicantPhone}</p></Show>
                <p><strong class="font-medium text-gray-600">Status:</strong> <span class={`px-2 py-1 text-xs font-bold rounded-full ${statusStyles[app.status]}`}>{app.status}</span></p>
                <Show when={app.message}><p><strong class="font-medium text-gray-600">Message:</strong><br/>{app.message}</p></Show>
                <Show when={app.resume}><a href={app.resume} target="_blank" class="text-blue-600 hover:underline">View Resume</a></Show>
              </div>
              <Show when={app.status === 'pending'}>
                <div class="p-6 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                  <button onClick={() => { updateApplicationStatus(app.id, 'accepted'); closeApplicationModal(); }} class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Accept</button>
                  <button onClick={() => { updateApplicationStatus(app.id, 'rejected'); closeApplicationModal(); }} class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Reject</button>
                </div>
              </Show>
            </div>
          </div>
        )}
      </Show>
<<<<<<< Updated upstream

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
                    <h3 class={styles.applicantName}>{application.workerName}</h3>
                    <span class={`${styles.status} ${getStatusColor(application.status)}`}>
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </span>
                  </div>
                  
                  <div class={styles.cardContent}>
                    <p class={styles.applicantInfo}>
                      <strong>Email:</strong> {application.workerEmail}
                    </p>
                    <Show when={application.workerPhone}>
                      <p class={styles.applicantInfo}>
                        <strong>Phone:</strong> {application.workerPhone}
                      </p>
                    </Show>
                    <Show when={application.workerEducation}>
                      <p class={styles.applicantInfo}>
                        <strong>Education:</strong> {application.workerEducation}
                      </p>
                    </Show>
                    <Show when={application.workerSchool}>
                      <p class={styles.applicantInfo}>
                        <strong>School:</strong> {application.workerSchool}
                      </p>
                    </Show>
                    <Show when={application.workerMajor}>
                      <p class={styles.applicantInfo}>
                        <strong>Major:</strong> {application.workerMajor}
                      </p>
                    </Show>
                    <p class={styles.applicantInfo}>
                      <strong>Applied:</strong> {formatDateToDDMMYYYY(application.appliedAt)}
                    </p>
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
                          onClick={() => updateApplicationStatus(application.applicationId, 'approved')}
                        >
                          Accept
                        </button>
                        <button 
                          class={styles.rejectButton}
                          onClick={() => updateApplicationStatus(application.applicationId, 'rejected')}
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
                <h3>{selectedApplication()!.workerName}</h3>
                <p><strong>Email:</strong> <a href={`mailto:${selectedApplication()!.workerEmail}`}>{selectedApplication()!.workerEmail}</a></p>
                <Show when={selectedApplication()!.workerPhone}>
                  <p><strong>Phone:</strong> <a href={`tel:${selectedApplication()!.workerPhone}`}>{selectedApplication()!.workerPhone}</a></p>
                </Show>
                <Show when={selectedApplication()!.workerEducation}>
                  <p><strong>Education:</strong> {selectedApplication()!.workerEducation}</p>
                </Show>
                <Show when={selectedApplication()!.workerSchool}>
                  <p><strong>School:</strong> {selectedApplication()!.workerSchool}</p>
                </Show>
                <Show when={selectedApplication()!.workerMajor}>
                  <p><strong>Major:</strong> {selectedApplication()!.workerMajor}</p>
                </Show>
                <p><strong>Applied on:</strong> {formatDateToDDMMYYYY(selectedApplication()!.appliedAt)}</p>
                <p><strong>Status:</strong> 
                  <span class={`${styles.status} ${getStatusColor(selectedApplication()!.status)}`}>
                    {selectedApplication()!.status.charAt(0).toUpperCase() + selectedApplication()!.status.slice(1)}
                  </span>
                </p>
              </div>
            </div>

            <Show when={selectedApplication()!.status === 'pending'}>
              <div class={styles.modalActions}>
                <button 
                  class={styles.acceptButton}
                  onClick={() => {
                    updateApplicationStatus(selectedApplication()!.applicationId, 'approved');
                    closeApplicationModal();
                  }}
                >
                  Accept Application
                </button>
                <button 
                  class={styles.rejectButton}
                  onClick={() => {
                    updateApplicationStatus(selectedApplication()!.applicationId, 'rejected');
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
=======
>>>>>>> Stashed changes
    </div>
  );
}
