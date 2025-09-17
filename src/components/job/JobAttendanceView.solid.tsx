// File: JobAttendanceView.solid.tsx
import { createSignal, createResource, Show, For, onMount } from "solid-js";
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
  const [selectedDate, setSelectedDate] = createSignal("");
  const [filterStatus, setFilterStatus] = createSignal<string>("all");

  // store notes edits locally (recordId -> notes)
  const [notesEdits, setNotesEdits] = createSignal<Record<string, string>>({});

  const [attendanceRecords, { refetch }] = createResource(
    () => ({ gigId: props.gigId, date: selectedDate(), status: filterStatus() }),
    async ({ gigId, date, status }) => {
      let url = `/api/attendance/records?gigId=${gigId}`;
      if (date) url += `&dateStart=${date}&dateEnd=${date}`;
      if (status !== "all") url += `&status=${status}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch attendance records");

      const data = await response.json();
      console.log("API response:", data);
      return data.records ?? [];
    }
  );

  // auto update status when dropdown changes
const updateStatus = async (record: AttendanceRecord, newStatus: string) => {
  const payload = { 
    recordId: record.recordId, 
    status: newStatus, 
    notes: String(record.notes)
  };

  const response = await fetch("/api/attendance/record", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    alert("更新狀態失敗");
    return;
  }

  console.log("Status updated:", await response.json());
  refetch();
};

// batch save notes
const saveNotes = async () => {
  const edits = notesEdits();
  for (const recordId in edits) {
    const record = attendanceRecords()?.find(r => r.recordId === recordId);
    if (!record) continue;

    const payload = { 
      recordId, 
      notes: String(edits[recordId] ?? ""), 
      status: record.status // 🔑 must include status 
    };

    const response = await fetch("/api/attendance/record", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      alert(`更新筆記失敗 (recordId: ${recordId})`);
      return;
    }
    console.log("Notes updated:", await response.json());
  }

  alert("所有筆記已更新！");
  setNotesEdits({});
  refetch();
};

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_time":
        return "#10b981";
      case "late":
        return "#f59e0b";
      case "early":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "on_time":
        return "準時";
      case "late":
        return "遲到";
      case "early":
        return "早退";
      default:
        return status;
    }
  };

  const getCheckTypeText = (checkType: string) => {
    return checkType === "check_in" ? "上班打卡" : "下班打卡";
  };

  onMount(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  });

  return (
    <div class={styles.attendanceContainer}>
      <div class={styles.contentCard}>
        {/* Header + Filters */}
        <div class={styles.headerRow}>
          <h3>Attendance Records</h3>
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
              <option value="all">All</option>
              <option value="on_time">On Time</option>
              <option value="late">Late</option>
              <option value="early">Early</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        <div class={styles.recordsTable}>
          <Show
            when={!attendanceRecords.loading}
            fallback={<div class={styles.placeholder}>Loading records...</div>}
          >
            <Show
              when={attendanceRecords()?.length > 0}
              fallback={<div class={styles.noRecords}>No records found.</div>}
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
                    {/* Worker */}
                    <div class={styles.cell}>
                      <div class={styles.workerInfo}>
                        <div class={styles.workerName}>
                          {record.worker?.firstName} {record.worker?.lastName}
                        </div>
                        <div class={styles.workerEmail}>{record.worker?.email}</div>
                      </div>
                    </div>

                    {/* Type */}
                    <div class={styles.cell}>
                      <span class={`${styles.checkType} ${styles[record.checkType]}`}>
                        {getCheckTypeText(record.checkType)}
                      </span>
                    </div>

                    {/* Time */}
                    <div class={styles.cell}>{formatTime(record.createdAt)}</div>

                    {/* Status -> auto updates */}
                    <div class={styles.cell}>
                      <select
                        value={record.status}
                        style={`color: ${getStatusColor(record.status)}`}
                        onChange={(e) => updateStatus(record, e.currentTarget.value)}
                      >
                        <option value="on_time">準時</option>
                        <option value="late">遲到</option>
                        <option value="early">早退</option>
                      </select>
                    </div>

                    {/* Notes -> local edit only */}
                    <div class={styles.cell}>
                      <input
                        type="text"
                        value={notesEdits()[record.recordId] ?? record.notes ?? ""}
                        onInput={(e) =>
                          setNotesEdits({
                            ...notesEdits(),
                            [record.recordId]: e.currentTarget.value,
                          })
                        }
                        onBlur={async (e) => {
                          const newNotes = e.currentTarget.value;
                          const payload = {
                            recordId: record.recordId,
                            status: record.status,
                            notes: String(newNotes ?? ""),
                          };

                          const response = await fetch("/api/attendance/record", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                          });

                          if (!response.ok) {
                            const errorText = await response.text();
                            console.error("更新筆記失敗:", errorText);
                            alert("更新筆記失敗");
                            return;
                          }

                          console.log("Notes auto-saved:", await response.json());
                          refetch();
                        }}
                      />
                    </div>
                  </div>
                )}
              </For>

            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
