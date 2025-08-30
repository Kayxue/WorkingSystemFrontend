import { createSignal, onMount, For, Show } from 'solid-js';

interface Notification {
  notificationId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: string;
  resourceId: string | null;
}

function NotificationPage() {
  const [notifications, setNotifications] = createSignal<Notification[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [offset, setOffset] = createSignal(0);
  const [hasMore, setHasMore] = createSignal(false);
  const [unreadNotifications, setUnreadNotifications] = createSignal(false);
  const [hoveredNotification, setHoveredNotification] = createSignal<string | null>(null);
  const [showActionsMenu, setShowActionsMenu] = createSignal<string | null>(null);

  const limit = 10;

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications/list?limit=${limit}&offset=${offset()}${unreadNotifications() ? '&unreadOnly=true' : ''}`);
      if (response.ok) {
        const data = await response.json();
        const newNotifications = data.data.notifications;
        setNotifications(prev => [...prev, ...newNotifications]);
        setOffset(prev => prev + newNotifications.length);
        setHasMore(data.data.pagination.hasMore);
      } else {
        console.error("Failed to fetch notifications:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-as-read?isRead=true', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'platform': 'web-employer',
        },
        body: JSON.stringify({notificationIds: [notificationId]}),
      });

      if (response.ok) {
        setNotifications(notifications().map(n =>
          n.notificationId === notificationId ? { ...n, isRead: true } : n
        ));
      } else {
        console.error("Failed to mark notification as read:", response.statusText);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAsUnread = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-as-read?isRead=false', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'platform': 'web-employer',
        },
        body: JSON.stringify({notificationIds: [notificationId]}),
      });

      if (response.ok) {
        setNotifications(notifications().map(n =>
          n.notificationId === notificationId ? { ...n, isRead: false } : n
        ));
      } else {
        console.error("Failed to mark notification as unread:", response.statusText);
      }
    } catch (error) {
      console.error("Error marking notification as unread:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'platform': 'web-employer',
        },
      });

      if (response.ok) {
        setNotifications(notifications().filter(n => n.notificationId !== notificationId));
      } else {
        console.error("Failed to delete notification:", response.statusText);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-as-read?isRead=true', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'platform': 'web-employer',
          },
          body: JSON.stringify({ notificationIds: notifications().filter(n => !n.isRead).map(n => n.notificationId) }),
      });

      if (response.ok) {
        setNotifications(notifications().map(n => ({ ...n, isRead: true })));
      } else {
        console.error("Failed to mark all notifications as read:", response.statusText);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };
    

  onMount(() => {
    fetchNotifications();
  });

  const formatTimeAgo = (dateString: string) => {
    let notificationTime: number;
    let nowTime: number;

    if (dateString.endsWith("Z")) {
      const [datePart, timePart] = dateString.replace("Z", "").split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute, second] = timePart.split(":").map(Number);
      notificationTime = Date.UTC(year, month - 1, day, hour, minute, second);

      const localNow = new Date();
      nowTime = Date.UTC(
        localNow.getFullYear(),
        localNow.getMonth(),
        localNow.getDate(),
        localNow.getHours(),
        localNow.getMinutes(),
        localNow.getSeconds()
      );
    } else {
      notificationTime = new Date(dateString).getTime();
      nowTime = Date.now();
    }

    const seconds = Math.floor((nowTime - notificationTime) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + " 年前";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + " 個月前";
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + " 天前";
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " 小時前";
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " 分鐘前";
    }
    return "剛剛";
  };

  return (
    <div class="max-sm:min-w-xs sm:min-w-2xl mx-auto my-22 px-4 sm:px-6 lg:px-8 py-8 bg-white shadow-md rounded-lg overflow-hidden">
      <div class="flex flex-row place-content-between w-full ">
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">通知</h1>
        <button
          onClick={markAllAsRead}
          class="px-4 mb-6 text-sm font-medium text-blue-600 focus:outline-none bg-white rounded-full hover:bg-gray-100 focus:z-10 focus:ring-4 focus:ring-gray-100 cursor-pointer"
        >
          全標為已讀
        </button>
      </div>

      <div class="py-2 font-medium text-base">
        <button
          class={`px-3 py-2.5 text-center me-2 mb-2 rounded-full hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${!unreadNotifications() ? 'bg-blue-100 text-blue-600' : ''}`}
          onClick={() => {
            if (!unreadNotifications()) return;
            setUnreadNotifications(false);
            setNotifications([]);
            setOffset(0);
            setHasMore(true);
            fetchNotifications()
          }}
        >
          全部
        </button>
        <button
          class={`px-3 py-2.5 text-center me-2 mb-2 rounded-full hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${unreadNotifications() ? 'bg-blue-100 text-blue-600' : ''}`}
          onClick={() => {
            if (unreadNotifications()) return;
            setUnreadNotifications(true);
            setNotifications([]);
            setOffset(0);
            setHasMore(true);
            fetchNotifications()
          }}
        >
          未讀
        </button>
      </div>

      <div>
        <For each={notifications()} fallback={
          <Show when={!isLoading()}>
            <p class="p-4 text-center text-gray-500">目前沒有任何通知。</p>
          </Show>
        }>
          {(notification) => (
            <div
              class="relative p-4 cursor-pointer transition-colors rounded-md hover:bg-gray-100"
              onMouseEnter={() => setHoveredNotification(notification.notificationId)}
              onMouseLeave={() => setHoveredNotification(null)}
              onClick={() => {
                if (notification.type === 'application' && notification.resourceId) {
                  if (!notification.isRead) markAsRead(notification.notificationId);
                  window.location.href = `/job/${notification.resourceId}?section=applications&status=pending`;
                }
              }}
            >
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <div class={`h-3 w-3 rounded-full mt-1.5 ${!notification.isRead ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                </div>
                <div class="ml-3 w-0 flex-1">
                  <p class={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-500'}`}>{notification.title}</p>
                  <p class="mt-1 text-sm text-gray-500">{notification.message}</p>
                  <p class="mt-1 text-xs text-gray-400">{formatTimeAgo(notification.createdAt)}</p>
                </div>
              </div>
              <Show when={hoveredNotification() === notification.notificationId}>
                <div class="absolute top-1/2 right-4 -translate-y-1/2">
                  <button 
                    class="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActionsMenu(showActionsMenu() === notification.notificationId ? null : notification.notificationId);
                    }}
                  >
                    <svg class="h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M6 12H6.01M12 12h.01M18 12h.01" />
                    </svg>
                  </button>
                  <Show when={showActionsMenu() === notification.notificationId}>
                    <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                      <button 
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          notification.isRead ? markAsUnread(notification.notificationId) : markAsRead(notification.notificationId);
                          setShowActionsMenu(null);
                        }}
                      >
                        {notification.isRead ? '標記為未讀' : '標記為已讀'}
                      </button>
                      <button 
                        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.notificationId);
                          setShowActionsMenu(null);
                        }}
                      >
                        刪除
                      </button>
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          )}
        </For>

        <Show when={hasMore() && !isLoading()}>
          <div class="flex justify-center items-center p-4 ">
            <button
              class="w-full px-4 py-2 text-sm font-bold text-black bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={fetchNotifications}
            >
              查看之前的通知
            </button>
          </div>
        </Show>
      </div>
      <Show when={isLoading()}>
        <div class="flex justify-center items-center p-4">
          <svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-2 text-gray-500">載入中...</span>
        </div>
      </Show>


    </div>
  );
}

export default NotificationPage;
