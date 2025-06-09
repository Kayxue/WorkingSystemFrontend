import { createSignal, onMount, Show } from 'solid-js';

function Navbar() {
  const styles = `
    nav {
      background-color: #fff;
      padding: 0 var(--padding-inline);
      height: var(--navbar-height);
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .brand a {
      font-size: 1.5rem;
      font-weight: bold;
      color: #333;
      text-decoration: none;
    }
    .auth-buttons button {
      margin-left: 0.75rem;
      padding: 0.5rem 1rem;
      border: 1px solid #007bff;
      border-radius: 4px;
      background-color: #007bff;
      color: white;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .auth-buttons button.register {
      background-color: #28a745;
      border-color: #28a745;
    }
    .auth-buttons button:hover {
      opacity: 0.9;
    }
    .dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: white;
      border: 1px solid #ccc;
      padding: 0.5rem;
      z-index: 10;
    }
  `;

  const [user, setUser] = createSignal(null);
  const [dropdownOpen, setDropdownOpen] = createSignal(false);

  onMount(async () => {
    try {
      const res = await fetch("http://localhost:3000/user/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "platform": "web-employer",
        },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch {
      setUser(null);
    }
  });

  const handleLogout = async () => {
    await fetch("http://localhost:3000/user/logout", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "platform": "web-employer",
      },
      credentials: "include",
    });
    setUser(null);
    window.location.href = "/";
  };

  return (
    <>
      <style>{styles}</style>
      <nav>
        <div class="brand">
          <a href="/">WorkNow</a>
        </div>
        <Show when={user()} fallback={
          <div class="auth-buttons">
            <button class="register" onClick={() => window.location.href = '/register'}>註冊</button>
            <button onClick={() => window.location.href = '/login'}>登入</button>
          </div>
        }>
          <div class="auth-buttons" style="position: relative;">
            <button onClick={() => setDropdownOpen(!dropdownOpen())}>
              {user()?.branchName} ▼
            </button>
            <Show when={dropdownOpen()}>
              <div class="dropdown">
                <button onClick={handleLogout}>Logout</button>
              </div>
            </Show>
          </div>
        </Show>
      </nav>
    </>
  );
}

export default Navbar;
