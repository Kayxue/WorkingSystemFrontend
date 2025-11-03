// File: JobAttendanceView.solid.tsx
import { createSignal, createResource, Show, For, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import styles from "../../styles/JobAttendance.module.css";

interface AttendanceRecord {
  recordId: string;
  gigId: string;
  workerId: string;
  attendanceCodeId: string;
  checkType: "check_in" | "check_out";
  workDate: string;
  status: "on_time" | "late" | "early";
  notes?: string;
  createdAt: string;
  attendanceConfirmation?: "pending" | "confirmed" | "rejected";
  worker?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface JobAttendanceProps {
  gigId: string;
}

// ===== Custom Confirmation Modal =====
function ConfirmationModal(props: {
  show: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Show when={props.show}>
      <Portal>
        <div class={styles.modalOverlay}>
          <div class={styles.modalCard}>
            <div class={styles.modalIcon}>⬇️</div>
            <h3 class={styles.modalTitle}>確認操作</h3>
            <p class={styles.modalMessage}>{props.message}</p>
            <div class={styles.modalButtons}>
              <button class={styles.btnConfirm} onClick={props.onConfirm}>確認</button>
              <button class={styles.btnCancel} onClick={props.onCancel}>拒絕</button>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}


// ===== Main Component =====
export default function JobAttendanceView(props: JobAttendanceProps) {
  const [selectedDate, setSelectedDate] = createSignal("");
  const [filterStatus, setFilterStatus] = createSignal<string>("all");
  const [notesEdits, setNotesEdits] = createSignal<Record<string, string>>({});
  const [optimisticStatuses, setOptimisticStatuses] = createSignal<Record<string, string>>({});
  const [updatingStatuses, setUpdatingStatuses] = createSignal<Record<string, boolean>>({});
  const [confirmationStatuses, setConfirmationStatuses] = createSignal<Record<string, string>>({});
  const [updatingConfirmations, setUpdatingConfirmations] = createSignal<Record<string, boolean>>({});

  // modal state
  const [showModal, setShowModal] = createSignal(false);
  const [currentRecord, setCurrentRecord] = createSignal<AttendanceRecord | null>(null);

  const [attendanceRecords, { refetch }] = createResource(
    () => ({ gigId: props.gigId, date: selectedDate(), status: filterStatus() }),
    async ({ gigId, date, status }) => {
      let url = `/api/attendance/records?gigId=${gigId}`;
      if (date) url += `&dateStart=${date}&dateEnd=${date}`;
      if (status !== "all") url += `&status=${status}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch attendance records");
      const data = await response.json();
      return data.records ?? [];
    }
  );

  const updateStatus = async (record: AttendanceRecord, newStatus: string) => {
    const id = record.recordId;
    const prev = optimisticStatuses()[id] ?? record.status;

    setOptimisticStatuses(prevMap => ({ ...prevMap, [id]: newStatus }));
    setUpdatingStatuses(prevMap => ({ ...prevMap, [id]: true }));

    const payload = {
      records: [
        {
          recordId: id,
          status: newStatus,
          notes: String(notesEdits()[id] ?? record.notes ?? ""),
        },
      ],
    };

    try {
      const response = await fetch("/api/attendance/record", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to update status");
      await refetch();
      setOptimisticStatuses(prevMap => {
        const { [id]: _, ...rest } = prevMap;
        return rest;
      });
    } catch (err) {
      alert("Failed to update status. Reverting change.");
      setOptimisticStatuses(prevMap => ({ ...prevMap, [id]: prev }));
    } finally {
      setUpdatingStatuses(prevMap => ({ ...prevMap, [id]: false }));
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const localTime = new Date(date.getTime() + 12 * 60 * 60 * 1000); // 手動加 +8 小時
    return localTime.toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_time": return "#10b981";
      case "late": return "#f59e0b";
      case "early": return "#ef4444";
      default: return "#6b7280";
    }
  };

  const getCheckTypeText = (checkType: string) =>
    checkType === "check_in" ? "上班打卡" : "下班打卡";

  const getConfirmationColor = (confirmation: string) => {
    switch (confirmation) {
      case "confirmed": return "#10b981";
      case "rejected": return "#ef4444";
      case "pending": return "#f59e0b";
      default: return "#6b7280";
    }
  };

  const updateRecord = async (record: AttendanceRecord, updates: { attendanceConfirmation: string }) => {
    const id = record.recordId;
    setUpdatingConfirmations(prev => ({ ...prev, [id]: true }));
    const payload = {
      records: [
        {
          recordId: id,
          ...updates,
        },
      ],
    };

    try {
      const response = await fetch("/api/attendance/record", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to update confirmation");
      await refetch();
    } catch (err) {
      alert("Failed to update confirmation.");
    } finally {
      setUpdatingConfirmations(prev => ({ ...prev, [id]: false }));
    }
  };

  onMount(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  });

  return (
    <div class={styles.attendanceContainer}>
      <div class={styles.contentCard}>
        <div class={styles.headerRow}>
          <h3>出勤紀錄</h3>
          <div class={styles.filters}>
            <input
              type="date"
              class={styles.formInput}
              value={selectedDate()}
              onInput={(e) => {
                setSelectedDate(e.currentTarget.value);
                refetch();
              }}
            />
          </div>
        </div>

        <div class={styles.recordsTable}>
          <Show when={!attendanceRecords.loading} fallback={<div class={styles.placeholder}>載入中...</div>}>
            <Show when={attendanceRecords()?.length > 0} fallback={<div class={styles.noRecords}>沒有找到紀錄。</div>}>
              <div class={styles.tableHeader}>
                <div class={styles.headerCell}>員工</div>
                <div class={styles.headerCell}>打卡類型</div>
                <div class={styles.headerCell}>時間</div>
                <div class={styles.headerCell}>狀態</div>
                <div class={styles.headerCell}>出勤確認</div>
                <div class={styles.headerCell}>備註</div>
              </div>

              <For each={attendanceRecords()}>
                {(record) => {
                  const id = record.recordId;
                  const currentStatus = () => optimisticStatuses()[id] ?? record.status;
                  const isUpdating = () => updatingStatuses()[id] ?? false;
                  const currentConfirmation = () =>
                    confirmationStatuses()[id] ?? record.attendanceConfirmation ?? "pending";
                  const isUpdatingConfirmation = () => updatingConfirmations()[id] ?? false;

                  return (
                    <div class={styles.tableRow}>
                      <div class={styles.cell} data-label="員工">
                        <div class={styles.workerInfo}>
                          <div class={styles.workerName}>
                            {record.worker?.firstName} {record.worker?.lastName}
                          </div>
                          <div class={styles.workerEmail}>{record.worker?.email}</div>
                        </div>
                      </div>

                      <div class={styles.cell} data-label="打卡類型">
                        <span class={`${styles.checkType} ${styles[record.checkType]}`}>
                          {getCheckTypeText(record.checkType)}
                        </span>
                      </div>

                      <div class={styles.cell} data-label="時間">{formatTime(record.createdAt)}</div>

                      <div class={styles.cell} data-label="狀態">
                        <select
                          value={currentStatus()}
                          style={{ color: getStatusColor(currentStatus()) }}
                          onInput={(e) => updateStatus(record, e.currentTarget.value)}
                          class={styles.statusDropdown}
                          disabled={isUpdating()}
                        >
                          <option value="on_time">準時</option>
                          <option value="late">遲到</option>
                          <option value="early">早退</option>
                        </select>
                      </div>

                      <div class={styles.cell} data-label="出勤確認">
                        <Show
                          when={currentConfirmation() === "pending"}
                          fallback={
                            <span style={{ color: getConfirmationColor(currentConfirmation()), fontWeight: "bold" }}>
                              {currentConfirmation() === "confirmed"
                                ? "已確認"
                                : currentConfirmation() === "rejected"
                                ? "已拒絕"
                                : currentConfirmation()}
                            </span>
                          }
                        >
                          <button
                            onClick={() => {
                              setCurrentRecord(record);
                              setShowModal(true);
                            }}
                            disabled={isUpdatingConfirmation()}
                            class={styles.confirmButton}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              padding: "4px 10px",
                              border: "none",
                              "border-radius": "6px",
                              cursor: "pointer",
                            }}
                          >
                            待確認
                          </button>
                        </Show>
                      </div>

                      <div class={styles.cell} data-label="備註">
                        <input
                          type="text"
                          value={notesEdits()[id] ?? record.notes ?? ""}
                          onInput={(e) =>
                            setNotesEdits(prev => ({ ...prev, [id]: e.currentTarget.value }))
                          }
                          onBlur={async (e) => {
                            const payload = {
                              records: [
                                {
                                  recordId: id,
                                  status: optimisticStatuses()[id] ?? record.status,
                                  notes: String(e.currentTarget.value ?? ""),
                                },
                              ],
                            };
                            const response = await fetch("/api/attendance/record", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload),
                            });
                            if (!response.ok) {
                              alert("Failed to update note");
                              return;
                            }
                            refetch();
                          }}
                        />
                      </div>
                    </div>
                  );
                }}
              </For>
            </Show>
          </Show>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      <ConfirmationModal
        show={showModal()}
        message={`是否確認 ${currentRecord()?.worker?.firstName} ${currentRecord()?.worker?.lastName} 的 ${getCheckTypeText(currentRecord()?.checkType || "")} 出勤？`}
        onConfirm={async () => {
          if (currentRecord()) await updateRecord(currentRecord()!, { attendanceConfirmation: "confirmed" });
          setShowModal(false);
        }}
        onCancel={async () => {
          if (currentRecord()) await updateRecord(currentRecord()!, { attendanceConfirmation: "rejected" });
          setShowModal(false);
        }}
      />
    </div>
  );
}