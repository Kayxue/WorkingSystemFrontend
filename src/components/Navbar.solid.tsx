import { createSignal, Show, onMount, For, createEffect, onCleanup } from 'solid-js';

interface NavBarProps {
  loggedIn: boolean;
  username: string;
  employerPhotoUrl: string | null;
}

interface Notification {
  notificationId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  resourceId: string| null;
}

function Navbar(props: NavBarProps) {
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const [notificationsOpen, setNotificationsOpen] = createSignal(false);
  const [haveUnreadNotifations, setHaveUnreadNotifications] = createSignal<boolean>(false);
  const [unreadNotifications, setUnreadNotifications] = createSignal<boolean>(false); 
  const [latestNotifications, setLatestNotifications] = createSignal<Notification[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [showActionsMenu, setShowActionsMenu] = createSignal<string | null>(null);
  const [onNotificationPage, setOnNotificationPage] = createSignal(false);
  const { loggedIn, username, employerPhotoUrl } = props;

  let notificationPanelRef: HTMLDivElement | undefined;
  let notificationButtonRef: HTMLButtonElement | undefined;
  let dropdownPanelRef: HTMLDivElement | undefined;
  let dropdownButtonRef: HTMLButtonElement | undefined;

  createEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsOpen() && 
          notificationPanelRef && 
          !notificationPanelRef.contains(event.target as Node) &&
          notificationButtonRef &&
          !notificationButtonRef.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }

      if (dropdownOpen() &&
          dropdownPanelRef &&
          !dropdownPanelRef.contains(event.target as Node) &&
          dropdownButtonRef &&
          !dropdownButtonRef.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (notificationsOpen() || dropdownOpen()) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    onCleanup(() => {
      document.removeEventListener('mousedown', handleClickOutside);
    });
  });

onMount(async () => {
  if (window.location.pathname === '/notification') {
    setOnNotificationPage(true);
  }
  if (loggedIn) {
    await checkHaveUnreadNotifications();
    if (haveUnreadNotifations()) {
      setUnreadNotifications(true);
    }
    fetchLatestNotifications();
  }
});

  const checkHaveUnreadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/unread', {
        method: 'GET',
        headers: {
          'platform': 'web-employer',
        }
      });

      if (!response.ok) {
        console.error("Failed to check unread notifications:", response.statusText);
        setHaveUnreadNotifications(false);
        return;
      }

      const data = await response.json();
      if (data.data.hasUnread) {
        setHaveUnreadNotifications(true);
      } else {
        setHaveUnreadNotifications(false);
      }
    } catch (error) {
      console.error("Error checking unread notifications:", error);
    }
  };

  const fetchLatestNotifications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notifications/list?limit=5&offset=0${unreadNotifications() ? '&unreadOnly=true' : ''}`, {
        method: 'GET'
      },
    );
      if (response.ok) {
        const data = await response.json();
        setLatestNotifications(data.data.notifications);
      } else {
        console.error("Failed to fetch latest notifications:", response.statusText);
      }
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
        setLatestNotifications(latestNotifications().map(n => 
          n.notificationId === notificationId ? { ...n, isRead: true } : n
        ));
        const hasUnread = latestNotifications().some(n => !n.isRead);
        setHaveUnreadNotifications(hasUnread);
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
        setLatestNotifications(latestNotifications().map(n =>
          n.notificationId === notificationId ? { ...n, isRead: false } : n
        ));
        setHaveUnreadNotifications(true);
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
        setLatestNotifications(latestNotifications().filter(n => n.notificationId !== notificationId));
      } else {
        console.error("Failed to delete notification:", response.statusText);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      if (latestNotifications().filter(n => !n.isRead).length === 0) return;
      const response = await fetch('/api/notifications/mark-as-read?isRead=true', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'platform': 'web-employer',
        },
        body: JSON.stringify({
          notificationIds: latestNotifications().filter(n => !n.isRead).map(n => n.notificationId),
        }),
      })

      if (response.ok) {
        setLatestNotifications(latestNotifications().map(n => ({ ...n, isRead: true })));
        setHaveUnreadNotifications(false);
      } else {
        console.error("Failed to mark notifications as read:", response.statusText);
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

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

  const getInitialsName = (name: string): string => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };
  
  const initialsName = getInitialsName(username);

  const handleLogout = async () => {
    await fetch("/api/user/logout", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "platform": "web-employer",
      },
      credentials: "include",
    });
    window.location.href = "/";
  };

  return (
    <nav class="bg-white px-2 sm:px-4 md:px-6 h-16 sm:h-18 flex items-center justify-between shadow-md border-b border-gray-200 fixed z-50 w-full">
      <div class="text-xl sm:text-2xl font-bold text-gray-800 hover:text-blue-600 transition-colors">
        <a href="/">WorkNow</a>
      </div>
      <Show when={loggedIn} fallback={
        <div class="flex items-center gap-2 sm:gap-4">
          <button class="px-4 sm:px-6 py-2 rounded-full font-semibold border-2 border-green-600 text-green-600 bg-transparent hover:bg-green-600 hover:text-white transition-all duration-200 text-sm sm:text-base" onClick={() => window.location.href = '/register'}>註冊</button>
          <button class="px-4 sm:px-6 py-2 rounded-full font-semibold border-2 border-blue-600 text-white bg-blue-600 hover:bg-blue-800 hover:border-blue-800 transition-all duration-200 text-sm sm:text-base" onClick={() => window.location.href = '/login'}>登入</button>
        </div>
      }>
        <div class="relative flex items-center gap-2 sm:gap-3">
          <div class="relative w-8 h-8 sm:w-10 sm:h-10">
            <button 
              class="p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => window.location.href = '/chat'}
              aria-label="訊息"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          </div>
          <div class="relative w-8 h-8 sm:w-10 sm:h-10">
            <button 
              ref={notificationButtonRef}
              class="p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {setNotificationsOpen(!notificationsOpen()); setDropdownOpen(false);}}
              aria-label="通知"
              disabled={onNotificationPage()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <Show when={haveUnreadNotifations()}>
                <span class="absolute top-1 right-1 flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </Show>
            </button>
            <div ref={notificationPanelRef} class={`fixed max-h-max w-[95vw] sm:mx-2 top-14 right-3 sm:top-16 sm:right-0 sm:w-96 bg-white border-t sm:border border-gray-200 sm:rounded-lg shadow-lg py-1 transition-all duration-200 ${notificationsOpen() ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
              <div class= "flex flex-row place-content-between">
                <div class="text-2xl px-4 py-2 font-semibold text-gray-800 ">通知</div>
                <button 
                  onClick={markAllNotificationsAsRead}
                  class="px-4 py-2 text-sm font-medium text-blue-600 focus:outline-none bg-white rounded-full hover:bg-gray-100 focus:z-10 focus:ring-4 focus:ring-gray-100 cursor-pointer"
                >
                  全標為已讀
                </button>
              </div>

              <div class="px-4 py-2 font-medium text-base">
                <button 
                  class={`px-3 py-2.5 text-center me-2 mb-2 rounded-full hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${!unreadNotifications() ? 'bg-blue-100 text-blue-600' : ''}`} 
                  onClick={() => {
                    if (!unreadNotifications()) return;
                    setUnreadNotifications(false);
                    setShowActionsMenu(null);
                    fetchLatestNotifications()
                  }}
                >
                  全部
                </button>
                <button 
                  class={`px-3 py-2.5 text-center me-2 mb-2 rounded-full hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${unreadNotifications() ? 'bg-blue-100 text-blue-600' : ''}`}
                  onClick={() => {
                    if (unreadNotifications()) return;
                    setUnreadNotifications(true);
                    setShowActionsMenu(null);                    
                    fetchLatestNotifications()
                  }}
                >
                  未讀
                </button>
              </div>
              <div class="max-h-96 overflow-y-auto">
                <Show when={!isLoading()} fallback={
                  <div class="flex items-center justify-center h-40">
                    <svg aria-hidden="true" class="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/></svg>
                    <span class="sr-only">Loading...</span>
                  </div>
                }>
                  <For each={latestNotifications()} fallback={<div class="p-4 text-center text-sm text-gray-500">沒有新的通知</div>}>
                    {(notification) => (
                      <div 
                        class="group relative w-full text-left px-4 py-3 hover:bg-gray-50 cursor-pointer"
                        classList={{ 'z-20': showActionsMenu() === notification.notificationId }}
                        onClick={() => {
                          if (showActionsMenu()) return;
                          if (notification.type == 'application') {
                            if (!notification.isRead) markAsRead(notification.notificationId);
                            window.location.href = `/job/${notification.resourceId}?section=applications&status=pending`;
                          }
                        }}>
                        <div class="flex items-start">
                          <div class="flex-shrink-0">
                            <div class={`h-2.5 w-2.5 rounded-full mt-1 ${!notification.isRead ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                          </div>
                          <div class="ml-3 w-0 flex-1 pr-12 md:pr-2">
                            <p class={`text-sm ${!notification.isRead ? 'font-bold text-black' : 'text-gray-600'}`}>{notification.message}</p>
                            <p class="text-xs text-gray-400 mt-1">{formatTimeAgo(notification.createdAt)}</p>
                          </div>
                        </div>
                        <div class="absolute top-1/2 right-4 -translate-y-1/2 block md:hidden md:group-hover:block md:focus-within:block">
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
                            <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-100 border border-gray-200">
                              <button 
                                class="block w-full text-left px-4 py-2 text-sm text-gray-700 bg-white hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  notification.isRead ? markAsUnread(notification.notificationId) : markAsRead(notification.notificationId);
                                  setShowActionsMenu(null);
                                }}
                              >
                                {notification.isRead ? '標記為未讀' : '標記為已讀'}
                              </button>
                              <button 
                                class="block w-full text-left px-4 py-2 text-sm text-gray-700 bg-white hover:bg-gray-100"
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
                      </div>
                    )}
                  </For>
                </Show>
              </div>
              <a href="/notification" class="block w-full text-center px-4 py-2 text-sm text-blue-600 hover:bg-gray-100 font-medium transition-colors">查看所有通知</a>
            </div>
          </div>
          <Show when={employerPhotoUrl} fallback={
            <div class="bg-gray-300 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border-2 border-blue-600 shadow-sm">
              <span>{initialsName}</span>
            </div>
          }>
            <img src={employerPhotoUrl!} alt="使用者頭像" class="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-blue-600 shadow-sm" />
          </Show>
          <button ref={dropdownButtonRef} class="flex items-center gap-1 bg-gray-100 text-gray-800 border border-gray-200 px-3 sm:px-4 py-2 rounded-full font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-base cursor-pointer" onClick={() => {setDropdownOpen(!dropdownOpen()); setNotificationsOpen(false);}}>
            {username} <span class="text-xs">▼</span>
          </button>
          <div ref={dropdownPanelRef} class={`fixed top-16 left-0 right-0 sm:absolute sm:top-14 sm:left-auto sm:right-0 bg-white border-t sm:border border-gray-200 sm:rounded-lg shadow-lg py-2 w-full sm:min-w-[160px] sm:w-auto transition-all duration-200 ${dropdownOpen() ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            <button class="block w-full text-left px-4 sm:px-5 py-2 text-gray-800 hover:bg-gray-100 hover:text-blue-600 transition-colors text-sm sm:text-base cursor-pointer" onClick={() => window.location.href = '/account-settings?section=profile'}>個人資料</button>
            <button class="block w-full text-left px-4 sm:px-5 py-2 text-gray-800 hover:bg-gray-100 hover:text-blue-600 transition-colors text-sm sm:text-base cursor-pointer" onClick={() => window.location.href = '/notification'}>通知</button>
            <button class="block w-full text-left px-4 sm:px-5 py-2 text-gray-800 hover:bg-gray-100 hover:text-blue-600 transition-colors text-sm sm:text-base cursor-pointer" onClick={handleLogout}>登出</button>
          </div>
        </div>
      </Show>
    </nav>
  );
}

export default Navbar;