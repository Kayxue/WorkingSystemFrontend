import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import type { Component } from 'solid-js';

// Expanded User type to hold more details, accommodating different roles.
type User = {
  id: string;
  name: string;
  email: string;
  role: 'worker' | 'employer' | 'admin';
  lockedUntil: string | null;
  [key: string]: any; // Allow other properties
};

const searchUsersApi = async (role: string, type: string, query: string): Promise<User[]> => {
  console.log(`Searching for ${type}="${query}" in role ${role}`);
  const apiUrl = `/api/admin/users/search?role=${role}&type=${type}&query=${encodeURIComponent(query)}`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'platform': 'web-admin',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to search users: ${errorText}`);
  }

  const result = await response.json();

  // Map and return the full user object to have all details for the modal.
  return result.user.map((u: any) => {
    const id = u.workerId || u.employerId || u.adminId;
    const name = u.firstName ? `${u.firstName} ${u.lastName}` : (u.employerName || u.email);
    return {
      ...u,
      id,
      name,
      role: role as 'worker' | 'employer' | 'admin',
    };
  });
};

const unlockUserApi = async (userId: string) => {
  console.log(`Unlocking user ${userId}`);
  const response = await fetch(`/api/admin/unlock-worker/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'platform': 'web-admin',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to unlock user: ${errorText}`);
  }
  
  alert('User unlocked successfully!');
};

const lockUserApi = async (userId: string) => {
  console.log(`Locking user ${userId}`);
  alert('Lock functionality needs API endpoint.');
};

const UserManagementPage: Component = () => {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [searchType, setSearchType] = createSignal('name');
  const [searchRole, setSearchRole] = createSignal('worker');
  const [users, setUsers] = createSignal<User[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  // Signals for detail modal
  const [selectedUser, setSelectedUser] = createSignal<User | null>(null);
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  let modalRef: HTMLDivElement | undefined;

  // Signals for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = createSignal(false);
  const [confirmAction, setConfirmAction] = createSignal<'lock' | 'unlock' | null>(null);
  const [userToActOn, setUserToActOn] = createSignal<User | null>(null);

  const handleClickOutside = (event: MouseEvent) => {
    if (isModalOpen() && modalRef && !modalRef.contains(event.target as Node)) {
      closeModal();
    }
  };
  const openUserDetail = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    document.addEventListener('click', handleClickOutside);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    document.removeEventListener('click', handleClickOutside);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSearch = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUsers([]);

    try {
      const results = await searchUsersApi(searchRole(), searchType(), searchQuery());
      setUsers(results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (user: User) => {
    setUserToActOn(user);
    setConfirmAction('unlock');
    setShowConfirmModal(true);
  };

  const handleLock = (user: User) => {
    setUserToActOn(user);
    setConfirmAction('lock');
    setShowConfirmModal(true);
  };

  const cancelAction = () => {
    setShowConfirmModal(false);
    setUserToActOn(null);
    setConfirmAction(null);
  };

  const confirmAndExecuteAction = async () => {
    const action = confirmAction();
    const user = userToActOn();
    if (!action || !user) return;

    try {
      if (action === 'unlock') {
        await unlockUserApi(user.id);
        handleSearch(new Event('submit'));
      } else if (action === 'lock') {
        await lockUserApi(user.id);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      cancelAction();
    }
  };

  return (
    <div class="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <h1 class="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">用户管理</h1>

      <form onSubmit={handleSearch} class="bg-white p-6 rounded-lg shadow-md mb-8">
        <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div class="md:col-span-2">
            <label for="search-query" class="block text-sm font-medium text-gray-700 mb-1 md:mb-2">搜索词</label>
            <input
              id="search-query"
              type="text"
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.target.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="輸入搜索詞..."
            />
          </div>
          <div>
            <label for="search-type" class="block text-sm font-medium text-gray-700 mb-1 md:mb-2">搜索依据</label>
            <select
              id="search-type"
              value={searchType()}
              onChange={(e) => setSearchType(e.target.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="id">ID</option>
            </select>
          </div>
          <div>
            <label for="search-role" class="block text-sm font-medium text-gray-700 mb-1 md:mb-2">角色</label>
            <select
              id="search-role"
              value={searchRole()}
              onChange={(e) => setSearchRole(e.target.value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="worker">worker</option>
              <option value="employer">employer</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <button type="submit" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            搜尋
          </button>
        </div>
      </form>

      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <Show when={loading()}><p class="p-6 text-center text-gray-500">輸入中...</p></Show>
        <Show when={error()}><p class="p-6 text-center text-red-500">錯誤： {error()}</p></Show>
        <Show when={!loading() && users().length === 0 && !error()}><></></Show>
        <Show when={users().length > 0}>
          <ul class="divide-y divide-gray-200">
            <For each={users()}>
              {(user) => (
                <li class="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="flex-1" onClick={() => openUserDetail(user)} style={{"cursor": "pointer"}}>
                      <div class="flex items-center gap-3">
                        <p class="text-lg font-semibold text-indigo-700">{user.name}</p>
                        <Show when={user.lockedUntil}><span class="px-2 py-1 text-xs font-medium text-red-800 bg-red-100 rounded-full">鎖定</span></Show>
                        <Show when={!user.lockedUntil}><span class="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">活躍</span></Show>
                      </div>
                      <p class="text-sm text-gray-600 mt-1">{user.email}</p>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                      <Show 
                        when={user.lockedUntil}
                        fallback={
                          <button onClick={() => handleLock(user)} class={`w-full sm:w-auto text-sm md:text-md font-semibold bg-red-500 text-white py-1 px-3 rounded-md hover:bg-red-600 transition-colors ${user.role !== 'worker' ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={user.role !== 'worker'} title={user.role !== 'worker' ? '封鎖功能僅限工人' : '封鎖用戶'}>封鎖</button>
                        }
                      >
                        <button onClick={() => handleUnlock(user)} class="w-full sm:w-auto text-sm md:text-md font-semibold bg-green-500 text-white py-1 px-3 rounded-md hover:bg-green-600 transition-colors" disabled={user.role !== 'worker'} title={user.role !== 'worker' ? '封鎖功能僅限工人' : '解封用戶'}>
                          解封
                        </button>
                      </Show>
                      <button onClick={() => openUserDetail(user)} class="w-full sm:w-auto text-sm md:text-md font-semibold bg-gray-200 text-gray-700 py-1 px-3 rounded-md hover:bg-gray-300 transition-colors">
                        詳情
                      </button>
                    </div>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>

      {/* Detail Modal */}
      <Show when={isModalOpen() && selectedUser()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div ref={modalRef} class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 class="text-xl font-semibold text-gray-900">賬號詳情</h3>
              <button onClick={closeModal} class="text-gray-400 hover:text-gray-600 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div class="p-6">
              <div class="space-y-4">
                <div class="flex justify-between items-center">
                  <h4 class="text-2xl font-bold text-gray-900">{selectedUser()!.name}</h4>
                  <span class={`px-3 py-1 text-sm font-semibold rounded-full ${selectedUser()!.lockedUntil ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {selectedUser()!.lockedUntil ? 'Locked' : 'Active'}
                  </span>
                </div>
                <p class="text-gray-600">{selectedUser()!.email}</p>
                <div class="border-t border-gray-200 pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <p><span class="font-medium text-gray-500">ID:</span> {selectedUser()!.id}</p>
                  <p><span class="font-medium text-gray-500">Role:</span> <span class="capitalize">{selectedUser()!.role}</span></p>
                  <Show when={selectedUser()!.role === 'worker'}>
                    <p><span class="font-medium text-gray-500">Phone:</span> {selectedUser()!.phoneNumber || 'N/A'}</p>
                    <p><span class="font-medium text-gray-500">Education:</span> {selectedUser()!.highestEducation || 'N/A'}</p>
                    <p><span class="font-medium text-gray-500">School:</span> {selectedUser()!.schoolName || 'N/A'}</p>
                    <p><span class="font-medium text-gray-500">Absences:</span> {selectedUser()!.absenceCount ?? 'N/A'}</p>
                  </Show>
                  <Show when={selectedUser()!.role === 'employer'}>
                    <p><span class="font-medium text-gray-500">Branch:</span> {selectedUser()!.branchName || 'N/A'}</p>
                    <p><span class="font-medium text-gray-500">Industry:</span> {selectedUser()!.industryType || 'N/A'}</p>
                    <p><span class="font-medium text-gray-500">Address:</span> {selectedUser()!.address || 'N/A'}</p>
                    <p><span class="font-medium text-gray-500">Approval:</span> <span class="capitalize">{selectedUser()!.approvalStatus || 'N/A'}</span></p>
                  </Show>
                  <p><span class="font-medium text-gray-500">Created:</span> {formatDate(selectedUser()!.createdAt)}</p>
                  <p><span class="font-medium text-gray-500">Updated:</span> {formatDate(selectedUser()!.updatedAt)}</p>
                  <Show when={selectedUser()!.lockedUntil}>
                    <p class="md:col-span-2"><span class="font-medium text-gray-500">Locked Until:</span> {formatDate(selectedUser()!.lockedUntil)}</p>
                  </Show>
                </div>
              </div>
              <div class="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                <button onClick={closeModal} class="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Confirmation Modal */}
      <Show when={showConfirmModal()}>
        <div class="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h3 class="text-lg font-bold mb-4">
              Confirm Action
            </h3>
            <p class="mb-6 text-gray-600">
              Are you sure you want to {confirmAction()} the user "{userToActOn()?.name}"?
            </p>
            <div class="flex justify-end gap-4">
              <button
                onClick={cancelAction}
                class="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndExecuteAction}
                class={`px-4 py-2 rounded-md text-white ${confirmAction() === 'lock' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default UserManagementPage;
