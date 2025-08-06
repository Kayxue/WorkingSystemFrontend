// File: JobRatingView.solid.tsx
import { createSignal, createResource, Show, For, onMount } from "solid-js";
import styles from "../styles/JobRating.module.css";

type RatingStatus = 'all' | 'rated' | 'unrated';

interface RatingItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  status: 'rated' | 'unrated';
  employerRating?: number; // 1-5 scale - employer rating for employee
  employerComment?: string;
  ratedAt?: string;
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

  // Fetch approved applications that can be rated
  const fetchRatings = async (
    gigId: string, 
    status: RatingStatus, 
    limit: number, 
    offset: number
  ): Promise<RatingResponse> => {
    try {
      // First get approved applications for this gig
      const applicationsResponse = await fetch(`/api/application/gig/${encodeURIComponent(gigId)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
      });

      if (!applicationsResponse.ok) {
        throw new Error('Failed to fetch applications');
      }

      const applicationsResult = await applicationsResponse.json();
      const approvedApplications = applicationsResult.data.applications.filter(
        (app: any) => app.status === 'approved'
      );

      // Then get existing ratings for this gig
      const ratingsResponse = await fetch(
        `/api/rating/list/employer/gig/${gigId}?status=${status}&limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "platform": "web-employer",
          },
          credentials: "include",
        }
      );

      let existingRatings = [];
      if (ratingsResponse.ok) {
        const ratingsResult = await ratingsResponse.json();
        existingRatings = ratingsResult.data || [];
      }

      // Combine approved applications with existing ratings
      const ratingItems: RatingItem[] = approvedApplications.map((app: any) => {
        const existingRating = existingRatings.find((rating: any) => rating.userId === app.workerId);
        
        return {
          id: app.applicationId,
          userId: app.workerId,
          userName: app.workerName,
          userAvatar: app.workerAvatar,
          status: existingRating ? 'rated' : 'unrated',
          employerRating: existingRating?.rating,
          employerComment: existingRating?.comment,
          ratedAt: existingRating?.ratedAt,
          workCompletedAt: app.updatedAt, // Use application update time as work completion
          workSubmittedAt: app.updatedAt,
        };
      });

      // Filter by status if needed
      const filteredData = status === 'all' 
        ? ratingItems 
        : ratingItems.filter(item => item.status === status);

      return {
        data: filteredData.slice(offset, offset + limit),
        total: filteredData.length,
        hasMore: offset + limit < filteredData.length
      };

    } catch (error) {
      console.error('Error fetching ratings:', error);
      throw error;
    }
  };

  const loadRatings = async (reset = false) => {
    setLoading(true);
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
      
      setTotalCount(response.total);
    } catch (error) {
      console.error('Error loading ratings:', error);
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
    setSelectedEmployee(employee);
    setNewRating(employee.employerRating || 0);
    setNewComment(employee.employerComment || '');
    setShowRatingModal(true);
  };

  const closeRatingModal = () => {
    setShowRatingModal(false);
    setSelectedEmployee(null);
    setNewRating(0);
    setNewComment('');
  };

  const submitRating = async () => {
    const employee = selectedEmployee();
    if (!employee || newRating() === 0) {
      console.log('Cannot submit rating: missing employee or rating', { employee: employee(), rating: newRating() });
      alert('Please select a rating before submitting.');
      return;
    }

    setSubmittingRating(true);
    console.log('Submitting rating:', {
      gigId: props.gigId,
      userId: employee.userId,
      rating: newRating(),
      comment: newComment()
    });

    try {
      // API call to submit rating - try different endpoint patterns
      let response;
      const ratingData = {
        gigId: props.gigId,
        userId: employee.userId,
        rating: newRating(),
        comment: newComment()
      };

      // Try the main rating endpoint first
      response = await fetch(`/api/rating/employer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'platform': 'web-employer'
        },
        credentials: 'include',
        body: JSON.stringify(ratingData)
      });

      // If that fails, try alternative endpoint
      if (!response.ok) {
        console.log('First endpoint failed, trying alternative...');
        response = await fetch(`/api/rating/create`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'platform': 'web-employer'
          },
          credentials: 'include',
          body: JSON.stringify({
            ...ratingData,
            type: 'employer_to_worker'
          })
        });
      }

      console.log('Rating API response:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('Rating submitted successfully:', result);
        
        // Update local state
        setAllRatings(prev => prev.map(item => 
          item.id === employee.id 
            ? {
                ...item,
                status: 'rated' as const,
                employerRating: newRating(),
                employerComment: newComment(),
                ratedAt: new Date().toISOString()
              }
            : item
        ));
        
        closeRatingModal();
        
        // Show success message
        alert('Rating submitted successfully!');
      } else {
        const errorText = await response.text();
        console.error('Rating API error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert(`Failed to submit rating: ${error.message}`);
    } finally {
      setSubmittingRating(false);
    }
  };

  const loadMore = () => {
    if (!loading()) {
      loadRatings(false);
    }
  };

  // FIXED: Star rendering function with proper event handling and styling
  const renderStars = (rating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span 
        class={`${styles.star} ${i < rating ? styles.filled : styles.unfilled} ${interactive ? styles.interactive : ''}`}
        onclick={interactive ? () => {
          console.log('Star clicked:', i + 1);
          setNewRating(i + 1);
        } : undefined}
        style={{
          cursor: interactive ? 'pointer' : 'default',
          color: i < rating ? '#FFD700' : '#D3D3D3', // Gold for filled, light gray for unfilled
          fontSize: '1.5em',
          transition: 'color 0.2s ease',
          ...(interactive && { ':hover': { color: '#FFA500' } }) // Orange on hover for interactive stars
        }}
      >
        ★
      </span>
    ));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  onMount(() => {
    loadRatings(true);
  });

  return (
    <div class={styles.ratingViewContainer}>
      <div class={styles.header}>
        <h2>Rate Approved Employees</h2>
        <div class={styles.stats}>
          <span>Approved Applications: {totalCount()}</span>
        </div>
      </div>

      <div class={styles.filters}>
        <div class={styles.statusFilter}>
          <button
            class={`${styles.filterButton} ${status() === 'all' ? styles.active : ''}`}
            onclick={() => handleStatusChange('all')}
          >
            All ({totalCount()})
          </button>
          <button
            class={`${styles.filterButton} ${status() === 'rated' ? styles.active : ''}`}
            onclick={() => handleStatusChange('rated')}
          >
            Rated
          </button>
          <button
            class={`${styles.filterButton} ${status() === 'unrated' ? styles.active : ''}`}
            onclick={() => handleStatusChange('unrated')}
          >
            Unrated
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
                      Application approved: {formatDate(rating.workCompletedAt)}
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
                          onclick={() => openRatingModal(rating)}
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
                      <button 
                        class={styles.editButton}
                        onclick={() => openRatingModal(rating)}
                      >
                        Edit Rating
                      </button>
                    </div>
                    <Show when={rating.employerComment}>
                      <div class={styles.comment}>
                        <p>"{rating.employerComment}"</p>
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

        <Show when={!loading() && allRatings().length === 0}>
          <div class={styles.emptyState}>
            <h3>No approved employees found</h3>
            <p>
              <Show 
                when={status() === 'all'}
                fallback={`No ${status()} employees for this job yet.`}
              >
                No approved applications for this job yet. Check the Applications tab to review and approve candidates.
              </Show>
            </p>
          </div>
        </Show>
      </div>

      {/* Rating Modal */}
      <Show when={showRatingModal()}>
        <div class={styles.modalOverlay} onclick={closeRatingModal}>
          <div class={styles.modal} onclick={(e) => e.stopPropagation()}>
            <div class={styles.modalHeader}>
              <h3>Rate Employee</h3>
              <button class={styles.closeButton} onclick={closeRatingModal}>×</button>
            </div>
            
            <div class={styles.modalContent}>
              <Show when={selectedEmployee()}>
                <div class={styles.employeeInfo}>
                  <h4>{selectedEmployee()!.userName}</h4>
                  <p>Application approved on {formatDate(selectedEmployee()!.workCompletedAt)}</p>
                </div>

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
                    onInput={(e) => setNewComment(e.target.value)}
                    placeholder="Share your feedback about this employee's work..."
                    rows={4}
                  />
                </div>

                <div class={styles.modalActions}>
                  <button class={styles.cancelButton} onclick={closeRatingModal}>
                    Cancel
                  </button>
                  <button 
                    class={`${styles.submitButton} ${newRating() === 0 ? styles.disabled : ''}`}
                    onclick={submitRating}
                    disabled={newRating() === 0 || submittingRating()}
                  >
                    {submittingRating() ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}