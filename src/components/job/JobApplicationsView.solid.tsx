// JobApplicationsView.solid.tsx
import { createResource, createSignal, For, Show, onCleanup, createEffect } from "solid-js";
import styles from "../../styles/JobApplications.module.css";

// Shared Types & Helpers
type JobExperience = {
  jobTitle?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
};

type Certificate = {
  name?: string;
  issuer?: string;
  date?: string;
};

type Application = {
  applicationId: string;
  workerId: string;
  workerName: string;
  workerEmail: string;
  workerPhone?: string;
  workerEducation?: string;
  workerSchool?: string;
  workerMajor?: string;
  workerCertificates?: string | Certificate[] | null; // Should be JSON string from database
  workerJobExperience?: string | JobExperience[] | null; // Should be JSON string from database
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedAt: string;
};

function formatDateToDDMMYYYY(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'pending': return styles.statusPending;
    case 'approved': return styles.statusAccepted;
    case 'rejected':
    case 'cancelled': return styles.statusRejected;
    default: return '';
  }
}

// Helper functions to parse JSON fields - handles multiple data formats
function parseJobExperience(experience: string | JobExperience[] | null | undefined): JobExperience[] {
  console.log('🔍 Parsing job experience:', {
    type: typeof experience,
    value: experience,
    isNull: experience === null,
    isUndefined: experience === undefined,
    isArray: Array.isArray(experience),
    arrayLength: Array.isArray(experience) ? experience.length : 'N/A'
  });

  // Handle null, undefined, or falsy values
  if (experience === null || experience === undefined) {
    console.log('❌ Job experience is null/undefined');
    return [];
  }
  
  // If already an array, validate and return
  if (Array.isArray(experience)) {
    console.log('✅ Job experience is already an array with length:', experience.length);
    
    if (experience.length === 0) {
      console.log('❌ Job experience array is empty');
      return [];
    }
    
    // Validate each experience object has expected structure
    const validExperiences = experience.filter(exp => 
      exp && typeof exp === 'object' && 
      (exp.jobTitle || exp.company || exp.startDate || exp.endDate || exp.description)
    );
    console.log('✅ Valid experiences after filtering:', validExperiences);
    return validExperiences;
  }
  
  // Handle string cases (JSON strings from database)
  if (typeof experience === 'string') {
    const trimmed = experience.trim();
    
    if (trimmed === '' || trimmed === '[]' || trimmed === 'null') {
      console.log('❌ Job experience is empty or null string');
      return [];
    }
    
    try {
      const parsed = JSON.parse(trimmed);
      console.log('✅ Parsed job experience JSON:', parsed);
      
      if (Array.isArray(parsed)) {
        const validExperiences = parsed.filter(exp => 
          exp && typeof exp === 'object' && 
          (exp.jobTitle || exp.company || exp.startDate || exp.endDate || exp.description)
        );
        return validExperiences;
      }
      return [];
    } catch (error) {
      console.warn('❌ Failed to parse job experience JSON:', error);
      return [];
    }
  }
  
  return [];
}

function parseCertificates(certificates: string | Certificate[] | string[] | null | undefined): Certificate[] {
  console.log('🔍 Parsing certificates:', {
    type: typeof certificates,
    value: certificates,
    isNull: certificates === null,
    isUndefined: certificates === undefined,
    isArray: Array.isArray(certificates),
    arrayLength: Array.isArray(certificates) ? certificates.length : 'N/A'
  });

  // Handle null, undefined, or falsy values
  if (certificates === null || certificates === undefined) {
    console.log('❌ Certificates is null/undefined');
    return [];
  }
  
  // If already an array, handle both object and string arrays
  if (Array.isArray(certificates)) {
    console.log('✅ Certificates is already an array with length:', certificates.length);
    
    if (certificates.length === 0) {
      console.log('❌ Certificates array is empty');
      return [];
    }
    
    // Check if it's array of strings (like ["Java SCJP", "AWS Solutions Architect"])
    if (certificates.every(cert => typeof cert === 'string')) {
      console.log('✅ Converting string array to certificate objects');
      const convertedCerts = certificates.map(certName => ({
        name: certName,
        issuer: undefined,
        date: undefined
      }));
      console.log('✅ Converted certificates:', convertedCerts);
      return convertedCerts;
    }
    
    // Check if it's array of objects
    if (certificates.every(cert => typeof cert === 'object' && cert !== null)) {
      console.log('✅ Certificates is array of objects');
      const validCertificates = certificates.filter(cert => 
        cert && typeof cert === 'object' && 
        (cert.name || cert.issuer || cert.date)
      );
      console.log('✅ Valid certificates after filtering:', validCertificates);
      return validCertificates;
    }
    
    console.log('❌ Mixed array format, filtering valid items');
    // Handle mixed array (some strings, some objects)
    return certificates
      .map(cert => {
        if (typeof cert === 'string') {
          return { name: cert, issuer: undefined, date: undefined };
        }
        if (typeof cert === 'object' && cert !== null && (cert.name || cert.issuer || cert.date)) {
          return cert;
        }
        return null;
      })
      .filter(cert => cert !== null);
  }
  
  // Handle string cases (JSON strings from database)
  if (typeof certificates === 'string') {
    const trimmed = certificates.trim();
    
    if (trimmed === '' || trimmed === '[]' || trimmed === 'null') {
      console.log('❌ Certificates is empty or null string');
      return [];
    }
    
    try {
      const parsed = JSON.parse(trimmed);
      console.log('✅ Parsed certificates JSON:', parsed);
      
      if (Array.isArray(parsed)) {
        // Handle both string arrays and object arrays from JSON
        if (parsed.every(cert => typeof cert === 'string')) {
          return parsed.map(certName => ({
            name: certName,
            issuer: undefined,
            date: undefined
          }));
        }
        
        const validCertificates = parsed.filter(cert => 
          cert && typeof cert === 'object' && 
          (cert.name || cert.issuer || cert.date)
        );
        return validCertificates;
      }
      return [];
    } catch (error) {
      console.warn('❌ Failed to parse certificates JSON:', error);
      return [];
    }
  }
  
  return [];
}

async function updateApplicationStatus(applicationId: string, newStatus: 'approved' | 'rejected') {
  const response = await fetch(`/api/application/${applicationId}/review`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      platform: 'web-employer',
    },
    credentials: 'include',
    body: JSON.stringify({ status: newStatus }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update application status: ${errorText}`);
  }
}

interface JobApplicationsViewProps {
  gigId: string;
}

async function fetchApplications(gigId: string): Promise<Application[]> {
  try {
    const response = await fetch(`/api/application/gig/${encodeURIComponent(gigId)}`, {
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

    const result = await response.json();
    console.log('🔍 Full API Response:', result);
    console.log('🔍 Applications data:', result.data.applications);
    
    // Debug each application's certificate and experience data
    result.data.applications.forEach((app: Application, index: number) => {
      console.log(`🔍 Application ${index + 1} (${app.workerName}):`, {
        certificatesRaw: app.workerCertificates,
        certificatesType: typeof app.workerCertificates,
        certificatesLength: typeof app.workerCertificates === 'string' ? app.workerCertificates.length : 'N/A',
        experienceRaw: app.workerJobExperience,
        experienceType: typeof app.workerJobExperience,
        experienceLength: typeof app.workerJobExperience === 'string' ? app.workerJobExperience.length : 'N/A'
      });
    });
    
    console.log('Applications loaded successfully:', result.data.applications.length);
    
    return result.data.applications;
  } catch (fetchError: any) {
    console.error('Fetch error:', fetchError);
    throw new Error(`Network error: ${fetchError?.message || 'Unknown error'}`);
  }
}

export default function JobApplicationsView(props: JobApplicationsViewProps) {
  // Get initial status from URL params (both 'status' and 'filter' for compatibility)
  const getInitialStatusFilter = () => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status') || params.get('filter');
    
    // Validate the status parameter
    const validStatuses = ['all', 'pending', 'approved', 'rejected', 'cancelled'];
    if (statusParam && validStatuses.includes(statusParam)) {
      return statusParam as 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';
    }
    return 'all';
  };

  // Declare all signals first
  const [applications, { refetch }] = createResource(() => props.gigId, fetchApplications);
  const [selectedApplication, setSelectedApplication] = createSignal<Application | null>(null);
  const [statusFilter, setStatusFilter] = createSignal<'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'>(
    getInitialStatusFilter()
  );
  const [updating, setUpdating] = createSignal<string | null>(null);

  // Debug effect to log application data when it loads
  createEffect(() => {
    const apps = applications();
    if (apps && apps.length > 0) {
      console.log('🔍 DEBUG: Applications loaded, checking first application:');
      const firstApp = apps[0];
      console.log('First application full data:', firstApp);
      console.log('Certificate data detailed analysis:');
      console.log('- Type:', typeof firstApp.workerCertificates);
      console.log('- Value:', firstApp.workerCertificates);
      console.log('- String length:', typeof firstApp.workerCertificates === 'string' ? firstApp.workerCertificates.length : 'N/A');
      console.log('- Is empty string:', firstApp.workerCertificates === '');
      
      console.log('Experience data detailed analysis:');
      console.log('- Type:', typeof firstApp.workerJobExperience);
      console.log('- Value:', firstApp.workerJobExperience);
      console.log('- String length:', typeof firstApp.workerJobExperience === 'string' ? firstApp.workerJobExperience.length : 'N/A');
      console.log('- Is empty string:', firstApp.workerJobExperience === '');
      
      // Test parsing functions
      console.log('🧪 Testing parsing functions:');
      const parsedCerts = parseCertificates(firstApp.workerCertificates);
      const parsedExp = parseJobExperience(firstApp.workerJobExperience);
      console.log('Final parsed certificates result:', parsedCerts);
      console.log('Final parsed experience result:', parsedExp);
    }
  });

  // Declare all functions
  const filteredApplications = () => {
    const apps = applications();
    if (!apps) return [];
    
    if (statusFilter() === 'all') return apps;
    return apps.filter(app => app.status === statusFilter());
  };

  const openApplicationModal = (application: Application) => {
    console.log('🔍 Opening modal for application:', application);
    console.log('🔍 Modal data - Certificates:', application.workerCertificates);
    console.log('🔍 Modal data - Experience:', application.workerJobExperience);
    setSelectedApplication(application);
    document.body.style.overflow = 'hidden';
  };

  const closeApplicationModal = () => {
    setSelectedApplication(null);
    document.body.style.overflow = 'auto';
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: 'approved' | 'rejected') => {
    setUpdating(applicationId);
    try {
      await updateApplicationStatus(applicationId, newStatus);
      await refetch();
      closeApplicationModal();
    } catch (error) {
      console.error('Error updating application status:', error);
      alert('Failed to update application status. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeApplicationModal();
    }
  };

  // Listen for URL changes (back/forward browser buttons)
  const handlePopState = () => {
    setStatusFilter(getInitialStatusFilter());
  };

  // Effects and event listeners
  // Sync URL with filter changes
  createEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (statusFilter() === 'all') {
      params.delete('status');
    } else {
      params.set('status', statusFilter());
    }
    
    // Update URL without reloading the page
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  });

  // Set up event listeners
  window.addEventListener('popstate', handlePopState);
  document.addEventListener('keydown', handleKeyDown);
  
  // Cleanup event listener
  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'auto'; // Reset overflow on cleanup
    window.removeEventListener('popstate', handlePopState); // Clean up popstate listener
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
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
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
            <p class={styles.error}>Error: {(err() as Error).message}</p>
          </div>
        )}
      </Show>

      <Show when={applications()}>
        <div class={styles.applicationsGrid}>
          <Show 
            when={filteredApplications().length > 0} 
            fallback={
              <div class={styles.noApplications}>
                No {statusFilter() === 'all' ? '' : statusFilter()} applications found.
              </div>
            }
          >
            <For each={filteredApplications()}>
              {(application) => (
                <div class={styles.applicationCard}>
                  <div class={styles.cardHeader}>
                    <h3 class={styles.applicantName}>{application.workerName}</h3>
                    <span class={`${styles.status} ${getStatusClass(application.status)}`}>
                      {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </span>
                  </div>
                  <div class={styles.cardContent}>
                    <p class={styles.applicantInfo}><strong>Email:</strong> {application.workerEmail}</p>
                    <Show when={application.workerPhone}>
                      <p class={styles.applicantInfo}><strong>Phone:</strong> {application.workerPhone}</p>
                    </Show>
                    <Show when={application.workerEducation}>
                      <p class={styles.applicantInfo}><strong>Education:</strong> {application.workerEducation}</p>
                    </Show>
                    <Show when={application.workerSchool}>
                      <p class={styles.applicantInfo}><strong>School:</strong> {application.workerSchool}</p>
                    </Show>
                    <Show when={application.workerMajor}>
                      <p class={styles.applicantInfo}><strong>Major:</strong> {application.workerMajor}</p>
                    </Show>
                    
                    {/* Display certificates info in card preview */}
                    <div class={styles.applicantInfo}>
                      <strong>Certificates:</strong> 
                      <Show 
                        when={parseCertificates(application.workerCertificates).length > 0} 
                        fallback={<span class={styles.noData}> None</span>}
                      >
                        <span> {parseCertificates(application.workerCertificates).length} certificate(s)</span>
                      </Show>
                    </div>

                    {/* Display experience info in card preview */}
                    <div class={styles.applicantInfo}>
                      <strong>Experience:</strong> 
                      <Show 
                        when={parseJobExperience(application.workerJobExperience).length > 0} 
                        fallback={<span class={styles.noData}> None</span>}
                      >
                        <span> {parseJobExperience(application.workerJobExperience).length} job(s)</span>
                      </Show>
                    </div>
                    
                    <p class={styles.applicantInfo}><strong>Applied:</strong> {formatDateToDDMMYYYY(application.appliedAt)}</p>
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
                          onClick={() => handleUpdateStatus(application.applicationId, 'approved')}
                          disabled={updating() === application.applicationId}
                        >
                          {updating() === application.applicationId ? 'Accepting...' : 'Accept'}
                        </button>
                        <button 
                          class={styles.rejectButton} 
                          onClick={() => handleUpdateStatus(application.applicationId, 'rejected')}
                          disabled={updating() === application.applicationId}
                        >
                          {updating() === application.applicationId ? 'Rejecting...' : 'Reject'}
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

      <Show when={selectedApplication()}>
        <div class={styles.applicationModal} onClick={closeApplicationModal}>
          <div class={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div class={styles.modalHeader}>
              <h2>Application Details</h2>
              <button class={styles.modalClose} onClick={closeApplicationModal}>×</button>
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
                <p><strong>Status:</strong> <span class={`${styles.status} ${getStatusClass(selectedApplication()!.status)}`}>{selectedApplication()!.status.charAt(0).toUpperCase() + selectedApplication()!.status.slice(1)}</span></p>
                
                {/* Work Experience Section */}
                <div class={styles.section}>
                  <h4>Work Experience</h4>
                  <Show 
                    when={parseJobExperience(selectedApplication()!.workerJobExperience).length > 0}
                    fallback={<p class={styles.noData}>No work experience provided</p>}
                  >
                    <For each={parseJobExperience(selectedApplication()!.workerJobExperience)}>
                      {(exp) => (
                        <div class={styles.experienceItem}>
                          <p><strong>{exp.jobTitle || 'N/A'}</strong> at {exp.company || 'N/A'}</p>
                          <p class={styles.dates}>
                            {exp.startDate || 'N/A'} - {exp.endDate || 'Present'}
                          </p>
                          <Show when={exp.description}>
                            <p class={styles.description}>{exp.description}</p>
                          </Show>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
                
                {/* Certificates Section */}
                <div class={styles.section}>
                  <h4>Certificates</h4>
                  <Show 
                    when={parseCertificates(selectedApplication()!.workerCertificates).length > 0}
                    fallback={<p class={styles.noData}>No certificates provided</p>}
                  >
                    <For each={parseCertificates(selectedApplication()!.workerCertificates)}>
                      {(cert) => (
                        <div class={styles.certificateItem}>
                          <p><strong>{cert.name || 'N/A'}</strong></p>
                          <Show when={cert.issuer}>
                            <p class={styles.issuer}>Issued by: {cert.issuer}</p>
                          </Show>
                          <Show when={cert.date}>
                            <p class={styles.certDate}>Date: {cert.date}</p>
                          </Show>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
              </div>
            </div>
            <Show when={selectedApplication()!.status === 'pending'}>
              <div class={styles.modalActions}>
                <button 
                  class={styles.acceptButton} 
                  onClick={() => handleUpdateStatus(selectedApplication()!.applicationId, 'approved')}
                  disabled={updating() === selectedApplication()!.applicationId}
                >
                  {updating() === selectedApplication()!.applicationId ? 'Accepting...' : 'Accept Application'}
                </button>
                <button 
                  class={styles.rejectButton} 
                  onClick={() => handleUpdateStatus(selectedApplication()!.applicationId, 'rejected')}
                  disabled={updating() === selectedApplication()!.applicationId}
                >
                  {updating() === selectedApplication()!.applicationId ? 'Rejecting...' : 'Reject Application'}
                </button>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}