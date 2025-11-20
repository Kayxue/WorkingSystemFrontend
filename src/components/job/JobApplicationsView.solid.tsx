import { createResource, createSignal, For, Show, onCleanup, createEffect } from "solid-js";
import styles from "../../styles/JobApplications.module.css";

// 共享類型與輔助函數
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

// Rating 類型
type WorkerRating = {
  totalRatings: number;
  averageRating: number;
  ratingBreakdown?: {
    [key: number]: number;
  };
};

type RatingDetail = {
  name: string;
  ratingId: string;
  ratingValue: number;
  comment: string | null;
  createdAt: string;
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
  workerCertificates?: string | Certificate[] | null;
  workerJobExperience?: string | JobExperience[] | null;
  workerProfilePhoto?: any;
  workerRating?: WorkerRating;
  status: 'pending_employer_review' | 'employer_rejected' | 'pending_worker_confirmation' | 'worker_confirmed' | 'worker_declined' | 'worker_cancelled' | 'system_cancelled';
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
    case 'pending_employer_review': return styles.statusPending;
    case 'pending_worker_confirmation': return styles.statusPending;
    case 'worker_confirmed': return styles.statusAccepted;
    case 'employer_rejected':
    case 'worker_declined':
    case 'worker_cancelled':
    case 'system_cancelled': return styles.statusRejected;
    default: return '';
  }
}

function getStatusDisplayText(status: string): string {
  switch (status) {
    case 'pending_employer_review': return '待企業審核';
    case 'employer_rejected': return '企業拒絕';
    case 'pending_worker_confirmation': return '待打工者回覆';
    case 'worker_confirmed': return '打工者確定來上班';
    case 'worker_declined': return '打工者拒絕來上班';
    case 'worker_cancelled': return '打工者主動取消';
    case 'system_cancelled': return '系統取消';
    default: return status;
  }
}

// 渲染星星評分的函數
function renderStarRating(rating: number, totalRatings?: number) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div class={styles.ratingDisplay}>
      <div class={styles.stars}>
        {/* 完整星星 */}
        <For each={Array(fullStars).fill(0)}>
          {() => (
            <span class={styles.fullStar}>★</span>
          )}
        </For>
        
        {/* 半顆星星 */}
        <Show when={hasHalfStar}>
          <span class={styles.halfStar}>★</span>
        </Show>
        
        {/* 空星星 */}
        <For each={Array(5 - fullStars - (hasHalfStar ? 1 : 0)).fill(0)}>
          {() => (
            <span class={styles.emptyStar}>☆</span>
          )}
        </For>
      </div>
      <span class={styles.ratingValue}>
        {rating.toFixed(1)}{totalRatings ? ` (${totalRatings})` : ''}
      </span>
    </div>
  );
}

// 解析 JSON 欄位的輔助函數
function parseJobExperience(experience: string | JobExperience[] | null | undefined): JobExperience[] {
  if (experience === null || experience === undefined) {
    return [];
  }
  
  if (Array.isArray(experience)) {
    if (experience.length === 0) return [];
    
    // 如果是字串陣列,轉換成物件格式
    if (experience.every(exp => typeof exp === 'string')) {
      return (experience as string[]).map(exp => ({
        jobTitle: exp,
        company: '',
        description: ''
      }));
    }
    
    const validExperiences = experience.filter(exp => 
      exp && typeof exp === 'object' && 
      (exp.jobTitle || exp.company || exp.startDate || exp.endDate || exp.description)
    );
    return validExperiences;
  }
  
  if (typeof experience === 'string') {
    const trimmed = experience.trim();
    if (trimmed === '' || trimmed === '[]' || trimmed === 'null') return [];
    
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        // 處理字串陣列
        if (parsed.every(exp => typeof exp === 'string')) {
          return parsed.map(exp => ({
            jobTitle: exp,
            company: '',
            description: ''
          }));
        }
        
        const validExperiences = parsed.filter(exp => 
          exp && typeof exp === 'object' && 
          (exp.jobTitle || exp.company || exp.startDate || exp.endDate || exp.description)
        );
        return validExperiences;
      }
      return [];
    } catch (error) {
      console.warn('解析工作經驗 JSON 失敗:', error);
      return [];
    }
  }
  
  return [];
}

function parseCertificates(certificates: string | Certificate[] | string[] | null | undefined): Certificate[] {
  if (certificates === null || certificates === undefined) {
    return [];
  }
  
  if (Array.isArray(certificates)) {
    if (certificates.length === 0) return [];
    
    // 如果是字串陣列,轉換成物件格式
    if (certificates.every(cert => typeof cert === 'string')) {
      return (certificates as string[]).map(certName => ({
        name: certName,
        issuer: '',
        date: ''
      }));
    }
    
    const validCertificates = certificates.filter(cert => 
      cert && typeof cert === 'object' && 
      (cert.name || cert.issuer || cert.date)
    );
    return validCertificates;
  }
  
  if (typeof certificates === 'string') {
    const trimmed = certificates.trim();
    if (trimmed === '' || trimmed === '[]' || trimmed === 'null') return [];
    
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        // 處理字串陣列
        if (parsed.every(cert => typeof cert === 'string')) {
          return parsed.map(certName => ({
            name: certName,
            issuer: '',
            date: ''
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
      console.warn('解析證書 JSON 失敗:', error);
      return [];
    }
  }
  
  return [];
}

async function updateApplicationStatus(applicationId: string, newStatus: 'pending_worker_confirmation' | 'employer_rejected') {
  const action = newStatus === 'pending_worker_confirmation' ? 'approve' : 'reject';

  const response = await fetch(`/api/application/${applicationId}/review`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      platform: 'web-employer',
    },
    credentials: 'include',
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`更新申請狀態失敗: ${errorText}`);
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
      console.error('API 錯誤:', response.status, errorText);
      throw new Error(`取得申請失敗: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('🔍 完整 API 回應:', result);
    console.log('🔍 申請資料:', result.data.applications);
    
    // 除錯每個申請的評分資料
    result.data.applications.forEach((app: Application, index: number) => {
      console.log(`申請 ${index + 1} (${app.workerName}) 評分:`, app.workerRating);
    });
    
    return result.data.applications;
  } catch (fetchError: any) {
    console.error('取得錯誤:', fetchError);
    throw new Error(`網路錯誤: ${fetchError?.message || '未知錯誤'}`);
  }
}

async function fetchWorkerRatingDetails(workerId: string): Promise<RatingDetail[]> {
  try {
    const response = await fetch(`/api/rating/detail/worker/${encodeURIComponent(workerId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "platform": "web-employer",
      },
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch worker rating details: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    return result.data?.receivedRatings || [];
  } catch (error) {
    console.error("❌ Failed to load worker rating details:", error);
    return [];
  }
}


export default function JobApplicationsView(props: JobApplicationsViewProps) {
  const getInitialStatusFilter = () => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status') || params.get('filter');
    
    const validStatuses = ['all', 'pending_employer_review', 'employer_rejected', 'pending_worker_confirmation', 'worker_confirmed', 'worker_declined', 'worker_cancelled', 'system_cancelled'];
    if (statusParam && validStatuses.includes(statusParam)) {
      return statusParam as 'all' | 'pending_employer_review' | 'employer_rejected' | 'pending_worker_confirmation' | 'worker_confirmed' | 'worker_declined' | 'worker_cancelled' | 'system_cancelled';
    }
    return 'all';
  };

  const [applications, { refetch }] = createResource(() => props.gigId, fetchApplications);
  const [selectedApplication, setSelectedApplication] = createSignal<Application | null>(null);
  const [ratingDetails, setRatingDetails] = createSignal<RatingDetail[]>([]);
  const [loadingRatings, setLoadingRatings] = createSignal(false);
  const [statusFilter, setStatusFilter] = createSignal<'all' | 'pending_employer_review' | 'employer_rejected' | 'pending_worker_confirmation' | 'worker_confirmed' | 'worker_declined' | 'worker_cancelled' | 'system_cancelled'>(
    getInitialStatusFilter()
  );
  const [updating, setUpdating] = createSignal<string | null>(null);

  createEffect(() => {
    const apps = applications();
    if (apps && apps.length > 0) {
      console.log('🔍 申請已載入,檢查評分資料:');
      apps.forEach((app, index) => {
        console.log(`申請 ${index + 1} (${app.workerName}):`, {
          評分: app.workerRating,
          平均: app.workerRating?.averageRating,
          總評價數: app.workerRating?.totalRatings
        });
      });
    }
  });

  const filteredApplications = () => {
    const apps = applications();
    if (!apps) return [];
    
    if (statusFilter() === 'all') return apps;
    return apps.filter(app => app.status === statusFilter());
  };

  const openApplicationModal = async (application: Application) => {
    setSelectedApplication(application);
    setLoadingRatings(true);
    document.body.classList.add("modal-open");
    
    // Fetch rating details for this worker
    const details = await fetchWorkerRatingDetails(application.workerId);
    setRatingDetails(details);
    setLoadingRatings(false);
  };

  const closeApplicationModal = () => {
    setSelectedApplication(null);
    setRatingDetails([]);
    document.body.classList.remove("modal-open");
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: 'pending_worker_confirmation' | 'employer_rejected') => {
    setUpdating(applicationId);
    try {
      await updateApplicationStatus(applicationId, newStatus);
      await refetch();
      closeApplicationModal();
    } catch (error) {
      console.error('更新申請狀態時發生錯誤:', error);
      alert('更新申請狀態失敗,請重試。');
    } finally {
      setUpdating(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeApplicationModal();
    }
  };

  const handlePopState = () => {
    setStatusFilter(getInitialStatusFilter());
  };

  createEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (statusFilter() === 'all') {
      params.delete('status');
    } else {
      params.set('status', statusFilter());
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  });

  window.addEventListener('popstate', handlePopState);
  document.addEventListener('keydown', handleKeyDown);
  
  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'auto';
    window.removeEventListener('popstate', handlePopState);
  });

  return (
    <div class={styles.applicationsContainer}>
      <div class={styles.header}>
        <h1 class={styles.pageTitle}>工作申請</h1>
        <div class={styles.filterContainer}>
          <label for="status-filter">依狀態篩選:</label>
          <select 
            id="status-filter" 
            class={styles.statusFilter}
            value={statusFilter()}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">所有申請</option>
            <option value="pending_employer_review">待企業審核</option>
            <option value="employer_rejected">企業拒絕</option>
            <option value="pending_worker_confirmation">待打工者回覆</option>
            <option value="worker_confirmed">打工者確定來上班</option>
            <option value="worker_declined">打工者拒絕來上班</option>
            <option value="worker_cancelled">打工者主動取消</option>
            <option value="system_cancelled">系統取消</option>
          </select>
        </div>
      </div>

      <Show when={applications.loading}>
        <p class={styles.loading}>載入申請中...</p>
      </Show>

      <Show when={applications.error}>
        {(err) => (
          <div class={styles.errorContainer}>
            <h2>載入申請時發生錯誤</h2>
            <p class={styles.error}>錯誤: {(err() as Error).message}</p>
          </div>
        )}
      </Show>

      <Show when={applications()}>
        <div class={styles.applicationsGrid}>
          <Show 
            when={filteredApplications().length > 0} 
            fallback={
              <div class={styles.noApplications}>
                找不到{statusFilter() === 'all' ? '' : getStatusDisplayText(statusFilter())}的申請。
              </div>
            }
          >
            <For each={filteredApplications()}>
              {(application) => (
                <div class={styles.applicationCard}>
                  <div class={styles.cardHeader}>
                    <div class={styles.applicantBasicInfo}>
                      <h3 class={styles.applicantName}>{application.workerName}</h3>
                      {/* 顯示評分在名字下面 */}
                      <Show when={application.workerRating}>
                        <div class={styles.ratingCompact}>
                          {renderStarRating(application.workerRating!.averageRating, application.workerRating!.totalRatings)}
                        </div>
                      </Show>
                    </div>
                    <span class={`${styles.status} ${getStatusClass(application.status)}`}>
                      {getStatusDisplayText(application.status)}
                    </span>
                  </div>

                  <div class={styles.cardContent}>
                    <p class={styles.applicantInfo}>
                      <strong>電子郵件:</strong> {application.workerEmail}
                    </p>
                    <Show when={application.workerPhone}>
                      <p class={styles.applicantInfo}>
                        <strong>電話:</strong> {application.workerPhone}
                      </p>
                    </Show>
                    <Show when={application.workerEducation}>
                      <p class={styles.applicantInfo}>
                        <strong>教育程度:</strong> {application.workerEducation}
                      </p>
                    </Show>
                    <Show when={application.workerSchool}>
                      <p class={styles.applicantInfo}>
                        <strong>學校:</strong> {application.workerSchool}
                      </p>
                    </Show>
                    <Show when={application.workerMajor}>
                      <p class={styles.applicantInfo}>
                        <strong>學系:</strong> {application.workerMajor}
                      </p>
                    </Show>
                    
                    <div class={styles.applicantInfo}>
                      <strong>證書:</strong> 
                      <Show 
                        when={parseCertificates(application.workerCertificates).length > 0} 
                        fallback={<span class={styles.noData}> 無</span>}
                      >
                        <span> {parseCertificates(application.workerCertificates).length} 張證書</span>
                      </Show>
                    </div>

                    <div class={styles.applicantInfo}>
                      <strong>工作經驗:</strong> 
                      <Show 
                        when={parseJobExperience(application.workerJobExperience).length > 0} 
                        fallback={<span class={styles.noData}> 無</span>}
                      >
                        <span> {parseJobExperience(application.workerJobExperience).length} 份工作</span>
                      </Show>
                    </div>
                    
                    <p class={styles.applicantInfo}>
                      <strong>申請時間:</strong> {formatDateToDDMMYYYY(application.appliedAt)}
                    </p>
                  </div>
                  <div class={styles.cardActions}>
                    <button 
                      class={styles.viewButton} 
                      onClick={() => openApplicationModal(application)}
                    >
                      查看詳情
                    </button>
                    <Show when={application.status === 'pending_employer_review'}>
                      <div class={styles.actionButtons}>
                        <button 
                          class={styles.acceptButton} 
                          onClick={() => handleUpdateStatus(application.applicationId, 'pending_worker_confirmation')}
                          disabled={updating() === application.applicationId}
                        >
                          {updating() === application.applicationId ? '接受中...' : '接受'}
                        </button>
                        <button 
                          class={styles.rejectButton} 
                          onClick={() => handleUpdateStatus(application.applicationId, 'employer_rejected')}
                          disabled={updating() === application.applicationId}
                        >
                          {updating() === application.applicationId ? '拒絕中...' : '拒絕'}
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
              <h2>申請詳情</h2>
              <button class={styles.modalClose} onClick={closeApplicationModal}>×</button>
            </div>
            <div class={styles.modalBody}>
              <div class={styles.applicantDetails}>
                <div class={styles.modalApplicantHeader}>
                  <h3>{selectedApplication()!.workerName}</h3>
                  <Show when={selectedApplication()!.workerRating}>
                    <div class={styles.modalRating}>
                      {renderStarRating(selectedApplication()!.workerRating!.averageRating, selectedApplication()!.workerRating!.totalRatings)}
                    </div>
                  </Show>
                </div>

                <div class={styles.contactInfo}>
                  <p><strong>電子郵件:</strong> <a href={`mailto:${selectedApplication()!.workerEmail}`}>{selectedApplication()!.workerEmail}</a></p>
                  <Show when={selectedApplication()!.workerPhone}>
                    <p><strong>電話:</strong> <a href={`tel:${selectedApplication()!.workerPhone}`}>{selectedApplication()!.workerPhone}</a></p>
                  </Show>
                </div>

                <div class={styles.educationInfo}>
                  <Show when={selectedApplication()!.workerEducation}>
                    <p><strong>教育程度:</strong> {selectedApplication()!.workerEducation}</p>
                  </Show>
                  <Show when={selectedApplication()!.workerSchool}>
                    <p><strong>學校:</strong> {selectedApplication()!.workerSchool}</p>
                  </Show>
                  <Show when={selectedApplication()!.workerMajor}>
                    <p><strong>主修:</strong> {selectedApplication()!.workerMajor}</p>
                  </Show>
                </div>

                <div class={styles.applicationInfo}>
                  <p><strong>申請日期:</strong> {formatDateToDDMMYYYY(selectedApplication()!.appliedAt)}</p>
                  <p><strong>狀態:</strong> <span class={`${styles.status} ${getStatusClass(selectedApplication()!.status)}`}>{getStatusDisplayText(selectedApplication()!.status)}</span></p>
                </div>
                
                <div class={styles.section}>
                  <h4>工作經驗</h4>
                  <Show 
                    when={parseJobExperience(selectedApplication()!.workerJobExperience).length > 0}
                    fallback={<p class={styles.noData}>未提供工作經驗</p>}
                  >
                    <div class={styles.experienceList}>
                      <For each={parseJobExperience(selectedApplication()!.workerJobExperience)}>
                        {(exp, index) => (
                          <div class={styles.experienceItem}>
                            <div class={styles.experienceHeader}>
                              <strong>{exp.jobTitle || '未指定職位'}</strong>
                              <Show when={exp.company}>
                                <span class={styles.company}>@{exp.company}</span>
                              </Show>
                            </div>
                            <Show when={exp.startDate || exp.endDate}>
                              <p class={styles.dates}>
                                {exp.startDate || 'N/A'} - {exp.endDate || '現在'}
                              </p>
                            </Show>
                            <Show when={exp.description}>
                              <p class={styles.description}>{exp.description}</p>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
                
                <div class={styles.section}>
                  <h4>證書</h4>
                  <Show 
                    when={parseCertificates(selectedApplication()!.workerCertificates).length > 0}
                    fallback={<p class={styles.noData}>未提供證書</p>}
                  >
                    <div class={styles.certificateList}>
                      <For each={parseCertificates(selectedApplication()!.workerCertificates)}>
                        {(cert) => (
                          <div class={styles.certificateItem}>
                            <p><strong>{cert.name || '未指定證書名稱'}</strong></p>
                            <Show when={cert.issuer}>
                              <p class={styles.issuer}>發行機構: {cert.issuer}</p>
                            </Show>
                            <Show when={cert.date}>
                              <p class={styles.certDate}>取得日期: {cert.date}</p>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>

                <div class={styles.section}>
                  <h4>評價詳情</h4>
                  <Show when={loadingRatings()}>
                    <p class={styles.loading}>載入評價中...</p>
                  </Show>
                  <Show when={!loadingRatings() && ratingDetails().length > 0}>
                    <div class={styles.ratingDetailsList}>
                      <For each={ratingDetails()}>
                        {(rating) => (
                        <div class={styles.ratingDetailItem}>
                          <div class={styles.raterInfo}>
                            <img 
                              src={'anonymous-profile-photo.png'} 
                              alt="Rater Profile" 
                              class={styles.raterAvatar} 
                            />
                            <span class={styles.raterName}>{rating.name}</span>
                          </div>
                          <div class={styles.ratingDetailHeader}>
                            <div class={styles.ratingStars}>
                              {renderStarRating(rating.ratingValue)}
                            </div>
                            <span class={styles.ratingDate}>
                              {formatDateToDDMMYYYY(rating.createdAt)}
                            </span>
                          </div>

                          <Show when={rating.comment}>
                            <p class={styles.ratingComment}>{rating.comment}</p>
                          </Show>

                          <div class={styles.ratingDivider}></div>
                        </div>
                      )}

                      </For>
                    </div>
                  </Show>
                  <Show when={!loadingRatings() && ratingDetails().length === 0}>
                    <p class={styles.noData}>此打工者尚未收到任何評價</p>
                  </Show>
                </div>
              </div>
            </div>
            <Show when={selectedApplication()!.status === 'pending_employer_review'}>
              <div class={styles.modalActions}>
                <button 
                  class={styles.acceptButton} 
                  onClick={() => handleUpdateStatus(selectedApplication()!.applicationId, 'pending_worker_confirmation')}
                  disabled={updating() === selectedApplication()!.applicationId}
                >
                  {updating() === selectedApplication()!.applicationId ? '接受中...' : '接受申請'}
                </button>
                <button 
                  class={styles.rejectButton} 
                  onClick={() => handleUpdateStatus(selectedApplication()!.applicationId, 'employer_rejected')}
                  disabled={updating() === selectedApplication()!.applicationId}
                >
                  {updating() === selectedApplication()!.applicationId ? '拒絕中...' : '拒絕申請'}
                </button>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}