// src/components/profile/Notifications.solid.tsx
import { createSignal, onMount, For, Show } from 'solid-js';

// --- Types ---
interface Notification {
  notificationId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface Pagination {
  limit: number;
  offset: number;
  hasMore: boolean;
  returned: number;
  total: number;
}

// --- Helper Functions ---
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const getIconForType = (type: string) => {
  const baseClasses = "w-5 h-5"; // Slightly smaller icon to fit the design
  switch (type) {
    case 'system_announcement':
      return <svg xmlns="http://www.w3.org/2000/svg" class={`${baseClasses} text-blue-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'new_applicant':
      return <svg xmlns="http://www.w3.org/2000/svg" class={`${baseClasses} text-green-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
    default:
      return <svg xmlns="http://www.w3.org/2000/svg" class={`${baseClasses} text-gray-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
  }
};

// --- Component ---
const Notifications = () => {
  const [notifications, setNotifications] = createSignal<Notification[]>([]);
  const [pagination, setPagination] = createSignal<Pagination | null>(null);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const fetchNotifications = async (page: number) => {
    setIsLoading(true);
    setError(null);
    const limit = 8; // A limit that fits well in a settings page view
    const offset = (page - 1) * limit;

    try {
      const response = await fetch(`/api/notifications/list?limit=${limit}&offset=${offset}`);
      if (!response.ok) throw new Error('無法獲取通知');
      
      const data = await response.json();
      const apiPagination = data.data.pagination.total 
        ? data.data.pagination 
        : { ...data.data.pagination, total: (data.data.pagination.offset + data.data.pagination.returned + (data.data.pagination.hasMore ? 1 : 0)) };

      setNotifications(data.data.notifications);
      setPagination(apiPagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    fetchNotifications(currentPage());
  });

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || (pagination() && newPage > totalPages())) return;
    setCurrentPage(newPage);
    fetchNotifications(newPage);
  };

  const totalPages = () => {
    if (!pagination() || !pagination()!.total) return 1;
    return Math.ceil(pagination()!.total / pagination()!.limit);
  };

  return (
    <section>
      <h2 class="text-2xl font-semibold text-gray-800 mb-6">通知中心</h2>
      
      <div class="border border-gray-200 rounded-lg">
        <ul class="divide-y divide-gray-200">
          <For each={notifications()} fallback={
            <Show when={!isLoading() && !error()}>
              <li class="p-6 text-center text-gray-500">
                <p>沒有任何通知</p>
              </li>
            </Show>
          }>
            {(notification) => (
              <li class={`p-4 flex items-start gap-4 ${!notification.isRead ? 'bg-blue-50/30' : 'bg-white'}`}>
                <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white mt-1">
                  {getIconForType(notification.type)}
                </div>
                <div class="flex-grow">
                  <div class="flex justify-between items-baseline">
                    <p class={`text-sm font-semibold text-gray-800 ${!notification.isRead && 'font-bold'}`}>{notification.title}</p>
                    <p class="text-xs text-gray-500 flex-shrink-0 ml-4">{formatDate(notification.createdAt)}</p>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">{notification.message || '此通知沒有額外內容。'}</p>
                </div>
              </li>
            )}
          </For>
        </ul>

        <Show when={isLoading()}>
          <div class="p-6 text-center text-gray-500">讀取中...</div>
        </Show>
        <Show when={error()}>
          <div class="p-6 text-center text-red-600 bg-red-50">{error()}</div>
        </Show>

        <Show when={pagination() && pagination()!.total > pagination()!.limit}>
          <div class="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={() => handlePageChange(currentPage() - 1)}
              disabled={currentPage() === 1}
              class="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一頁
            </button>
            <span class="text-sm text-gray-600">
              第 {currentPage()} / {totalPages()} 頁
            </span>
            <button
              onClick={() => handlePageChange(currentPage() + 1)}
              disabled={!pagination()?.hasMore}
              class="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一頁
            </button>
          </div>
        </Show>
      </div>
    </section>
  );
};

export default Notifications;
