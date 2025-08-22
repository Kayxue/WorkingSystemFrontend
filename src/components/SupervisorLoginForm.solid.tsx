
import { createSignal, onMount, Show } from 'solid-js';
import AttendanceCode from './AttendanceCode.solid';

interface GigInfo {
  title: string;
  description: string;
  timeStart: string;
  timeEnd: string;
  city: string;
  district: string;
  address: string;
}

interface LoginResponse {
  attendanceCode: string;
  validUntil: string;
  gigInfo: GigInfo;
}

export default function SupervisorLoginForm() {
  const [supervisorId, setSupervisorId] = createSignal('');
  const [supervisorPassword, setSupervisorPassword] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [loginData, setLoginData] = createSignal<LoginResponse | null>(null);

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const qrToken = urlParams.get('qrToken');
    if (qrToken) {
      handleLogin(qrToken);
    }
  });

  const handleLogin = async (qrToken?: string | null) => {
    setLoading(true);
    setError(null);

    const body = qrToken 
      ? { qrToken }
      : { supervisorId: supervisorId(), supervisorPassword: supervisorPassword() };

      console.log('qrToken', qrToken);

    try {
      const response = await fetch('/api/attendance/supervisor/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const responseText = await response.text();
        let errorMessage = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = responseText.substring(0, 200) || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setLoginData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <Show when={loginData()} fallback={
      <div class="w-full max-w-sm sm:max-w-md p-6 sm:p-8 space-y-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 transform hover:-translate-y-1 transition-transform duration-300">
        <div class="text-center space-y-4">
          <div class="inline-block p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
            <svg class="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Supervisor Login</h1>
          <p class="text-gray-500 dark:text-gray-400">Enter your credentials to get the attendance code</p>
        </div>
        
        <form class="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label for="supervisorId" class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Supervisor ID</label>
            <input 
              type="text" 
              id="supervisorId"
              class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3 transition-colors duration-300 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" 
              placeholder="Your ID"
              value={supervisorId()}
              onInput={(e) => setSupervisorId(e.currentTarget.value)}
              required
            />
          </div>
          <div>
            <label for="supervisorPassword" class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Password</label>
            <input 
              type="password" 
              id="supervisorPassword"
              class="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3 transition-colors duration-300 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="••••••••"
              value={supervisorPassword()}
              onInput={(e) => setSupervisorPassword(e.currentTarget.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            class="w-full text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-3 text-center transition-all duration-300 ease-in-out transform hover:scale-105 dark:bg-indigo-600 dark:hover:bg-indigo-700 dark:focus:ring-indigo-800"
            disabled={loading()}
          >
            {loading() ? 'Loading...' : 'Get Attendance Code'}
          </button>
          {error() && <p class="text-sm font-medium text-red-500 text-center">{error()}</p>}
        </form>
      </div>
    }>
      <AttendanceCode data={loginData()!} />
    </Show>
  );
}
