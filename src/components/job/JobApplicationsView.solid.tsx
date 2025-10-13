// JobApplicationsView.solid.tsx
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

type Application = {
  applicationId: string;
  workerId: string;
  workerName: string;
  workerEmail: string;
  workerPhone?: string;
  workerEducation?: string;
  workerSchool?: string;
  workerMajor?: string;
  workerCertificates?: string | Certificate[] | null; // 從資料庫來的應該是 JSON 字串
  workerJobExperience?: string | JobExperience[] | null; // 從資料庫來的應該是 JSON 字串
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

// 解析 JSON 欄位的輔助函數 - 處理多種資料格式
function parseJobExperience(experience: string | JobExperience[] | null | undefined): JobExperience[] {
  console.log('🔍 解析工作經驗:', {
    type: typeof experience,
    value: experience,
    isNull: experience === null,
    isUndefined: experience === undefined,
    isArray: Array.isArray(experience),
    arrayLength: Array.isArray(experience) ? experience.length : 'N/A'
  });

  // 處理 null、undefined 或假值
  if (experience === null || experience === undefined) {
    console.log('❌ 工作經驗為 null/undefined');
    return [];
  }
  
  // 如果已經是陣列，驗證並返回
  if (Array.isArray(experience)) {
    console.log('✅ 工作經驗已經是陣列，長度:', experience.length);
    
    if (experience.length === 0) {
      console.log('❌ 工作經驗陣列為空');
      return [];
    }
    
    // 驗證每個經驗物件都有預期的結構
    const validExperiences = experience.filter(exp => 
      exp && typeof exp === 'object' && 
      (exp.jobTitle || exp.company || exp.startDate || exp.endDate || exp.description)
    );
    console.log('✅ 過濾後的有效經驗:', validExperiences);
    return validExperiences;
  }
  
  // 處理字串情況（從資料庫來的 JSON 字串）
  if (typeof experience === 'string') {
    const trimmed = experience.trim();
    
    if (trimmed === '' || trimmed === '[]' || trimmed === 'null') {
      console.log('❌ 工作經驗是空字串或 null 字串');
      return [];
    }
    
    try {
      const parsed = JSON.parse(trimmed);
      console.log('✅ 解析的工作經驗 JSON:', parsed);
      
      if (Array.isArray(parsed)) {
        const validExperiences = parsed.filter(exp => 
          exp && typeof exp === 'object' && 
          (exp.jobTitle || exp.company || exp.startDate || exp.endDate || exp.description)
        );
        return validExperiences;
      }
      return [];
    } catch (error) {
      console.warn('❌ 解析工作經驗 JSON 失敗:', error);
      return [];
    }
  }
  
  return [];
}

function parseCertificates(certificates: string | Certificate[] | string[] | null | undefined): Certificate[] {
  console.log('🔍 解析證書:', {
    type: typeof certificates,
    value: certificates,
    isNull: certificates === null,
    isUndefined: certificates === undefined,
    isArray: Array.isArray(certificates),
    arrayLength: Array.isArray(certificates) ? certificates.length : 'N/A'
  });

  // 處理 null、undefined 或假值
  if (certificates === null || certificates === undefined) {
    console.log('❌ 證書為 null/undefined');
    return [];
  }
  
  // 如果已經是陣列，處理物件陣列和字串陣列
  if (Array.isArray(certificates)) {
    console.log('✅ 證書已經是陣列，長度:', certificates.length);
    
    if (certificates.length === 0) {
      console.log('❌ 證書陣列為空');
      return [];
    }
    
    // 檢查是否為字串陣列（如 ["Java SCJP", "AWS Solutions Architect"]）
    if (certificates.every(cert => typeof cert === 'string')) {
      console.log('✅ 將字串陣列轉換為證書物件');
      const convertedCerts = certificates.map(certName => ({
        name: certName,
        issuer: undefined,
        date: undefined
      }));
      console.log('✅ 轉換後的證書:', convertedCerts);
      return convertedCerts;
    }
    
    // 檢查是否為物件陣列
    if (certificates.every(cert => typeof cert === 'object' && cert !== null)) {
      console.log('✅ 證書是物件陣列');
      const validCertificates = certificates.filter(cert => 
        cert && typeof cert === 'object' && 
        (cert.name || cert.issuer || cert.date)
      );
      console.log('✅ 過濾後的有效證書:', validCertificates);
      return validCertificates;
    }
    
    console.log('❌ 混合陣列格式，過濾有效項目');
    // 處理混合陣列（有些是字串，有些是物件）
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
  
  // 處理字串情況（從資料庫來的 JSON 字串）
  if (typeof certificates === 'string') {
    const trimmed = certificates.trim();
    
    if (trimmed === '' || trimmed === '[]' || trimmed === 'null') {
      console.log('❌ 證書是空字串或 null 字串');
      return [];
    }
    
    try {
      const parsed = JSON.parse(trimmed);
      console.log('✅ 解析的證書 JSON:', parsed);
      
      if (Array.isArray(parsed)) {
        // 處理來自 JSON 的字串陣列和物件陣列
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
      console.warn('❌ 解析證書 JSON 失敗:', error);
      return [];
    }
  }
  
  return [];
}

async function updateApplicationStatus(applicationId: string, newStatus: 'pending_worker_confirmation' | 'employer_rejected') {
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
    
    // 除錯每個申請的證書和經驗資料
    result.data.applications.forEach((app: Application, index: number) => {
      console.log(`🔍 申請 ${index + 1} (${app.workerName}):`, {
        certificatesRaw: app.workerCertificates,
        certificatesType: typeof app.workerCertificates,
        certificatesLength: typeof app.workerCertificates === 'string' ? app.workerCertificates.length : 'N/A',
        experienceRaw: app.workerJobExperience,
        experienceType: typeof app.workerJobExperience,
        experienceLength: typeof app.workerJobExperience === 'string' ? app.workerJobExperience.length : 'N/A'
      });
    });
    
    console.log('申請載入成功:', result.data.applications.length);
    
    return result.data.applications;
  } catch (fetchError: any) {
    console.error('取得錯誤:', fetchError);
    throw new Error(`網路錯誤: ${fetchError?.message || '未知錯誤'}`);
  }
}

export default function JobApplicationsView(props: JobApplicationsViewProps) {
  // 從 URL 參數取得初始狀態（同時支援 'status' 和 'filter' 以保持相容性）
  const getInitialStatusFilter = () => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status') || params.get('filter');
    
    // 驗證狀態參數
    const validStatuses = ['all', 'pending_employer_review', 'employer_rejected', 'pending_worker_confirmation', 'worker_confirmed', 'worker_declined', 'worker_cancelled', 'system_cancelled'];
    if (statusParam && validStatuses.includes(statusParam)) {
      return statusParam as 'all' | 'pending_employer_review' | 'employer_rejected' | 'pending_worker_confirmation' | 'worker_confirmed' | 'worker_declined' | 'worker_cancelled' | 'system_cancelled';
    }
    return 'all';
  };

  // 首先宣告所有 signals
  const [applications, { refetch }] = createResource(() => props.gigId, fetchApplications);
  const [selectedApplication, setSelectedApplication] = createSignal<Application | null>(null);
  const [statusFilter, setStatusFilter] = createSignal<'all' | 'pending_employer_review' | 'employer_rejected' | 'pending_worker_confirmation' | 'worker_confirmed' | 'worker_declined' | 'worker_cancelled' | 'system_cancelled'>(
    getInitialStatusFilter()
  );
  const [updating, setUpdating] = createSignal<string | null>(null);

  // 除錯 effect，在應用程式資料載入時記錄
  createEffect(() => {
    const apps = applications();
    if (apps && apps.length > 0) {
      console.log('🔍 除錯: 申請已載入，檢查第一個申請:');
      const firstApp = apps[0];
      console.log('第一個申請完整資料:', firstApp);
      console.log('證書資料詳細分析:');
      console.log('- 類型:', typeof firstApp.workerCertificates);
      console.log('- 值:', firstApp.workerCertificates);
      console.log('- 字串長度:', typeof firstApp.workerCertificates === 'string' ? firstApp.workerCertificates.length : 'N/A');
      console.log('- 是否為空字串:', firstApp.workerCertificates === '');
      
      console.log('經驗資料詳細分析:');
      console.log('- 類型:', typeof firstApp.workerJobExperience);
      console.log('- 值:', firstApp.workerJobExperience);
      console.log('- 字串長度:', typeof firstApp.workerJobExperience === 'string' ? firstApp.workerJobExperience.length : 'N/A');
      console.log('- 是否為空字串:', firstApp.workerJobExperience === '');
      
      // 測試解析函數
      console.log('🧪 測試解析函數:');
      const parsedCerts = parseCertificates(firstApp.workerCertificates);
      const parsedExp = parseJobExperience(firstApp.workerJobExperience);
      console.log('最終解析的證書結果:', parsedCerts);
      console.log('最終解析的經驗結果:', parsedExp);
    }
  });

  // 宣告所有函數
  const filteredApplications = () => {
    const apps = applications();
    if (!apps) return [];
    
    if (statusFilter() === 'all') return apps;
    return apps.filter(app => app.status === statusFilter());
  };

  const openApplicationModal = (application: Application) => {
    console.log('🔍 開啟申請模態視窗:', application);
    console.log('🔍 模態視窗資料 - 證書:', application.workerCertificates);
    console.log('🔍 模態視窗資料 - 經驗:', application.workerJobExperience);
    setSelectedApplication(application);
    document.body.style.overflow = 'hidden';
  };

  const closeApplicationModal = () => {
    setSelectedApplication(null);
    document.body.style.overflow = 'auto';
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: 'pending_worker_confirmation' | 'employer_rejected') => {
    setUpdating(applicationId);
    try {
      await updateApplicationStatus(applicationId, newStatus);
      await refetch();
      closeApplicationModal();
    } catch (error) {
      console.error('更新申請狀態時發生錯誤:', error);
      alert('更新申請狀態失敗，請重試。');
    } finally {
      setUpdating(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeApplicationModal();
    }
  };

  // 監聽 URL 變化（瀏覽器的上一頁/下一頁按鈕）
  const handlePopState = () => {
    setStatusFilter(getInitialStatusFilter());
  };

  // Effects 和事件監聽器
  // 將 URL 與篩選器變更同步
  createEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (statusFilter() === 'all') {
      params.delete('status');
    } else {
      params.set('status', statusFilter());
    }
    
    // 更新 URL 而不重新載入頁面
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  });

  // 設定事件監聽器
  window.addEventListener('popstate', handlePopState);
  document.addEventListener('keydown', handleKeyDown);
  
  // 清理事件監聽器
  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'auto'; // 清理時重置 overflow
    window.removeEventListener('popstate', handlePopState); // 清理 popstate 監聽器
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
                    <h3 class={styles.applicantName}>{application.workerName}</h3>
                    <span class={`${styles.status} ${getStatusClass(application.status)}`}>
                      {getStatusDisplayText(application.status)}
                    </span>
                  </div>
                  <div class={styles.cardContent}>
                    <p class={styles.applicantInfo}><strong>電子郵件:</strong> {application.workerEmail}</p>
                    <Show when={application.workerPhone}>
                      <p class={styles.applicantInfo}><strong>電話:</strong> {application.workerPhone}</p>
                    </Show>
                    <Show when={application.workerEducation}>
                      <p class={styles.applicantInfo}><strong>教育程度:</strong> {application.workerEducation}</p>
                    </Show>
                    <Show when={application.workerSchool}>
                      <p class={styles.applicantInfo}><strong>學校:</strong> {application.workerSchool}</p>
                    </Show>
                    <Show when={application.workerMajor}>
                      <p class={styles.applicantInfo}><strong>學系:</strong> {application.workerMajor}</p>
                    </Show>
                    
                    {/* 在卡片預覽中顯示證書資訊 */}
                    <div class={styles.applicantInfo}>
                      <strong>證書:</strong> 
                      <Show 
                        when={parseCertificates(application.workerCertificates).length > 0} 
                        fallback={<span class={styles.noData}> 無</span>}
                      >
                        <span> {parseCertificates(application.workerCertificates).length} 張證書</span>
                      </Show>
                    </div>

                    {/* 在卡片預覽中顯示經驗資訊 */}
                    <div class={styles.applicantInfo}>
                      <strong>工作經驗:</strong> 
                      <Show 
                        when={parseJobExperience(application.workerJobExperience).length > 0} 
                        fallback={<span class={styles.noData}> 無</span>}
                      >
                        <span> {parseJobExperience(application.workerJobExperience).length} 份工作</span>
                      </Show>
                    </div>
                    
                    <p class={styles.applicantInfo}><strong>申請時間:</strong> {formatDateToDDMMYYYY(application.appliedAt)}</p>
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
                <h3>{selectedApplication()!.workerName}</h3>
                <p><strong>電子郵件:</strong> <a href={`mailto:${selectedApplication()!.workerEmail}`}>{selectedApplication()!.workerEmail}</a></p>
                <Show when={selectedApplication()!.workerPhone}>
                  <p><strong>電話:</strong> <a href={`tel:${selectedApplication()!.workerPhone}`}>{selectedApplication()!.workerPhone}</a></p>
                </Show>
                <Show when={selectedApplication()!.workerEducation}>
                  <p><strong>教育程度:</strong> {selectedApplication()!.workerEducation}</p>
                </Show>
                <Show when={selectedApplication()!.workerSchool}>
                  <p><strong>學校:</strong> {selectedApplication()!.workerSchool}</p>
                </Show>
                <Show when={selectedApplication()!.workerMajor}>
                  <p><strong>主修:</strong> {selectedApplication()!.workerMajor}</p>
                </Show>
                <p><strong>申請日期:</strong> {formatDateToDDMMYYYY(selectedApplication()!.appliedAt)}</p>
                <p><strong>狀態:</strong> <span class={`${styles.status} ${getStatusClass(selectedApplication()!.status)}`}>{getStatusDisplayText(selectedApplication()!.status)}</span></p>
                
                {/* 工作經驗區段 */}
                <div class={styles.section}>
                  <h4>工作經驗</h4>
                  <Show 
                    when={parseJobExperience(selectedApplication()!.workerJobExperience).length > 0}
                    fallback={<p class={styles.noData}>未提供工作經驗</p>}
                  >
                    <For each={parseJobExperience(selectedApplication()!.workerJobExperience)}>
                      {(exp) => (
                        <div class={styles.experienceItem}>
                          <p><strong>{exp.jobTitle || 'N/A'}</strong> 在 {exp.company || 'N/A'}</p>
                          <p class={styles.dates}>
                            {exp.startDate || 'N/A'} - {exp.endDate || '現在'}
                          </p>
                          <Show when={exp.description}>
                            <p class={styles.description}>{exp.description}</p>
                          </Show>
                        </div>
                      )}
                    </For>
                  </Show>
                </div>
                
                {/* 證書區段 */}
                <div class={styles.section}>
                  <h4>證書</h4>
                  <Show 
                    when={parseCertificates(selectedApplication()!.workerCertificates).length > 0}
                    fallback={<p class={styles.noData}>未提供證書</p>}
                  >
                    <For each={parseCertificates(selectedApplication()!.workerCertificates)}>
                      {(cert) => (
                        <div class={styles.certificateItem}>
                          <p><strong>{cert.name || 'N/A'}</strong></p>
                          <Show when={cert.issuer}>
                            <p class={styles.issuer}>發行機構: {cert.issuer}</p>
                          </Show>
                          <Show when={cert.date}>
                            <p class={styles.certDate}>日期: {cert.date}</p>
                          </Show>
                        </div>
                      )}
                    </For>
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