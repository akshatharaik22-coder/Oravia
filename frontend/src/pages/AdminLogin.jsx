
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config/api.js";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/admin-login`,
        {
          email: email.trim().toLowerCase(),
          password,
        },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      const { token, user } = response.data || {};

      // Never establish an admin session from an invalid response.
      if (
        typeof token !== "string" ||
        !token ||
        !user ||
        typeof user !== "object" ||
        user.role !== "admin"
      ) {
        throw new Error(
          "The server returned an invalid admin login response."
        );
      }

      // Keep the patient and admin sessions separate.
      // Do not retain a previous patient session after admin login.
      localStorage.removeItem("oraviaToken");
      localStorage.removeItem("oraviaUser");

      localStorage.setItem("oraviaAdminToken", token);
      localStorage.setItem("oraviaAdminUser", JSON.stringify(user));

      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      console.error(
        "Admin login error:",
        error.response?.status || error.message
      );

      if (error.response) {
        setError(
          error.response.data?.message ||
            "Unable to sign in. Please check your credentials."
        );
      } else if (error.code === "ECONNABORTED") {
        setError(
          "The server took too long to respond. Please try again."
        );
      } else if (
        error.message ===
        "The server returned an invalid admin login response."
      ) {
        setError(error.message);
      } else {
        setError(
          "Unable to connect to the server. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-logo">ORAVIA</div>

        <p className="admin-login-label">ADMINISTRATION</p>

        <h1>Welcome Back</h1>

        <p className="admin-login-subtitle">
          Sign in to manage clinic appointments.
        </p>

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label htmlFor="admin-email">Email address</label>

            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              placeholder="Enter admin email"
              autoComplete="username"
              maxLength={254}
              required
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label htmlFor="admin-password">Password</label>

            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              placeholder="Enter admin password"
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="admin-login-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AdminLogin;