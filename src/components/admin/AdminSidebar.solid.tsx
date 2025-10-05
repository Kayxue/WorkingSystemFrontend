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
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
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
    { id: 'review', label: 'Review Employer', icon: '📄', path: '/admin/user-approval', badge: pendingUsersCount },
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
            <span class="text-2xl font-semibold text-gray-900">WorkNow</span>
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
                Admin
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
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={handleLogout}
          >
            <span class="text-xl">🚪</span>
            <span>Log out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;