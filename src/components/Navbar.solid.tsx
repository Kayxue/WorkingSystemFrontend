import { createSignal, Show } from 'solid-js';

interface navBarProps {
  loggedIn: boolean;
  username: string;
  employerPhotoUrl: string | null;
}


function Navbar(props: navBarProps) {
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const { loggedIn, username, employerPhotoUrl } = props;

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
    <nav class="bg-white px-2 sm:px-4 md:px-6 h-16 sm:h-18 flex items-center justify-between shadow-md border-b border-gray-200 relative z-50 w-full">
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
          <Show when={employerPhotoUrl} fallback={
            <div class="bg-gray-300 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border-2 border-blue-600 shadow-sm">
              <span>{initialsName}</span>
            </div>
          }>
            <img src={employerPhotoUrl!} alt="使用者頭像" class="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-blue-600 shadow-sm" />
          </Show>
          <button class="flex items-center gap-1 bg-gray-100 text-gray-800 border border-gray-200 px-3 sm:px-4 py-2 rounded-full font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-base" onClick={() => setDropdownOpen(!dropdownOpen())}>
            {username} <span class="text-xs">▼</span>
          </button>
          <div class={`absolute top-12 sm:top-14 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[140px] sm:min-w-[160px] transition-all duration-200 ${dropdownOpen() ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            <button class="block w-full text-left px-4 sm:px-5 py-2 text-gray-800 hover:bg-gray-100 hover:text-blue-600 transition-colors text-sm sm:text-base" onClick={() => window.location.href = '/account-settings'}>個人資料</button>
            <button class="block w-full text-left px-4 sm:px-5 py-2 text-gray-800 hover:bg-gray-100 hover:text-blue-600 transition-colors text-sm sm:text-base" onClick={handleLogout}>登出</button>
          </div>
        </div>
      </Show>
    </nav>
  );
}

export default Navbar;