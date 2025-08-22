import type { Component } from 'solid-js';

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

const AttendanceCode: Component<{ data: LoginResponse }> = (props) => {
  const { attendanceCode, validUntil, gigInfo } = props.data;

  const formattedValidUntil = new Date(validUntil).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div class="w-full max-w-sm sm:max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
      <div class="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 sm:p-8 text-center">
        <h2 class="text-lg font-semibold text-indigo-100 uppercase tracking-wider">Attendance Code</h2>
        <p class="font-mono text-6xl sm:text-7xl font-bold text-cyan-300 tracking-widest my-2" style={{ 'text-shadow': '0 0 15px rgba(103, 232, 249, 0.5)' }}>{attendanceCode}</p>
        <p class="text-sm text-indigo-200">Valid until {formattedValidUntil}</p>
      </div>

      <div class="p-6 sm:p-8 space-y-4">
        <div>
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">{gigInfo.title}</h3>
          <p class="text-gray-600 dark:text-gray-400 mt-1">{gigInfo.description}</p>
        </div>
        
        <div class="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3 text-sm">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span class="text-gray-700 dark:text-gray-300">{gigInfo.timeStart} - {gigInfo.timeEnd}</span>
          </div>
          <div class="flex items-center">
            <svg class="w-5 h-5 text-gray-500 dark:text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span class="text-gray-700 dark:text-gray-300">{gigInfo.city}{gigInfo.district}, {gigInfo.address}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceCode;