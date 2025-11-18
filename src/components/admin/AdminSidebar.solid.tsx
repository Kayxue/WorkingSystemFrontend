import { createSignal, For, Show, onMount } from 'solid-js';
import type { Component } from 'solid-js';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  children?: MenuItem[];
}

function getMenuItems(pendingUsersCount: number ){
  return [
    { id: 'dashboard', label: '儀表板', icon: '📊', path: '/dashboard' },
    // { 
    //   id: 'customers', 
    //   label: 'Customers', 
    //   icon: '👥', 
    //   path: '/customers',
    //   children: [
    //     { id: 'all-customers', label: 'All Customers', icon: '', path: '/customers/all' },
    //     { id: 'segments', label: 'Segments', icon: '', path: '/customers/segments' }
    //   ]
    // },
    { id: 'review', label: '審核雇主', icon: '📄', path: '/admin/user-approval', badge: pendingUsersCount },
    { id: 'user-management', label: '用戶管理', icon: '👥', path: '/admin/user-management' },
    // { id: 'geography', label: 'Geography', icon: '🌍', path: '/geography' },
    // { id: 'conversations', label: 'Conversations', icon: '💬', path: '/conversations', badge: 3 },
    // { id: 'deals', label: 'Deals', icon: '💼', path: '/deals' },
    // { id: 'export', label: 'Export', icon: '📤', path: '/export' }
  ];
}

interface SidebarProps {
  email: string;
  currentPath?: string;
  pendingUsersCount?: number;
}

const AdminSidebar: Component<SidebarProps> = (props) => {
  const [expandedItems, setExpandedItems] = createSignal<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = createSignal('');

  const menuItems = getMenuItems(props.pendingUsersCount || 0);

  const toggleExpand = (itemId: string) => {
    const expanded = new Set(expandedItems());
    if (expanded.has(itemId)) {
      expanded.delete(itemId);
    } else {
      expanded.add(itemId);
    }
    setExpandedItems(expanded);
  };

  const isActive = (path: string) => {
    return props.currentPath === path;
  };

  const filteredMenuItems = () => {
    if (!searchQuery().trim()) return menuItems;
    const query = searchQuery().toLowerCase();
    return menuItems.filter(item => 
      item.label.toLowerCase().includes(query)
    );
  };

  const handleLogout = async () => {
    await fetch("/api/user/logout", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "platform": "web-admin",
      },
      credentials: "include",
    });
    window.location.href = "/";
  };

  return (
    <>

      <div class={`
        w-64 h-screen bg-white border-r border-gray-200 flex flex-col
      `}>
        {/* Header */}
        <div class="p-6 mb-2 border-b border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-3 ">
            <span class="text-xl sm:text-2xl font-bold text-gray-800">SlotGo</span>
          </div>
        </div>

        {/* Menu Items */}
        <nav class="flex-1 overflow-y-auto px-3 pb-4">
          <For each={filteredMenuItems()}>
            {(item) => (
              <div class="mb-1">
                <a
                  href={item.path}
                  class={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                    ${isActive(item.path)
                      ? 'bg-yellow-100 text-yellow-900 font-medium shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  onClick={(e) => {
                    if (item.children) {
                      e.preventDefault();
                      toggleExpand(item.id);
                    }
                  }}
                >
                  <span class="text-xl flex-shrink-0">{item.icon}</span>
                  <span class="flex-1">{item.label}</span>
                  
                  <Show when={item.badge}>
                    <span class="bg-red-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  </Show>
                  
                  <Show when={item.children}>
                    <span class={`text-xs text-gray-400 transition-transform duration-200 ${expandedItems().has(item.id) ? 'rotate-90' : ''}`}>
                      ▶
                    </span>
                  </Show>
                </a>

                {/* Submenu */}
                <Show when={item.children && expandedItems().has(item.id)}>
                  <div class="ml-10 mt-1 space-y-1 animate-slideDown">
                    <For each={item.children}>
                      {(child) => (
                        <a
                          href={child.path}
                          class={`
                            block px-3 py-2 rounded-lg text-sm transition-colors
                            ${isActive(child.path)
                              ? 'text-blue-600 font-medium bg-blue-50'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                        >
                          {child.label}
                        </a>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </nav>

        {/* User Section */}
        <div class="border-t border-gray-200 p-4 space-y-2">
          <div class="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50">
            <div class="flex-1 min-w-0 ">
              <div class="text-sm font-medium text-gray-900 truncate">
                {props.email}
              </div>
              <div class="inline-block text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded mt-1">
                管理員
              </div>
            </div>
          </div>

          {/* <a
            href="/settings"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <span class="text-xl">⚙️</span>
            <span>Settings</span>
          </a> */}

          <button
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-black fill-current hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={handleLogout}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" class="fill-current">
              <path d="M12.9999 2C10.2385 2 7.99991 4.23858 7.99991 7C7.99991 7.55228 8.44762 8 8.99991 8C9.55219 8 9.99991 7.55228 9.99991 7C9.99991 5.34315 11.3431 4 12.9999 4H16.9999C18.6568 4 19.9999 5.34315 19.9999 7V17C19.9999 18.6569 18.6568 20 16.9999 20H12.9999C11.3431 20 9.99991 18.6569 9.99991 17C9.99991 16.4477 9.55219 16 8.99991 16C8.44762 16 7.99991 16.4477 7.99991 17C7.99991 19.7614 10.2385 22 12.9999 22H16.9999C19.7613 22 21.9999 19.7614 21.9999 17V7C21.9999 4.23858 19.7613 2 16.9999 2H12.9999Z" />
              <path d="M13.9999 11C14.5522 11 14.9999 11.4477 14.9999 12C14.9999 12.5523 14.5522 13 13.9999 13V11Z" />
              <path d="M5.71783 11C5.80685 10.8902 5.89214 10.7837 5.97282 10.682C6.21831 10.3723 6.42615 10.1004 6.57291 9.90549C6.64636 9.80795 6.70468 9.72946 6.74495 9.67492L6.79152 9.61162L6.804 9.59454L6.80842 9.58848C6.80846 9.58842 6.80892 9.58778 5.99991 9L6.80842 9.58848C7.13304 9.14167 7.0345 8.51561 6.58769 8.19098C6.14091 7.86637 5.51558 7.9654 5.19094 8.41215L5.18812 8.41602L5.17788 8.43002L5.13612 8.48679C5.09918 8.53682 5.04456 8.61033 4.97516 8.7025C4.83623 8.88702 4.63874 9.14542 4.40567 9.43937C3.93443 10.0337 3.33759 10.7481 2.7928 11.2929L2.08569 12L2.7928 12.7071C3.33759 13.2519 3.93443 13.9663 4.40567 14.5606C4.63874 14.8546 4.83623 15.113 4.97516 15.2975C5.04456 15.3897 5.09918 15.4632 5.13612 15.5132L5.17788 15.57L5.18812 15.584L5.19045 15.5872C5.51509 16.0339 6.14091 16.1336 6.58769 15.809C7.0345 15.4844 7.13355 14.859 6.80892 14.4122L5.99991 15C6.80892 14.4122 6.80897 14.4123 6.80892 14.4122L6.804 14.4055L6.79152 14.3884L6.74495 14.3251C6.70468 14.2705 6.64636 14.1921 6.57291 14.0945C6.42615 13.8996 6.21831 13.6277 5.97282 13.318C5.89214 13.2163 5.80685 13.1098 5.71783 13H13.9999V11H5.71783Z" />
            </svg>
            <span>登出</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;