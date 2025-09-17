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

  const [attendanceRecords] = createResource(
    () => ({ gigId: props.gigId, date: selectedDate(), status: filterStatus() }),
    async ({ gigId, date, status }) => {
      let url = `/api/gigs/${gigId}/attendance-records`;
      const params = new URLSearchParams();
      if (date) params.append("date", date);
      if (status !== "all") params.append("status", status);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch attendance records");
      return response.json() as AttendanceRecord[];
    }
  );

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
        {/* Header + Filters (kanan) */}
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
                    <div class={styles.cell}>
                      <div class={styles.workerInfo}>
                        <div class={styles.workerName}>
                          {record.worker?.firstName} {record.worker?.lastName}
                        </div>
                        <div class={styles.workerEmail}>{record.worker?.email}</div>
                      </div>
                    </div>
                    <div class={styles.cell}>
                      <span class={`${styles.checkType} ${styles[record.checkType]}`}>
                        {getCheckTypeText(record.checkType)}
                      </span>
                    </div>
                    <div class={styles.cell}>{formatTime(record.createdAt)}</div>
                    <div class={styles.cell}>
                      <span
                        class={styles.status}
                        style={`color: ${getStatusColor(record.status)}`}
                      >
                        {getStatusText(record.status)}
                      </span>
                    </div>
                    <div class={styles.cell}>{record.notes || "-"}</div>
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
