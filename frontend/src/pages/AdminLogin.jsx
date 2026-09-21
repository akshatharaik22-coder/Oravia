import { useState } from "react";

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (username === "admin" && password === "oravia123") {
      localStorage.setItem("oraviaAdmin", "true");
      onLogin();
    } else {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">

        <div className="admin-login-logo">
          ORAVIA
        </div>

        <p className="admin-login-label">
          ADMINISTRATION
        </p>

        <h1>Welcome Back</h1>

        <p className="admin-login-subtitle">
          Sign in to manage clinic appointments.
        </p>

        <form onSubmit={handleLogin}>

          <div className="login-field">
            <label>Username</label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>


          <div className="login-field">
            <label>Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>


          {error && (
            <p className="login-error">
              {error}
            </p>
          )}


          <button
            type="submit"
            className="admin-login-button"
          >
            Sign In
          </button>

        </form>

      </div>
    </div>
  );
}

export default AdminLogin;