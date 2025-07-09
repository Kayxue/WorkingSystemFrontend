import { createResource, createSignal, Match, onMount, Show, Switch } from 'solid-js';

interface navBarProps {
  loggedIn: boolean;
  username: string | null;
  employerPhotoUrl: string | null;
}

function Navbar(props: navBarProps) {
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const { loggedIn, username, employerPhotoUrl } = props;

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
    <>
      <style>
        {`
          /* CSS Variables (from previous optimization) */
          :root {
              --color-primary: #007bff; /* Blue */
              --color-primary-dark: #0056b3;
              --color-secondary: #6c757d; /* Grey */
              --color-secondary-dark: #545b62;
              --color-success: #28a745; /* Green for Register */
              --color-success-dark: #218838;
              --color-text-dark: #333;
              --color-text-medium: #555;
              --color-background-light: #f8f9fa; /* Lighter background for some elements */
              --color-background-white: #ffffff;
              --color-border-light: #e0e0e0;

              --spacing-sm: 0.5rem;
              --spacing-md: 1rem; /* Adjusted for tighter spacing in navbar */
              --spacing-lg: 1.5rem;
              --spacing-xl: 2rem;

              --navbar-height: 4.5rem; /* Ensure consistent height */
              --padding-inline: 1.5rem; /* Horizontal padding for container */
          }

          nav {
            background-color: var(--color-background-white);
            padding: 0 var(--padding-inline);
            height: var(--navbar-height);
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08); /* Softer, subtle shadow */
            position: relative;
            z-index: 1000;
            border-bottom: 1px solid var(--color-border-light); /* Subtle bottom border */
          }
          .brand a {
            font-size: 1.6rem;
            font-weight: bold;
            color: var(--color-text-dark);
            text-decoration: none;
            transition: color 0.2s ease;
          }
          .brand a:hover {
            color: var(--color-primary);
          }
          .auth-buttons {
            display: flex;
            align-items: center;
            gap: var(--spacing-md); /* Use gap for spacing between buttons */
          }
          .auth-buttons button {
            padding: 0.7rem 1.4rem; /* More balanced padding */
            border: 1px solid transparent;
            border-radius: 25px; /* Pill-shaped buttons */
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: 600; /* Slightly bolder text */
            transition: all 0.3s ease; /* Smooth transition for all properties */
            white-space: nowrap; /* Prevent text wrapping */
          }
          /* --- Login Button --- */
          .auth-buttons button.login { /* Added .login class for specific styling */
            background-color: var(--color-primary);
            color: white;
            border-color: var(--color-primary);
          }
          .auth-buttons button.login:hover {
            background-color: var(--color-primary-dark);
            border-color: var(--color-primary-dark);
            transform: translateY(-2px); /* Subtle lift */
            box-shadow: 0 4px 10px rgba(0, 123, 255, 0.25); /* More prominent shadow on hover */
          }
          /* --- Register Button --- */
          .auth-buttons button.register {
            background-color: transparent; /* Transparent background */
            color: var(--color-success); /* Green text */
            border-color: var(--color-success); /* Green border */
          }
          .auth-buttons button.register:hover {
            background-color: var(--color-success); /* Green background on hover */
            color: white; /* White text on hover */
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(40, 167, 69, 0.25);
          }

          /* Dropdown specific styles (remains largely the same, optimized for consistency) */
          .user-dropdown-container {
            position: relative;
            display: flex;
            align-items: center;
            gap: 0.75rem; /* Increased space between avatar and button */
          }

          .user-avatar {
            width: 38px; /* Slightly larger avatar */
            height: 38px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--color-primary); /* Primary color border for logged-in avatar */
            flex-shrink: 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1); /* Subtle shadow for avatar */
          }

          .user-dropdown-toggle {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            background-color: var(--color-background-light); /* Lighter background */
            color: var(--color-text-dark);
            border: 1px solid var(--color-border-light);
            padding: 0.6rem 1rem;
            border-radius: 25px; /* Pill-shaped like other buttons */
            font-size: 0.95rem;
            cursor: pointer;
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }
          .user-dropdown-toggle:hover {
            background-color: #e2e6ea; /* Slightly darker light background */
            border-color: #d3d9df;
          }

          .dropdown-menu {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            background: white;
            border: 1px solid var(--color-border-light);
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            padding: 0.5rem 0;
            z-index: 100;
            min-width: 160px; /* Slightly wider dropdown */
            overflow: hidden;
            opacity: 0;
            transform: translateY(-10px);
            transition: opacity 0.2s ease-out, transform 0.2s ease-out;
            pointer-events: none;
          }
          .dropdown-menu.open {
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
          }

          .dropdown-menu button {
            display: block;
            width: 100%;
            padding: 0.8rem 1.2rem;
            background: none;
            border: none;
            text-align: left;
            color: var(--color-text-dark);
            font-size: 0.95rem;
            cursor: pointer;
            transition: background-color 0.2s ease, color 0.2s ease;
          }
          .dropdown-menu button:hover {
            background-color: var(--color-background-light); /* Use light background variable */
            color: var(--color-primary);
          }

          /* Responsive adjustments (remain largely the same) */
          @media (max-width: 768px) {
            .auth-buttons {
              gap: var(--spacing-sm); /* Tighter gap on smaller screens */
            }
            .auth-buttons button {
                padding: 0.6rem 1rem; /* Slightly smaller buttons on mobile */
                font-size: 0.9rem;
            }
            .user-dropdown-container {
                gap: 0.4rem;
            }
            .user-avatar {
                width: 32px;
                height: 32px;
            }
            .user-dropdown-toggle {
                padding: 0.5rem 0.8rem;
                font-size: 0.9rem;
            }
          }
        `}
      </style>
      <nav>
        <div class="brand">
          <a href="/">WorkNow</a>
        </div>
        <Show when={loggedIn} fallback={
          <div class="auth-buttons">
            {/* Added .login class for the login button */}
            <button class="register" onClick={() => window.location.href = '/register'}>註冊</button>
            <button class="login" onClick={() => window.location.href = '/login'}>登入</button>
          </div>
        }>
          <div class="user-dropdown-container">
            <Show when={employerPhotoUrl}>
              <img src={employerPhotoUrl!} alt="使用者頭像" class="user-avatar" />
            </Show>
            <button class="user-dropdown-toggle" onClick={() => setDropdownOpen(!dropdownOpen())}>
              {username} <span style="font-size: 0.7em;">▼</span>
            </button>
            <div classList={{ 'dropdown-menu': true, 'open': dropdownOpen() }}>
              <button onClick={handleLogout}>登出</button>
            </div>
          </div>
        </Show>
      </nav>
    </>
  );
}

export default Navbar;