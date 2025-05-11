import { createSignal } from 'solid-js';

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
  `;

  return (
    <>
      <style>{styles}</style>
      <nav>
        <div class="brand">
          <a href="/">WorkNow</a>
        </div>
        <div class="auth-buttons">
          <button class="register" onClick={() => window.location.href = '/register'}>註冊</button>
          <button onClick={() => window.location.href = '/login'}>登入</button>
        </div>
      </nav>
    </>
  );
}

export default Navbar; 