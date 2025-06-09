import { createSignal, Show, onMount } from "solid-js";
import styles from '../styles/PostJobForm.module.css';

const [gigId, setGigId] = createSignal<string | null>(null);

export default function EditJobForm() {
  const [title, setTitle] = createSignal("");
  const [dateStart, setDateStart] = createSignal("");
  const [dateEnd, setDateEnd] = createSignal("");
  const [timeStart, setTimeStart] = createSignal("");
  const [timeEnd, setTimeEnd] = createSignal("");
  const [hourlyRate, setHourlyRate] = createSignal(0);
  const [city, setCity] = createSignal("");
  const [district, setDistrict] = createSignal("");
  const [address, setAddress] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [requirements, setRequirements] = createSignal("");
  const [contactPerson, setContactPerson] = createSignal("");
  const [contactPhone, setContactPhone] = createSignal("");
  const [contactEmail, setContactEmail] = createSignal("");

  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isFetching, setIsFetching] = createSignal(true);

  onMount(async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("gigId");
    setGigId(id);
    if (!gigId()) {
      setError("無效的職缺ID");
      setIsFetching(false);
      return;
    }
    setIsFetching(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:3000/gig/${gigId()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "取得職缺資料失敗");
        setIsFetching(false);
        return;
      }

      const data = await res.json();
      console.log(data);

      setTitle(data.title || "");
      setDateStart(data.dateStart ? data.dateStart.slice(0, 10) : "");
      setDateEnd(data.dateEnd ? data.dateEnd.slice(0, 10) : "");
      setTimeStart(data.timeStart || "");
      setTimeEnd(data.timeEnd || "");
      setHourlyRate(data.hourlyRate || 0);
      setCity(data.city || "");
      setDistrict(data.district || "");
      setAddress(data.address || "");
      setDescription(stripQuotes(data.description || ""));
      setRequirements(stripQuotes(data.requirements || ""));
      setContactPerson(data.contactPerson || "");
      setContactPhone(data.contactPhone || "");
      setContactEmail(data.contactEmail || "");

    } catch (e) {
      setError("取得資料時發生錯誤，請稍後再試");
    } finally {
      setIsFetching(false);
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    if (!gigId) {
      setError("無效的職缺ID，無法更新");
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        title: title(),
        dateStart: dateStart(),
        dateEnd: dateEnd(),
        timeStart: timeStart(),
        timeEnd: timeEnd(),
        hourlyRate: hourlyRate(),
        city: city(),
        district: district(),
        address: address(),
        description: description(),
        requirements: requirements(),
        contactPerson: contactPerson(),
        contactPhone: contactPhone(),
        contactEmail: contactEmail(),
        publishedAt: new Date().toISOString(),
      };

      const response = await fetch(`http://localhost:3000/gig/${gigId()}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSuccess(true);
        alert("Changes saved successfully!");
        window.location.href = "/dashboard";
      } else {
        const result = await response.json().catch(() => ({}));
        setError(result.message || "更新失敗，請稍後再試。");
      }
    } catch (err) {
      setError("發生錯誤，請檢查網路或稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  function stripQuotes(str: string) {
    if (!str) return "";
    if (str.startsWith('"') && str.endsWith('"')) {
        return str.slice(1, -1);
    }
    return str;
  }

  return (
    <div class={styles.postjobContainer}>
      <form class={styles.postjobFormWrapper} onSubmit={handleSubmit}>
        
        <label class={styles.postjobLabel}>
          Job Title
          <input
            class={styles.postjobInput}
            type="text"
            value={title()}
            onInput={(e) => setTitle(e.currentTarget.value)}
            required
          />
        </label>

        <div class={styles.postjobRow}>
          <label class={styles.postjobRowLabel}>
            Start Date
            <input
              class={styles.postjobInput}
              type="date"
              value={dateStart()}
              onInput={(e) => setDateStart(e.currentTarget.value)}
              required
            />
          </label>
          <label class={styles.postjobRowLabel}>
            End Date
            <input
              class={styles.postjobInput}
              type="date"
              value={dateEnd()}
              onInput={(e) => setDateEnd(e.currentTarget.value)}
              required
            />
          </label>
        </div>

        <div class={styles.postjobRow}>
          <label class={styles.postjobRowLabel}>
            Start Time
            <input
              class={styles.postjobInput}
              type="time"
              value={timeStart()}
              onInput={(e) => setTimeStart(e.currentTarget.value)}
              required
            />
          </label>
          <label class={styles.postjobRowLabel}>
            End Time
            <input
              class={styles.postjobInput}
              type="time"
              value={timeEnd()}
              onInput={(e) => setTimeEnd(e.currentTarget.value)}
              required
            />
          </label>
        </div>

        <label class={styles.postjobLabel}>
          Hourly Rate (TWD)
          <input
            class={styles.postjobInput}
            type="number"
            value={hourlyRate()}
            onInput={(e) => setHourlyRate(parseInt(e.currentTarget.value))}
            min="0"
            required
          />
        </label>

        <div class={styles.postjobRow}>
          <label class={styles.postjobRowLabel}>
            City
            <select
              class={styles.postjobSelect}
              value={city()}
              onInput={(e) => setCity(e.currentTarget.value)}
              required
            >
              <option value="">Select City</option>
              <option value="Taipei">Taipei</option>
              <option value="New Taipei">New Taipei</option>
              <option value="Taichung">Taichung</option>
              <option value="Tainan">Tainan</option>
              <option value="Kaohsiung">Kaohsiung</option>
            </select>
          </label>
          <label class={styles.postjobRowLabel}>
            District
            <select
              class={styles.postjobSelect}
              value={district()}
              onInput={(e) => setDistrict(e.currentTarget.value)}
              required
            >
              <option value="">Select District</option>
              <option value="Zhongzheng">Zhongzheng</option>
              <option value="Daan">Daan</option>
              <option value="Xinyi">Xinyi</option>
              <option value="Banqiao">Banqiao</option>
              <option value="Lingya">Lingya</option>
            </select>
          </label>
        </div>

        <label class={styles.postjobLabel}>
          Address
          <input
            class={styles.postjobInput}
            type="text"
            value={address()}
            onInput={(e) => setAddress(e.currentTarget.value)}
            required
          />
        </label>

        <label class={styles.postjobLabel}>
          Job Description
          <textarea
            class={styles.postjobTextarea}
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
            rows={5}
          />
        </label>

        <label class={styles.postjobLabel}>
          Job Requirement
          <input
            class={styles.postjobInput}
            type="text"
            value={requirements()}
            onInput={(e) => setRequirements(e.currentTarget.value)}
          />
        </label>

        <div class={styles.postjobRow}>
          <label class={styles.postjobRowLabel}>
            Contact Person
            <input
              class={styles.postjobInput}
              type="text"
              value={contactPerson()}
              onInput={(e) => setContactPerson(e.currentTarget.value)}
              required
            />
          </label>
          <label class={styles.postjobRowLabel}>
            Contact Phone
            <input
              class={styles.postjobInput}
              type="tel"
              value={contactPhone()}
              onInput={(e) => setContactPhone(e.currentTarget.value)}
              required
            />
          </label>
        </div>

        <label class={styles.postjobLabel}>
          Contact Email
          <input
            class={styles.postjobInput}
            type="email"
            value={contactEmail()}
            onInput={(e) => setContactEmail(e.currentTarget.value)}
            required
          />
        </label>

        <Show when={error()}>
          <div class="error">{error()}</div>
        </Show>
        <Show when={success()}>
          <div class="success">更新成功！</div>
        </Show>

        <button class={styles.postjobBtn} type="submit" disabled={isLoading()}>
          {isLoading() ? "更新中..." : "Save"}
        </button>
      </form>
    </div>
  );
}
