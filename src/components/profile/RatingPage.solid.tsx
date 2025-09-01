
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';

// Interface for a single rating item
interface Rating {
  id: string;
  ratingValue: number;
  comment: string;
  createdAt: string;
}

// Interface for the API response
interface RatingsApiResponse {
  data: {
    receivedRatings: Rating[];
    pagination: {
      hasMore: boolean;
      offset?: number;
    };
  };
}

// Props for the component
interface RatingPageProps {
  // The ID of the entity for which to fetch ratings (e.g., user ID)
  averageRating: number;
  totalRatings: number;
}

export default function RatingPage(props: RatingPageProps) {
  const [ratings, setRatings] = createSignal<Rating[]>([]);
  const [hasMore, setHasMore] = createSignal<boolean>(true);
  const [offset, setOffset] = createSignal<number>(0);
  const [loading, setLoading] = createSignal<boolean>(false);
  const limit = 6; // Number of ratings to fetch per page

  let sentinel: HTMLDivElement | undefined;

  const fetchRatings = async () => {
    if (loading() || !hasMore()) {
      return;
    }
    setLoading(true);

    try {
      // The API endpoint is left for you to fill in.
      // You might want to use props.targetId to construct the URL.
      const apiUrl = '/api/rating/received-ratings/employer'
      
      if (!apiUrl) {
        console.warn("API URL is not set. Please fill it in to fetch ratings.");
        setLoading(false);
        setHasMore(false);
        return;
      }

      const response = await fetch(`${apiUrl}?offset=${offset()}&limit=${limit}`);
      const result: RatingsApiResponse = await response.json();

      if (result && result.data) {
        setRatings(prev => [...prev, ...result.data.receivedRatings]);
        console.log("Fetched ratings:", result.data.receivedRatings);
        setHasMore(result.data.pagination.hasMore);
        if (result.data.pagination.offset) {
          setOffset(result.data.pagination.offset);
        } else {
          // setOffset(prev => prev + result.data.receivedRatings.length);
        }
      }
    } catch (error) {
      console.error("Failed to fetch ratings:", error);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    fetchRatings(); // Fetch initial ratings

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        fetchRatings();
      }
    }, { threshold: 1.0 });

    if (sentinel) {
      observer.observe(sentinel);
    }

    onCleanup(() => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    });
  });

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);                                                                                
    const halfStar = rating % 1 >= 0.5; 
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <div class="flex items-center">
        {[...Array(fullStars)].map(() => <span class="text-yellow-400 text-xl">★</span>)}
        {/* Note: For a true half-star, you would typically use a specific half-star icon */}
        {halfStar && <span class="text-yellow-400 text-xl">★</span>}
        {[...Array(emptyStars)].map(() => <span class="text-gray-300 text-xl">★</span>)}
      </div>
    );
  };

  return (
    <div class="p-6 bg-white min-h-screen">
      <header class="flex flex-col items-center mb-6 pb-4 border-b">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Ratings & Reviews</h2>
        <div class="flex flex-col items-center gap-2">
          <strong class="text-5xl font-bold text-gray-900">{props.averageRating.toFixed(1)}</strong>
          {renderStars(props.averageRating)}
          <span class="text-sm text-gray-500">({props.totalRatings} ratings)</span>
        </div>
      </header>

      <div class="max-w-2xl mx-auto space-y-4">
        <For each={ratings()} fallback={<p class="text-center text-gray-500">No ratings yet.</p>}>
          {rating => (
            <div class="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
              <div class="flex justify-between items-center mb-2">
                {renderStars(rating.ratingValue)}
                <span class="text-xs text-gray-400">{new Date(rating.createdAt).toLocaleDateString()}</span>
              </div>
              <p class="text-gray-600">{rating.comment}</p>
            </div>
          )}
        </For>
      </div>

      <Show when={loading()}>
        <div class="text-center text-gray-500 py-4">Loading more...</div>
      </Show>

      <Show when={!hasMore() && ratings().length > 0}>
        <div class="text-center text-gray-500 py-4">- End of ratings -</div>
      </Show>

      {/* Sentinel for infinite scroll */}
      <div ref={sentinel} style={{ height: '10px' }} />
    </div>
  );
}
