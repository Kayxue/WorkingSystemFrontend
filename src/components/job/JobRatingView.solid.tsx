// File: JobRatingView.solid.tsx
import { createSignal, createResource, Show, For, onMount } from "solid-js";
import styles from "../../styles/JobRating.module.css";

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
  const [error, setError] = createSignal<string>('');

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
    setError(''); // Clear previous errors
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
    setSelectedEmployee(employee);
    setNewRating(employee.employerRating || 0);
    setNewComment(employee.employerComment || '');
    setError(''); // Clear any previous errors
    setShowRatingModal(true);
  };

  const closeRatingModal = () => {
    setShowRatingModal(false);
    setSelectedEmployee(null);
    setNewRating(0);
    setNewComment('');
    setError(''); // Clear errors when closing
  };

  // FIXED: Improved submit function with better error handling and response management
  const submitRating = async (e?: Event) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const employee = selectedEmployee();
    const rating = newRating();
    
    // Enhanced validation
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
    setError(''); // Clear previous errors
    
    console.log('Submitting rating:', {
      gigId: props.gigId,
      userId: employee.userId,
      rating: rating,
      comment: newComment().trim()
    });

    try {
      const ratingData = {
        gigId: props.gigId,
        userId: employee.userId,
        rating: rating,
        comment: newComment().trim() || undefined // Send undefined if empty
      };

      console.log('Sending rating data:', ratingData);

      // Helper function to safely handle response
      const handleResponse = async (response: Response) => {
        console.log('API response status:', response.status, response.statusText);
        
        if (response.ok) {
          let result;
          try {
            // Clone response to avoid "body stream already read" error
            const responseClone = response.clone();
            result = await response.json();
            console.log('Rating submitted successfully:', result);
          } catch (parseError) {
            console.log('Response OK but failed to parse JSON, treating as success');
            result = { success: true };
          }
          return { success: true, data: result };
        } else {
          // Clone response for error handling
          const responseClone = response.clone();
          let errorMessage = `HTTP Error ${response.status}`;
          
          try {
            // Try to parse as JSON first
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorData.details || errorMessage;
          } catch (jsonError) {
            try {
              // If JSON parsing fails, try text from clone
              const errorText = await responseClone.text();
              errorMessage = errorText || errorMessage;
            } catch (textError) {
              console.error('Failed to read error response:', textError);
            }
          }
          
          return { success: false, error: errorMessage };
        }
      };

      // Try multiple endpoints with proper error handling
      let response;
      let result;

      // First endpoint
      try {
        response = await fetch(`/api/rating/employer`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'platform': 'web-employer'
          },
          credentials: 'include',
          body: JSON.stringify(ratingData)
        });

        result = await handleResponse(response);
        if (result.success) {
          // Success! Update state and close modal
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
          return;
        }
      } catch (fetchError) {
        console.log('First endpoint fetch failed:', fetchError);
      }

      // Second endpoint
      try {
        console.log('Trying second endpoint...');
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

        result = await handleResponse(response);
        if (result.success) {
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
          alert('Rating berhasil disimpan!');
          return;
        }
      } catch (fetchError) {
        console.log('Second endpoint fetch failed:', fetchError);
      }

      // Third endpoint
      try {
        console.log('Trying third endpoint...');
        response = await fetch(`/api/ratings`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'platform': 'web-employer'
          },
          credentials: 'include',
          body: JSON.stringify(ratingData)
        });

        result = await handleResponse(response);
        if (result.success) {
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
          alert('Rating berhasil disimpan!');
          return;
        }
      } catch (fetchError) {
        console.log('Third endpoint fetch failed:', fetchError);
      }

      // If all endpoints failed
      const lastError = result?.error || 'All API endpoints failed';
      throw new Error(lastError);
      
    } catch (error) {
      console.error('Error submitting rating:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to submit rating: ${errorMsg}`);
      
      // Don't close modal on error so user can retry
    } finally {
      setSubmittingRating(false);
    }
  };

  const loadMore = () => {
    if (!loading()) {
      loadRatings(false);
    }
  };

  // FIXED: Star rendering function with proper event handling
  const renderStars = (rating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span 
        class={`${styles.star} ${i < rating ? styles.filled : styles.unfilled} ${interactive ? styles.interactive : ''}`}
        onclick={interactive ? (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Star clicked:', i + 1);
          setNewRating(i + 1);
          setError(''); // Clear error when user interacts
        } : undefined}
        style={{
          cursor: interactive ? 'pointer' : 'default',
          color: i < rating ? '#FFD700' : '#D3D3D3',
          fontSize: '1.5em',
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
      return dateString; // Fallback to original string if parsing fails
    }
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

      {/* Error display */}
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
                      <button 
                        class={styles.editButton}
                        onclick={(e) => {
                          e.preventDefault();
                          openRatingModal(rating);
                        }}
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
                  <p>Application approved on {formatDate(selectedEmployee()!.workCompletedAt)}</p>
                </div>

                {/* Error display in modal */}
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
                      setError(''); // Clear error when user types
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
                  <button 
                    class={`${styles.submitButton} ${newRating() === 0 || submittingRating() ? styles.disabled : ''}`}
                    onclick={submitRating}
                    disabled={newRating() === 0 || submittingRating()}
                    type="button"
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