import { createSignal, createEffect, type Setter, type Accessor } from 'solid-js';

interface AvatarSectionProps {
  name: string;
  avatarUrl?: string | null;
  averageRating?: number;
  onAvatarChange: (url: string | null) => void; 
}

const AvatarSection = (props: AvatarSectionProps) => {
  const [currentAvatarUrl, setCurrentAvatarUrl] = createSignal<string | null>(props.avatarUrl || null);
  const [showUploadModal, setShowUploadModal] = createSignal<boolean>(false);
  const [uploadFile, setUploadFile] = createSignal<File | null>(null);
  const [uploadMessage, setUploadMessage] = createSignal<string | null>(null);
  const [isUploading, setIsUploading] = createSignal<boolean>(false);
  const [localPreviewUrl, setLocalPreviewUrl] = createSignal<string | null>(null);

  const [showNotificationModal, setShowNotificationModal] = createSignal<boolean>(false);
  const [notificationMessage, setNotificationMessage] = createSignal<string>('');
  const [notificationType, setNotificationType] = createSignal<'success' | 'error'>('success');

  createEffect(() => {
    setCurrentAvatarUrl(props.avatarUrl || null);
  });

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  const initials = getInitials(props.name);

  const handleUpdateAvatar = (): void => {
    setUploadFile(null);
    setUploadMessage(null);
    setLocalPreviewUrl(null);
    setShowUploadModal(true);
  };

  const handleRemoveAvatar = async (): Promise<void> => {
    if (confirm('Are you sure you want to remove your avatar?')) {
      const formData = new FormData();
      formData.append("deleteProfilePhoto", "true");
      try {
          const response = await fetch('/api/user/update/profilePhoto', {
            method: 'PUT',
            headers: {
              "platform": "web-employer",
            },
            body: formData,
          });

          setNotificationMessage('Profile photo removed successfully!');
          setNotificationType('success');
      } catch (error) {
          console.error('Error removing avatar:', error);
          setNotificationMessage(`Failed to remove avatar: ${error.message || 'Unknown error'}`);
          setNotificationType('error');
      } finally {
          setShowNotificationModal(true); // 顯示通知 Modal
      }
    }
  };

  const onFileChange = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      setUploadFile(file);
      setUploadMessage(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        setLocalPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadFile(null);
      setLocalPreviewUrl(null);
    }
  };

  const handleUploadSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    if (!uploadFile()) {
      setUploadMessage('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadMessage('Uploading...');

    const formData = new FormData();
    formData.append('profilePhoto', uploadFile()!);

    try {
      const response = await fetch('/api/user/update/profilePhoto', {
        method: 'PUT',
        headers: {
          "platform": "web-employer",
        },
        body: formData,
      });

      if (response.ok) {
        setNotificationMessage('Profile photo updated successfully!');
        setNotificationType('success');
      } else {
        const errorData = await response.json();
        setNotificationMessage(`Upload failed: ${errorData.message || 'Unknown error'}`);
        setNotificationType('error');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setNotificationMessage('An error occurred during upload.');
      setNotificationType('error');
    } finally {
      setIsUploading(false);
      setShowUploadModal(false);
      setShowNotificationModal(true);
      setUploadFile(null);
    }
  };

  const handleCloseNotificationModal = () => {
    setShowNotificationModal(false);
    setNotificationMessage('');
    window.location.reload();
  };


return (
    <div class="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-4 sm:space-y-0 mb-6">
      {currentAvatarUrl() ? (
        <img
          src={currentAvatarUrl()!}
          alt={`${props.name}'s avatar`}
          class="w-20 h-20 rounded-full object-cover flex-shrink-0 mb-2 sm:mb-0"
          onError={(e: Event) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            setCurrentAvatarUrl(null);
            props.onAvatarChange(null);
            setNotificationMessage('Avatar image failed to load. Displaying default.');
            setNotificationType('error');
            setShowNotificationModal(true);
          }}
        />
      ) : (
        <div
          class="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-3xl font-bold uppercase flex-shrink-0 mb-2 sm:mb-0"
        >
          <span>{initials}</span>
        </div>
      )}

      <div class="flex flex-col">
        <div class="flex flex-row items-center sm:items-start space-x-2 sm:space-x-0 sm:space-y-2">
          <button
            type="button"
            onClick={handleUpdateAvatar}
            class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Update
          </button>
          <button
            type="button"
            onClick={handleRemoveAvatar}
            class="text-gray-600 hover:text-red-500 font-semibold py-2 px-4 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-opacity-50"
          >
            Remove
          </button>
        </div>
        {/* {typeof props.averageRating === 'number' && (
          <div class="flex items-center mt-2 sm:mt-0 sm:ml-4">
            <div class="flex items-center">
              {[...Array(5)].map((_, index) => {
                const starValue = props.averageRating! - index;
                let starPercentage = '0%';
                if (starValue >= 1) {
                  starPercentage = '100%';
                } else if (starValue > 0) {
                  starPercentage = `${starValue * 100}%`;
                }

                return (
                  <div class="relative w-5 h-5">
                    <svg class="w-full h-full text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    <div class="absolute top-0 left-0 h-full overflow-hidden" style={{ width: starPercentage }}>
                      <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
            <span class="ml-2 text-sm font-medium text-gray-600">
              {props.averageRating.toFixed(1)}
            </span>
          </div>
        )} */}
      </div>

      {typeof props.averageRating === 'number' && (
        <div class="flex items-center mt-2 sm:mt-0 sm:ml-4">
          <div class="flex items-center">
            {[...Array(5)].map((_, index) => {
              const starValue = props.averageRating! - index;
              let starPercentage = '0%';
              if (starValue >= 1) {
                starPercentage = '100%';
              } else if (starValue > 0) {
                starPercentage = `${starValue * 100}%`;
              }

              return (
                <div class="relative w-5 h-5">
                  <svg class="w-full h-full text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                  <div class="absolute top-0 left-0 h-full overflow-hidden" style={{ width: starPercentage }}>
                    <svg class="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
          <span class="ml-2 text-sm font-medium text-gray-600">
            {props.averageRating.toFixed(1)}
          </span>
        </div>
      )}

      {showUploadModal() && (
        <div class="fixed inset-0 bg-gray-600/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
            <h3 class="text-lg font-semibold mb-4">Upload Profile Photo</h3>
            <form onSubmit={handleUploadSubmit}>
              <div class="mb-4">
                <label for="file-upload" class="sr-only">Choose file</label>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  class="block w-full text-sm text-gray-500
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700
                         hover:file:bg-blue-100"
                />
                {uploadFile() && <p class="mt-2 text-sm text-gray-600">Selected file: {uploadFile()?.name}</p>}
              </div>

              {uploadMessage() && (
                <p class={`text-sm mb-4 ${uploadMessage()?.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
                  {uploadMessage()}
                </p>
              )}

              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md text-sm"
                  disabled={isUploading()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-sm"
                  disabled={isUploading() || !uploadFile()}
                >
                  {isUploading() ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNotificationModal() && (
        <div
          class={`fixed inset-0 bg-gray-600/75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${
            showNotificationModal() ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={handleCloseNotificationModal}
        >
          <div
            class="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-auto transform transition-transform duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: showNotificationModal() ? 'translateY(0)' : 'translateY(-20px)',
            }}
          >
            <div class="flex flex-col items-center">
              {notificationType() === 'success' ? (
                <svg
                  class="w-16 h-16 text-green-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              ) : (
                <svg
                  class="w-16 h-16 text-red-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2 2m0 0l2-2m-2-2v4m-3 3h6a9 9 0 000-18h-6a9 9 0 000 18z"></path>
                </svg>
              )}
              <h3 class="text-xl font-semibold mb-3 text-gray-800">
                {notificationType() === 'success' ? 'Success!' : 'Failed!'}
              </h3>
              <p class="text-center text-gray-600 mb-6">{notificationMessage()}</p>
              <button
                onClick={handleCloseNotificationModal}
                class={`px-6 py-2 rounded-md font-semibold text-white ${
                  notificationType() === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarSection;