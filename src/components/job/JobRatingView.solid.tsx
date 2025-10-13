// File: JobRatingView.solid.tsx
import { createSignal, createResource, Show, For, onMount } from "solid-js";
import styles from "../../styles/JobRating.module.css";

type RatingStatus = 'all' | 'rated' | 'unrated';

interface RatingItem {
  id: string;
  workerId: string;
  userName: string;
  userAvatar?: string | null;
  status: 'rated' | 'unrated';
  employerRating?: number | null;
  employerComment?: string | null;
  ratedAt?: string | null;
  workCompletedAt: string;
  workSubmittedAt: string;
}

interface RatingResponse {
  data: RatingItem[];
  total: number;
  hasMore: boolean;
}

interface JobRatingViewProps {
  gigId: string;
}

export default function JobRatingView(props: JobRatingViewProps) {
  const [status, setStatus] = createSignal<RatingStatus>('all');
  const [limit] = createSignal(10);
  const [offset, setOffset] = createSignal(0);
  const [allRatings, setAllRatings] = createSignal<RatingItem[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [totalCount, setTotalCount] = createSignal(0);
  const [showRatingModal, setShowRatingModal] = createSignal(false);
  const [selectedEmployee, setSelectedEmployee] = createSignal<RatingItem | null>(null);
  const [newRating, setNewRating] = createSignal(0);
  const [newComment, setNewComment] = createSignal('');
  const [submittingRating, setSubmittingRating] = createSignal(false);
  const [filteredCount, setFilteredCount] = createSignal(0);
  const [error, setError] = createSignal<string>('');
  const [isJobCompleted, setIsJobCompleted] = createSignal(true); // 追蹤工作是否已完成

  // 修復：處理進行中工作的 404 錯誤
  const fetchRatings = async (
    gigId: string,
    status: RatingStatus,
    limit: number,
    offset: number
  ): Promise<RatingResponse> => {
    try {
      const response = await fetch(
        `/api/rating/list/employer/gig/${encodeURIComponent(gigId)}?status=${status}&limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "platform": "web-employer",
          },
          credentials: "include",
        }
      );

      // 修復：處理進行中工作（無完成工作）的 404 錯誤
      if (response.status === 404) {
        console.log("未找到此工作的評分資料（可能是進行中/無完成工作）");
        setIsJobCompleted(false);
        return {
          data: [],
          total: 0,
          hasMore: false,
        };
      }

      if (!response.ok) {
        throw new Error(`獲取評分列表失敗: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("評分 API 回應:", result);

      setIsJobCompleted(true); // 工作有完成的工作

      const workers = result.data?.workers || [];
      const pagination = result.data?.pagination || { returned: 0, hasMore: false };

      const ratingItems: RatingItem[] = workers.map((worker: any) => ({
        id: worker.workerId + "-" + gigId,
        workerId: worker.workerId,
        userName: worker.name || "未知員工",
        userAvatar: worker.avatar || null,
        status: worker.isRated ? "rated" : "unrated",
        employerRating: worker.rating?.ratingValue || null,
        employerComment: worker.rating?.comment || null,
        ratedAt: worker.rating?.ratedAt || null,
        workCompletedAt: worker.appliedAt,
        workSubmittedAt: worker.appliedAt,
      }));

      return {
        data: ratingItems,
        total: pagination.returned,
        hasMore: pagination.hasMore,
      };
    } catch (error) {
      console.error("獲取評分時出錯:", error);
      throw error;
    }
  };

  const [allCount, setAllCount] = createSignal(0);
  const [ratedCount, setRatedCount] = createSignal(0);
  const [unratedCount, setUnratedCount] = createSignal(0);

  const loadRatings = async (reset = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchRatings(
        props.gigId,
        status(),
        limit(),
        reset ? 0 : offset()
      );

      if (reset) {
        setAllRatings(response.data);
        setOffset(response.data.length);
      } else {
        setAllRatings(prev => [...prev, ...response.data]);
        setOffset(prev => prev + response.data.length);
      }

      // --- 總是從「全部」狀態更新計數 ---
      const allResponse = await fetchRatings(props.gigId, "all", limit(), 0);
      const allData = allResponse.data;

      setAllCount(allData.length);
      setRatedCount(allData.filter(r => r.status === "rated").length);
      setUnratedCount(allData.filter(r => r.status === "unrated").length);

      setFilteredCount(response.total);
    } catch (error) {
      console.error('載入評分時出錯:', error);
      setError('載入評分失敗。請重試。');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (newStatus: RatingStatus) => {
    setStatus(newStatus);
    setOffset(0);
    loadRatings(true);
  };

  const openRatingModal = (employee: RatingItem) => {
    if (employee.status === 'rated') {
      return;
    }
    setSelectedEmployee(employee);
    setNewRating(0);
    setNewComment('');
    setError('');
    setShowRatingModal(true);
  };

  const closeRatingModal = () => {
    setShowRatingModal(false);
    setSelectedEmployee(null);
    setNewRating(0);
    setNewComment('');
    setError('');
  };

  const submitRating = async (e?: Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const employee = selectedEmployee();
    const rating = newRating();
    
    if (!employee) {
      setError('未選擇員工');
      return;
    }
    
    if (!rating || rating < 1 || rating > 5) {
      setError('請選擇 1 到 5 顆星的評分');
      return;
    }

    if (!props.gigId) {
      setError('缺少工作 ID');
      return;
    }

    setSubmittingRating(true);
    setError('');
    
    console.log('提交評分:', {
      workerId: employee.workerId,
      gigId: props.gigId,
      rating: rating,
      comment: newComment().trim()
    });

    try {
      const ratingData = {
        ratingValue: rating,
        comment: newComment().trim() || undefined
      };

      console.log('發送評分資料（使用正確的欄位名稱）:', ratingData);

      const response = await fetch(`/api/rating/worker/${employee.workerId}/gig/${props.gigId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'platform': 'web-employer'
        },
        credentials: 'include',
        body: JSON.stringify(ratingData)
      });

      console.log('API 回應狀態:', response.status, response.statusText);

      if (response.ok) {
        let result;
        try {
          result = await response.json();
          console.log('評分提交成功:', result);
        } catch (parseError) {
          console.log('回應 OK 但解析 JSON 失敗，視為成功');
          result = { success: true };
        }

        setAllRatings(prev => prev.map(item => 
          item.id === employee.id 
            ? {
                ...item,
                status: 'rated' as const,
                employerRating: rating,
                employerComment: newComment().trim(),
                ratedAt: new Date().toISOString()
              }
            : item
        ));
        
        closeRatingModal();
        alert('評分提交成功！');
        loadRatings(true)
        //window.location.reload()
        
      } else {
        let errorMessage = `HTTP 錯誤 ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.log('錯誤回應資料:', errorData);
          errorMessage = errorData.message || errorData.error || errorData.details || JSON.stringify(errorData);
        } catch (jsonError) {
          try {
            const errorText = await response.text();
            console.log('錯誤回應文字:', errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error('讀取錯誤回應失敗:', textError);
          }
        }
        
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error('提交評分時出錯:', error);
      const errorMsg = error instanceof Error ? error.message : '發生未知錯誤';
      setError(`提交評分失敗: ${errorMsg}`);
    } finally {
      setSubmittingRating(false);
    }
  };

  const loadMore = () => {
    if (!loading()) {
      loadRatings(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span 
        class={`${styles.star} ${i < rating ? styles.filled : styles.unfilled} ${interactive ? styles.interactive : ''}`}
        onclick={interactive ? (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('點擊星星:', i + 1);
          setNewRating(i + 1);
          setError('');
        } : undefined}
        style={{
          cursor: interactive ? 'pointer' : 'default',
          color: i < rating ? '#FFD700' : '#D3D3D3',
          transition: 'color 0.2s ease',
          display: 'inline-block',
          'user-select': 'none'
        }}
        onMouseEnter={interactive ? (e: Event) => {
          (e.target as HTMLElement).style.color = '#FFA500';
        } : undefined}
        onMouseLeave={interactive ? (e: Event) => {
          (e.target as HTMLElement).style.color = i < rating ? '#FFD700' : '#D3D3D3';
        } : undefined}
      >
        ★
      </span>
    ));
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  onMount(() => {
    loadRatings(true);
  });

  return (
    <div class={styles.ratingViewContainer}>
      <div class={styles.header}>
        <h2>評分已核准員工</h2>
        
      </div>

      <Show when={error()}>
        <div class={styles.errorMessage} style={{ 
          background: '#fee', 
          border: '1px solid #fcc', 
          color: '#c33', 
          padding: '10px', 
          margin: '10px 0', 
          'border-radius': '4px' 
        }}>
          {error()}
        </div>
      </Show>

      <div class={styles.filters}>
        <div class={styles.statusFilter}>
          <button
            class={`${styles.filterButton} ${status() === 'all' ? styles.active : ''}`}
            onclick={() => handleStatusChange('all')}
          >
            全部 ({allCount()})
          </button>
          <button
            class={`${styles.filterButton} ${status() === 'rated' ? styles.active : ''}`}
            onclick={() => handleStatusChange('rated')}
          >
            已評分 ({ratedCount()})
          </button>
          <button
            class={`${styles.filterButton} ${status() === 'unrated' ? styles.active : ''}`}
            onclick={() => handleStatusChange('unrated')}
          >
            未評分 ({unratedCount()})
          </button>
        </div>
      </div>

      <div class={styles.ratingsList}>
        <Show 
          when={!loading() || allRatings().length > 0}
          fallback={<div class={styles.loading}>載入評分中...</div>}
        >
          <For each={allRatings()}>
            {(rating) => (
              <div class={styles.ratingCard}>
                <div class={styles.userInfo}>
                  <div class={styles.avatar}>
                    <Show 
                      when={rating.userAvatar}
                      fallback={<div class={styles.avatarPlaceholder}>{rating.userName.charAt(0)}</div>}
                    >
                      <img src={rating.userAvatar} alt={rating.userName} />
                    </Show>
                  </div>
                  <div class={styles.userDetails}>
                    <h4>{rating.userName}</h4>
                    <p class={styles.workDate}>
                      申請已核准: {formatDate(rating.workSubmittedAt)}
                    </p>
                    <Show when={rating.status === 'rated'}>
                      <p class={styles.workDate}>
                        評分時間: {formatDate(rating.ratedAt!)}
                      </p>
                    </Show>
                  </div>
                </div>

                <div class={styles.ratingContent}>
                  <Show 
                    when={rating.status === 'rated'}
                    fallback={
                      <div class={styles.unratedStatus}>
                        <span class={styles.statusBadge}>待評分</span>
                        <p class={styles.note}>請評價此員工的工作表現。</p>
                        <button 
                          class={styles.rateButton}
                          onclick={(e) => {
                            e.preventDefault();
                            openRatingModal(rating);
                          }}
                        >
                          評分員工
                        </button>
                      </div>
                    }
                  >
                    <div class={styles.ratingInfo}>
                      <div class={styles.stars}>
                        {renderStars(rating.employerRating || 0)}
                        <span class={styles.ratingValue}>({rating.employerRating}/5)</span>
                      </div>
                      <Show when={rating.ratedAt}>
                        <p class={styles.ratedDate}>
                          您於 {formatDate(rating.ratedAt!)} 評分
                        </p>
                      </Show>
                    </div>
                    <Show when={rating.employerComment}>
                      <div class={styles.comment}>
                        <p>{rating.employerComment}</p>
                      </div>
                    </Show>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </Show>

        <Show when={loading() && allRatings().length > 0}>
          <div class={styles.loadingMore}>載入更多評分中...</div>
        </Show>

        {/* 修復：為進行中工作提供更好的空狀態 */}
        <Show when={!loading() && allRatings().length === 0}>
          <div class={styles.emptyState}>
            <Show 
              when={!isJobCompleted()}
              fallback={
                <>
                  <h3>未找到已核准員工</h3>
                  <p>
                    <Show 
                      when={status() === 'all'}
                      fallback={`此工作尚無 ${status()} 員工。`}
                    >
                      此工作尚無已核准的申請。請檢查「申請」標籤以審核並核准候選人。
                    </Show>
                  </p>
                </>
              }
            >
              <h3>工作進行中</h3>
              <p>此工作目前正在進行中。員工評分將在工作完成並提交後提供。</p>
              <p style={{ 'margin-top': '10px', color: '#666' }}>
                請在員工完成工作後回來評價他們的工作表現。
              </p>
            </Show>
          </div>
        </Show>
      </div>

      {/* 評分彈出視窗 */}
      <Show when={showRatingModal()}>
        <div class={styles.modalOverlay} onclick={(e) => {
          e.preventDefault();
          closeRatingModal();
        }}>
          <div class={styles.modal} onclick={(e) => e.stopPropagation()}>
            <div class={styles.modalHeader}>
              <h3>評分員工</h3>
              <button 
                class={styles.closeButton} 
                onclick={(e) => {
                  e.preventDefault();
                  closeRatingModal();
                }}
              >×</button>
            </div>
            
            <div class={styles.modalContent}>
              <Show when={selectedEmployee()}>
                <div class={styles.employeeInfo}>
                  <h4>{selectedEmployee()!.userName}</h4>
                  <p>申請於 {formatDate(selectedEmployee()!.workSubmittedAt)} 核准</p>
                </div>

                <Show when={error()}>
                  <div style={{ 
                    background: '#fee', 
                    border: '1px solid #fcc', 
                    color: '#c33', 
                    padding: '8px', 
                    margin: '10px 0', 
                    'border-radius': '4px',
                    'font-size': '14px'
                  }}>
                    {error()}
                  </div>
                </Show>

                <div class={styles.ratingSection}>
                  <label>評分: {newRating() > 0 && <span>({newRating()}/5)</span>}</label>
                  <div class={styles.starRating}>
                    {renderStars(newRating(), true)}
                  </div>
                  <p class={styles.ratingInstruction}>點擊星星選擇您的評分</p>
                </div>

                <div class={styles.commentSection}>
                  <label for="comment">評論（選填）:</label>
                  <textarea
                    id="comment"
                    class={styles.commentInput}
                    value={newComment()}
                    onInput={(e) => {
                      setNewComment((e.target as HTMLTextAreaElement).value);
                      setError('');
                    }}
                    placeholder="分享您對此員工工作的回饋..."
                    rows={4}
                  />
                </div>

                <div class={styles.modalActions}>
                  <button 
                    class={styles.cancelButton} 
                    onclick={(e) => {
                      e.preventDefault();
                      closeRatingModal();
                    }}
                    disabled={submittingRating()}
                  >
                    取消
                  </button>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button 
                      class={`${styles.submitButton} ${newRating() === 0 || submittingRating() ? styles.disabled : ''}`}
                      onclick={(e) => {
                        if (newRating() === 0) {
                          e.preventDefault();
                          setError('請透過點擊上方的星星選擇評分');
                          return;
                        }
                        submitRating(e);
                      }}
                      disabled={submittingRating()}
                      type="button"
                    >
                      {submittingRating() ? '提交中...' : '提交評分'}
                    </button>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}