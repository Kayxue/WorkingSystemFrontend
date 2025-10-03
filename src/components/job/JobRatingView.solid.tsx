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
  const [isJobCompleted, setIsJobCompleted] = createSignal(true); // Track if job has completed work

  // FIXED: Handle 404 errors for ongoing jobs
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

      // FIXED: Handle 404 for ongoing jobs with no completed work
      if (response.status === 404) {
        console.log("No rating data found for this job (likely ongoing/no completed work)");
        setIsJobCompleted(false);
        return {
          data: [],
          total: 0,
          hasMore: false,
        };
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch rating list: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Ratings API response:", result);

      setIsJobCompleted(true); // Job has completed work

      const workers = result.data?.workers || [];
      const pagination = result.data?.pagination || { returned: 0, hasMore: false };

      const ratingItems: RatingItem[] = workers.map((worker: any) => ({
        id: worker.workerId + "-" + gigId,
        workerId: worker.workerId,
        userName: worker.name || "Unknown Worker",
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
      console.error("Error fetching ratings:", error);
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

      // --- Always update counts from "all" status ---
      const allResponse = await fetchRatings(props.gigId, "all", limit(), 0);
      const allData = allResponse.data;

      setAllCount(allData.length);
      setRatedCount(allData.filter(r => r.status === "rated").length);
      setUnratedCount(allData.filter(r => r.status === "unrated").length);

      setFilteredCount(response.total);
    } catch (error) {
      console.error('Error loading ratings:', error);
      setError('Failed to load ratings. Please try again.');
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
      setError('No employee selected');
      return;
    }
    
    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a rating between 1 and 5 stars');
      return;
    }

    if (!props.gigId) {
      setError('Missing job ID');
      return;
    }

    setSubmittingRating(true);
    setError('');
    
    console.log('Submitting rating:', {
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

      console.log('Sending rating data with correct field name:', ratingData);

      const response = await fetch(`/api/rating/worker/${employee.workerId}/gig/${props.gigId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'platform': 'web-employer'
        },
        credentials: 'include',
        body: JSON.stringify(ratingData)
      });

      console.log('API response status:', response.status, response.statusText);

      if (response.ok) {
        let result;
        try {
          result = await response.json();
          console.log('Rating submitted successfully:', result);
        } catch (parseError) {
          console.log('Response OK but failed to parse JSON, treating as success');
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
        alert('Rating submitted successfully!');
        loadRatings(true)
        //window.location.reload()
        
      } else {
        let errorMessage = `HTTP Error ${response.status}`;
        
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);
          errorMessage = errorData.message || errorData.error || errorData.details || JSON.stringify(errorData);
        } catch (jsonError) {
          try {
            const errorText = await response.text();
            console.log('Error response text:', errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error('Failed to read error response:', textError);
          }
        }
        
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to submit rating: ${errorMsg}`);
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
          console.log('Star clicked:', i + 1);
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
      return new Date(dateString).toLocaleDateString('id-ID', {
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
        <h2>Rate Approved Employees</h2>
        
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
            All ({allCount()})
          </button>
          <button
            class={`${styles.filterButton} ${status() === 'rated' ? styles.active : ''}`}
            onclick={() => handleStatusChange('rated')}
          >
            Rated ({ratedCount()})
          </button>
          <button
            class={`${styles.filterButton} ${status() === 'unrated' ? styles.active : ''}`}
            onclick={() => handleStatusChange('unrated')}
          >
            Unrated ({unratedCount()})
          </button>
        </div>
      </div>

      <div class={styles.ratingsList}>
        <Show 
          when={!loading() || allRatings().length > 0}
          fallback={<div class={styles.loading}>Loading ratings...</div>}
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
                      Application approved: {formatDate(rating.workSubmittedAt)}
                    </p>
                    <Show when={rating.status === 'rated'}>
                      <p class={styles.workDate}>
                        Rated: {formatDate(rating.ratedAt!)}
                      </p>
                    </Show>
                  </div>
                </div>

                <div class={styles.ratingContent}>
                  <Show 
                    when={rating.status === 'rated'}
                    fallback={
                      <div class={styles.unratedStatus}>
                        <span class={styles.statusBadge}>Pending Rating</span>
                        <p class={styles.note}>Rate this employee's performance.</p>
                        <button 
                          class={styles.rateButton}
                          onclick={(e) => {
                            e.preventDefault();
                            openRatingModal(rating);
                          }}
                        >
                          Rate Employee
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
                          You rated on {formatDate(rating.ratedAt!)}
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
          <div class={styles.loadingMore}>Loading more ratings...</div>
        </Show>

        {/* FIXED: Better empty state for ongoing jobs */}
        <Show when={!loading() && allRatings().length === 0}>
          <div class={styles.emptyState}>
            <Show 
              when={!isJobCompleted()}
              fallback={
                <>
                  <h3>No approved employees found</h3>
                  <p>
                    <Show 
                      when={status() === 'all'}
                      fallback={`No ${status()} employees for this job yet.`}
                    >
                      No approved applications for this job yet. Check the Applications tab to review and approve candidates.
                    </Show>
                  </p>
                </>
              }
            >
              <h3>Job In Progress</h3>
              <p>This job is currently ongoing. Employee ratings will be available once work has been completed and submitted.</p>
              <p style={{ 'margin-top': '10px', color: '#666' }}>
                Check back after employees have completed their work to rate their performance.
              </p>
            </Show>
          </div>
        </Show>
      </div>

      {/* Rating Modal */}
      <Show when={showRatingModal()}>
        <div class={styles.modalOverlay} onclick={(e) => {
          e.preventDefault();
          closeRatingModal();
        }}>
          <div class={styles.modal} onclick={(e) => e.stopPropagation()}>
            <div class={styles.modalHeader}>
              <h3>Rate Employee</h3>
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
                  <p>Application approved on {formatDate(selectedEmployee()!.workSubmittedAt)}</p>
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
                  <label>Rating: {newRating() > 0 && <span>({newRating()}/5)</span>}</label>
                  <div class={styles.starRating}>
                    {renderStars(newRating(), true)}
                  </div>
                  <p class={styles.ratingInstruction}>Click on a star to select your rating</p>
                </div>

                <div class={styles.commentSection}>
                  <label for="comment">Comment (optional):</label>
                  <textarea
                    id="comment"
                    class={styles.commentInput}
                    value={newComment()}
                    onInput={(e) => {
                      setNewComment((e.target as HTMLTextAreaElement).value);
                      setError('');
                    }}
                    placeholder="Share your feedback about this employee's work..."
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
                    Cancel
                  </button>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button 
                      class={`${styles.submitButton} ${newRating() === 0 || submittingRating() ? styles.disabled : ''}`}
                      onclick={(e) => {
                        if (newRating() === 0) {
                          e.preventDefault();
                          setError('Please select a rating by clicking on the stars above');
                          return;
                        }
                        submitRating(e);
                      }}
                      disabled={submittingRating()}
                      type="button"
                    >
                      {submittingRating() ? 'Submitting...' : 'Submit Rating'}
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