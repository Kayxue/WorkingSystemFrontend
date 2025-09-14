// File: JobAttendanceView.solid.tsx
import { createSignal, createResource, Show, For, Switch, Match, onMount } from "solid-js";
import styles from "../../styles/JobAttendance.module.css";

interface AttendanceCode {
  codeId: string;
  gigId: string;
  attendanceCode: string;
  validDate: string;
  expiresAt: string;
  createdAt: string;
}

interface AttendanceRecord {
  recordId: string;
  gigId: string;
  workerId: string;
  attendanceCodeId: string;
  checkType: 'check_in' | 'check_out';
  workDate: string;
  status: 'on_time' | 'late' | 'early';
  notes?: string;
  createdAt: string;
  worker?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface JobAttendanceProps {
  gigId: string;
}

export default function JobAttendanceView(props: JobAttendanceProps) {
  const [activeTab, setActiveTab] = createSignal<'codes' | 'records'>('codes');
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const [newCodeDate, setNewCodeDate] = createSignal('');
  const [selectedDate, setSelectedDate] = createSignal('');
  const [filterStatus, setFilterStatus] = createSignal<string>('all');

  // Fetch attendance codes
  const [attendanceCodes, { refetch: refetchCodes }] = createResource(
    () => props.gigId,
    async (gigId) => {
      const response = await fetch(`/api/gigs/${gigId}/attendance-codes`);
      if (!response.ok) throw new Error('Failed to fetch attendance codes');
      return response.json() as AttendanceCode[];
    }
  );

  // Fetch attendance records
  const [attendanceRecords, { refetch: refetchRecords }] = createResource(
    () => ({ gigId: props.gigId, date: selectedDate(), status: filterStatus() }),
    async ({ gigId, date, status }) => {
      let url = `/api/gigs/${gigId}/attendance-records`;
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (status !== 'all') params.append('status', status);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch attendance records');
      return response.json() as AttendanceRecord[];
    }
  );

  const createAttendanceCode = async () => {
    if (!newCodeDate()) return;
    
    try {
      const response = await fetch(`/api/gigs/${props.gigId}/attendance-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          validDate: newCodeDate(),
        }),
      });
      
      if (!response.ok) throw new Error('Failed to create attendance code');
      
      await refetchCodes();
      setShowCreateForm(false);
      setNewCodeDate('');
    } catch (error) {
      console.error('Error creating attendance code:', error);
      alert('Failed to create attendance code');
    }
  };

  const deleteAttendanceCode = async (codeId: string) => {
    if (!confirm('Are you sure you want to delete this attendance code?')) return;
    
    try {
      const response = await fetch(`/api/attendance-codes/${codeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete attendance code');
      
      await refetchCodes();
    } catch (error) {
      console.error('Error deleting attendance code:', error);
      alert('Failed to delete attendance code');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isCodeExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_time': return '#10b981';
      case 'late': return '#f59e0b';
      case 'early': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_time': return '準時';
      case 'late': return '遲到';
      case 'early': return '早退';
      default: return status;
    }
  };

  const getCheckTypeText = (checkType: string) => {
    return checkType === 'check_in' ? '上班打卡' : '下班打卡';
  };

  onMount(() => {
    // Set default selected date to today
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  });

  return (
    <div class={styles.attendanceContainer}>
      {/* Header - konsisten dengan JobLayout style */}
      <div class={styles.contentCard}>
        <h3>Attendance Management</h3>
        <p class={styles.subtitle}>Manage attendance codes and track worker attendance</p>
      </div>

      {/* Tab Navigation */}
      <div class={styles.contentCard}>
        <div class={styles.tabNavigation}>
          <button 
            class={`${styles.tabButton} ${activeTab() === 'codes' ? styles.active : ''}`}
            onClick={() => setActiveTab('codes')}
          >
            <span class={styles.tabIcon}>🔢</span>
            Attendance Codes
          </button>
          <button 
            class={`${styles.tabButton} ${activeTab() === 'records' ? styles.active : ''}`}
            onClick={() => setActiveTab('records')}
          >
            <span class={styles.tabIcon}>📊</span>
            Attendance Records
          </button>
        </div>

        <Switch>
          {/* Attendance Codes Tab */}
          <Match when={activeTab() === 'codes'}>
            <div class={styles.tabContent}>
              <div class={styles.sectionHeader}>
                <h4>Attendance Codes</h4>
                <button 
                  class={styles.createButton}
                  onClick={() => setShowCreateForm(!showCreateForm())}
                >
                  {showCreateForm() ? 'Cancel' : '+ Create Code'}
                </button>
              </div>

              <Show when={showCreateForm()}>
                <div class={styles.createForm}>
                  <div class={styles.formGroup}>
                    <label class={styles.formLabel}>Valid Date:</label>
                    <input 
                      type="date"
                      class={styles.formInput}
                      value={newCodeDate()}
                      onInput={(e) => setNewCodeDate(e.currentTarget.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <button 
                    class={styles.submitButton}
                    onClick={createAttendanceCode}
                    disabled={!newCodeDate()}
                  >
                    Create Code
                  </button>
                </div>
              </Show>

              <div class={styles.codesGrid}>
                <Show 
                  when={!attendanceCodes.loading} 
                  fallback={<div class={styles.placeholder}>Loading codes...</div>}
                >
                  <Show 
                    when={attendanceCodes()?.length > 0}
                    fallback={<div class={styles.noPhotos}>No attendance codes created yet.</div>}
                  >
                    <For each={attendanceCodes()}>
                      {(code) => (
                        <div class={`${styles.codeCard} ${isCodeExpired(code.expiresAt) ? styles.expired : ''}`}>
                          <div class={styles.codeHeader}>
                            <div class={styles.codeNumber}>{code.attendanceCode}</div>
                            <button 
                              class={styles.deleteButton}
                              onClick={() => deleteAttendanceCode(code.codeId)}
                              title="Delete code"
                            >
                              ×
                            </button>
                          </div>
                          <div class={styles.codeDetails}>
                            <div class={styles.codeInfo}>
                              <span class={styles.infoLabel}>Valid Date:</span>
                              <span>{formatDate(code.validDate)}</span>
                            </div>
                            <div class={styles.codeInfo}>
                              <span class={styles.infoLabel}>Expires:</span>
                              <span>{formatTime(code.expiresAt)}</span>
                            </div>
                            <div class={styles.codeInfo}>
                              <span class={styles.infoLabel}>Created:</span>
                              <span>{formatDate(code.createdAt)}</span>
                            </div>
                          </div>
                          <Show when={isCodeExpired(code.expiresAt)}>
                            <div class={styles.expiredBadge}>Expired</div>
                          </Show>
                        </div>
                      )}
                    </For>
                  </Show>
                </Show>
              </div>
            </div>
          </Match>

          {/* Attendance Records Tab */}
          <Match when={activeTab() === 'records'}>
            <div class={styles.tabContent}>
              <div class={styles.sectionHeader}>
                <h4>Attendance Records</h4>
                <div class={styles.filters}>
                  <input 
                    type="date"
                    class={styles.formInput}
                    value={selectedDate()}
                    onInput={(e) => setSelectedDate(e.currentTarget.value)}
                  />
                  <select 
                    class={styles.formInput}
                    value={filterStatus()}
                    onInput={(e) => setFilterStatus(e.currentTarget.value)}
                  >
                    <option value="all">All Status</option>
                    <option value="on_time">On Time</option>
                    <option value="late">Late</option>
                    <option value="early">Early</option>
                  </select>
                </div>
              </div>

              <div class={styles.recordsTable}>
                <Show 
                  when={!attendanceRecords.loading} 
                  fallback={<div class={styles.placeholder}>Loading records...</div>}
                >
                  <Show 
                    when={attendanceRecords()?.length > 0}
                    fallback={<div class={styles.noPhotos}>No attendance records found.</div>}
                  >
                    <div class={styles.tableHeader}>
                      <div class={styles.headerCell}>Worker</div>
                      <div class={styles.headerCell}>Type</div>
                      <div class={styles.headerCell}>Time</div>
                      <div class={styles.headerCell}>Status</div>
                      <div class={styles.headerCell}>Notes</div>
                    </div>
                    <For each={attendanceRecords()}>
                      {(record) => (
                        <div class={styles.tableRow}>
                          <div class={styles.cell}>
                            <div class={styles.workerInfo}>
                              <div class={styles.workerName}>
                                {record.worker?.firstName} {record.worker?.lastName}
                              </div>
                              <div class={styles.workerEmail}>
                                {record.worker?.email}
                              </div>
                            </div>
                          </div>
                          <div class={styles.cell}>
                            <span class={`${styles.checkType} ${styles[record.checkType]}`}>
                              {getCheckTypeText(record.checkType)}
                            </span>
                          </div>
                          <div class={styles.cell}>
                            {formatTime(record.createdAt)}
                          </div>
                          <div class={styles.cell}>
                            <span 
                              class={styles.status}
                              style={`color: ${getStatusColor(record.status)}`}
                            >
                              {getStatusText(record.status)}
                            </span>
                          </div>
                          <div class={styles.cell}>
                            {record.notes || '-'}
                          </div>
                        </div>
                      )}
                    </For>
                  </Show>
                </Show>
              </div>
            </div>
          </Match>
        </Switch>
      </div>
    </div>
  );
}