import { createSignal, For, Show } from 'solid-js';
import type { Component } from 'solid-js';

interface Document {
  originalName: string;
  type: string;
  url: string;
}

interface EmployerPhoto {
  originalName: string;
  type: string;
  url: string;
}

interface User {
  employerId: string;
  employerName: string;
  branchName: string;
  email: string;
  phoneNumber: string;
  industryType: string;
  address: string;
  approvalStatus: string;
  identificationType: "businessNo" | "personalId" | null;
  identificationNumber: string;
  verificationDocuments: Document[];
  employerPhoto: EmployerPhoto | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  initialData: User[];
}

const UserApprovalList: Component<Props> = (props) => {
  const [users, setUsers] = createSignal<User[]>(props.initialData);
  const [selectedUser, setSelectedUser] = createSignal<User | null>(null);
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [selectedDocument, setSelectedDocument] = createSignal<Document | null>(null);
  const [rejectionReason, setRejectionReason] = createSignal('');
  const [showRejectionModal, setShowRejectionModal] = createSignal(false);
  const [showApproveModal, setShowApproveModal] = createSignal(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openUserDetail = (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setSelectedDocument(null);
  };

  const viewDocument = (doc: Document) => {
    setSelectedDocument(doc);
    // 實際應用中這裡可以打開文件預覽
    window.open(doc.url, '_blank');
  };

  const handleApprove = (userId: string) => {
    setShowApproveModal(true);
  };

  const submitApprove = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/approveEmployer/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'platform': 'web-admin'
        },
      });
      if (!response.ok) throw new Error('Server response failed');
      setUsers(users().filter(u => u.employerId !== userId));
      alert('用戶已批准！');
      closeModal();
    } catch (error) {
      alert('操作失敗，請重試');
      console.error(error);
    } finally {
      setShowApproveModal(false);
    }
  };

  const handleReject = (userId: string) => {
    setShowRejectionModal(true);
  };

  const submitRejection = async (userId: string) => {
    if (!rejectionReason().trim()) {
      alert('請輸入拒絕原因');
      return;
    }

    try {
      const response = await fetch(`/api/admin/rejectEmployer/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'platform': 'web-admin'
        },
        body: JSON.stringify({ reason: rejectionReason() })
      });
      if (!response.ok) throw new Error('Server response failed');

      setUsers(users().filter(u => u.employerId !== userId));
      alert('已拒絕用戶註冊');
      setShowRejectionModal(false);
      setRejectionReason('');
      closeModal();
    } catch (error) {
      alert('操作失敗，請重試');
      console.error(error);
    }
  };

  const getDocumentIcon = (type: string) => {
    const icons: Record<string, string> = {
      identity: '🪪',
      business: '📋',
      tax: '🧾',
      default: '📄'
    };
    return icons[type] || icons.default;
  };

  const getInitialsName = (name: string): string => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };
  

  return (
    <>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Table Header */}
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Pending Registrations</h2>
        </div>

        {/* Table */}
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  branch
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registered
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <For each={users()}>
                {(user) => (
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <Show when={user.employerPhoto !== null} fallback={<div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">{getInitialsName(user.employerName)}</div>}>
                          <img
                            src={user.employerPhoto?.url}
                            alt={user.employerName}
                            class="w-10 h-10 rounded-full object-cover"
                          />
                        </Show>
                        <div class="ml-3">
                          <div class="text-sm font-medium text-gray-900">{user.employerName}</div>
                          <div class="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{user.phoneNumber}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900">{user.branchName == null ? 'N/A' : user.branchName}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-500">{formatDate(user.updatedAt)}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.verificationDocuments == null ? 0 : user.verificationDocuments.length} files
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openUserDetail(user)}
                        class="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>

          <Show when={users().length === 0}>
            <div class="text-center py-12">
              <span class="text-6xl mb-4 block">✅</span>
              <p class="text-gray-500">No pending registrations</p>
            </div>
          </Show>
        </div>
      </div>

      {/* Detail Modal */}
      <Show when={isModalOpen() && selectedUser()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 class="text-xl font-semibold text-gray-900">User Registration Review</h3>
              <button
                onClick={closeModal}
                class="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div class="p-6 space-y-6">
              {/* User Profile */}
              <div class="flex items-start gap-6">
                <Show when={selectedUser()!.employerPhoto !== null} 
                    fallback={<div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-2xl">{getInitialsName(selectedUser()!.employerName)}</div>}>
                  <img
                    src={selectedUser()!.employerPhoto?.url}
                    alt={selectedUser()!.employerName}
                    class="w-24 h-24 rounded-full object-cover ring-4 ring-gray-100"
                  />
                </Show>
                <div class="flex-1">
                  <h4 class="text-2xl font-bold text-gray-900">{selectedUser()!.employerName}</h4>
                  <p class="text-gray-600 mt-1">{selectedUser()!.email}</p>
                  <div class="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-sm text-gray-500">Phone</p>
                      <p class="text-sm font-medium text-gray-900 mt-1">{selectedUser()!.phoneNumber}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-500">Branch</p>
                      <p class="text-sm font-medium text-gray-900 mt-1">{selectedUser()!.branchName == null ? 'N/A' : selectedUser()!.branchName}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-500">行業類別</p>
                      <p class="text-sm font-medium text-gray-900 mt-1">{selectedUser()!.industryType}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-500">公司地址</p>
                      <p class="text-sm font-medium text-gray-900 mt-1">{selectedUser()!.address}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-500">證件類型</p>
                      <p class="text-sm font-medium text-gray-900 mt-1">{selectedUser()!.identificationType === 'businessNo' ? '統一編號' : '身分證字號'}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-500">證件號碼</p>
                      <p class="text-sm font-medium text-gray-900 mt-1">{selectedUser()!.identificationNumber}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-500">Registered At</p>
                      <p class="text-sm font-medium text-gray-900 mt-1">
                        {formatDate(selectedUser()!.updatedAt)}
                      </p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-500">Status</p>
                      <span class="inline-block mt-1 px-3 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                        Pending Review
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documents Section */}
              <div>
                <h5 class="text-lg font-semibold text-gray-900 mb-4">Uploaded Documents</h5>
                <Show 
                  when={selectedUser()!.verificationDocuments && selectedUser()!.verificationDocuments.length > 0}
                  fallback={<div class="text-center py-6 px-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-500">無上傳文件</div>}
                >
                  <div class="grid grid-cols-1 gap-3">
                    <For each={selectedUser()!.verificationDocuments}>
                      {(doc) => (
                        <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group">
                          <div class="flex items-center gap-3">
                            <span class="text-3xl">{getDocumentIcon(doc.type)}</span>
                            <div>
                              <p class="text-sm font-medium text-gray-900">{doc.originalName}</p>
                            </div>                         
                          </div>
                          <button
                            onClick={() => viewDocument(doc)}
                            class="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            View
                          </button>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>
              </div>

              {/* Action Buttons */}
              <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={closeModal}
                  class="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedUser()!.employerId)}
                  class="px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(selectedUser()!.employerId)}
                  class="px-6 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Rejection Modal */}
      <Show when={showRejectionModal() && selectedUser()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4">Rejection Reason</h4>
            <textarea
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows="4"
              placeholder="Please provide a reason for rejection..."
              value={rejectionReason()}
              onInput={(e) => setRejectionReason(e.currentTarget.value)}
            />
            <div class="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                }}
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => submitRejection(selectedUser()!.employerId)}
                class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* Approval Modal */}
      <Show when={showApproveModal() && selectedUser()}>
        <div class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl max-w-md w-full p-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4">Confirm Approval</h4>
            <p class="text-gray-600 mb-6">Are you sure you want to approve this user's registration?</p>
            <div class="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setShowApproveModal(false)}
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => submitApprove(selectedUser()!.employerId)}
                class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
};

export default UserApprovalList;