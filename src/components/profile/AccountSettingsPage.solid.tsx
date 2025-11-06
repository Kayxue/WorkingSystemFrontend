import { createSignal, Switch, Match, onMount, onCleanup } from 'solid-js';
import ProfileSettingsForm from './ProfileSettingsForm.solid.tsx';
import UpdatePasswordForm from './UpdatePasswordForm.solid.tsx';
import VerificationForm from './VerificationForm.solid.tsx';
import RatingPage from './RatingPage.solid.tsx';

interface NavItem {
  id: string;
  name: string;
}

interface EmployerDataForPage {
  employerName: string;
  branchName:string;
  industryType: string;
  address: string;
  phoneNumber: string;
  identificationType: string;
  identificationNumber: string;
  approvalStatus: string;
  employerPhoto: {
    url: string;
    originalName: string;
    type: string;
  } | null;
  email: string;
  employerId: string;
  verificationDocuments?: {
    originalName: string;
    type: string;
    r2Name: string;
    presignedUrl: string;
  }[];
  ratingStats: {
    totalRatings: number; // 評價總數
    averageRating: number; // 平均評分
  }
}

interface AccountSettingsPageProps {
  initialEmployerData: EmployerDataForPage;
  initialSection: string;
}

const AccountSettingsPage = (props: AccountSettingsPageProps) => {

  const [currentSection, setCurrentSection] = createSignal<string>(props.initialSection || 'profile');

  onMount(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const section = params.get('section') || 'profile';
      setCurrentSection(section);
    };

    window.addEventListener('popstate', handlePopState);

    onCleanup(() => {
      window.removeEventListener('popstate', handlePopState);
    });
  });

  const showSection = (sectionId: string) => {
    setCurrentSection(sectionId);
    const url = new URL(window.location.href);
    url.searchParams.set('section', sectionId);
    window.history.pushState({}, '', url.toString());
  };

  // 側邊導航的項目列表
  const navItems: NavItem[] = [
    { id: 'profile', name: 'Profile' },
    { id: 'password', name: 'Password' },
    { id: 'verification', name: 'Verification' },
    { id: 'rating', name: 'Rating' },
  ];

  return (
    <div class="flex flex-col md:flex-row w-full max-w-4xl mx-auto gap-0 md:gap-6 min-h-[calc(100vh-7rem)]">
      <aside class="w-full md:w-64 bg-white p-4 flex-shrink-0 md:mr-0 mb-4 md:mb-0">
        <h1 class="text-2xl font-semibold mb-6 pl-2">Account Settings</h1>
        <nav class="flex flex-col">
          <ul>
            {navItems.map((item) => (
              <li class="mb-2">
                <button
                  onClick={() => showSection(item.id)}
                  class={`py-2 px-4 rounded-md w-full text-left transition-colors duration-200 cursor-pointer
                          ${currentSection() === item.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main class="flex-1 bg-white p-4 sm:p-6">
        <div>
          <Switch fallback={<div>Oops! Section not found.</div>}>
            <Match when={currentSection() === 'profile'}>
              <section>
                <ProfileSettingsForm initialEmployerData={props.initialEmployerData} />
              </section>
            </Match>
            <Match when={currentSection() === 'password'}>
              <section class="h-full">
                <UpdatePasswordForm/>
              </section>
            </Match>
            <Match when={currentSection() === 'verification'}>
              <VerificationForm initialData={props.initialEmployerData} />
            </Match>
            <Match when={currentSection() === 'rating'}>
              <section>
                {/* <h2 class="text-xl font-medium mb-4">Rating</h2> */}
                <RatingPage averageRating={props.initialEmployerData.ratingStats.averageRating} totalRatings={props.initialEmployerData.ratingStats.totalRatings} />
              </section>
            </Match>
            <Match when={currentSection() === 'login'}>
              <section>
                <h2 class="text-xl font-medium mb-4">Login</h2>
                <p class="text-gray-700">Change your password and manage login options.</p>
              </section>
            </Match>
            <Match when={currentSection() === 'cookie-settings'}>
              <section>
                <h2 class="text-xl font-medium mb-4">Cookie settings</h2>
                <p class="text-gray-700">Manage your cookie preferences.</p>
              </section>
            </Match>
          </Switch>
        </div>
      </main>
    </div>
  );
};

export default AccountSettingsPage;
