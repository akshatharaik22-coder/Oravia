import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config/api.js";
import "./AdminLogin.css";

function AdminLogin() {
const navigate = useNavigate();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
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

  // Only accept a valid administrator login response.
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

  // Keep patient and administrator sessions separate.
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

return ( <main className="oravia-admin-login"> <div className="admin-login-background-shape admin-shape-one" /> <div className="admin-login-background-shape admin-shape-two" />


  <header className="admin-login-topbar">
    <a
      className="admin-brand"
      href="/"
      aria-label="ORAVIA homepage"
    >
      <span className="admin-brand-icon" aria-hidden="true">
        <svg viewBox="0 0 48 48" fill="none">
          <path
            d="M15.5 8.5C10.7 8.5 7.5 12.5 8.1 18.1C8.7 24.4 12.3 38.9 17.1 39.5C20.5 39.9 20.6 29.1 24 29.1C27.4 29.1 27.5 39.9 30.9 39.5C35.7 38.9 39.3 24.4 39.9 18.1C40.5 12.5 37.3 8.5 32.5 8.5C28.6 8.5 26.9 11.3 24 11.3C21.1 11.3 19.4 8.5 15.5 8.5Z"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.5 19.5H29.5M24 14V25"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <span className="admin-brand-word">
        ORAVIA
        <span className="admin-brand-caption">
          DENTAL CARE
        </span>
      </span>
    </a>

    <a className="admin-back-home" href="/">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M15 18L9 12L15 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Back to website
    </a>
  </header>

  <section className="admin-login-layout">
    <div className="admin-login-intro">
      <div className="admin-intro-badge">
        <span className="admin-status-dot" />
        CLINIC MANAGEMENT PORTAL
      </div>

      <h1>
        Exceptional care
        <br />
        starts <span>behind the scenes.</span>
      </h1>

      <p className="admin-intro-description">
        Your workspace for managing appointments, supporting
        patients, and keeping clinic operations running smoothly.
      </p>

      <div className="admin-illustration" aria-hidden="true">
        <div className="admin-illustration-glow" />

        <div className="admin-illustration-ring ring-one" />
        <div className="admin-illustration-ring ring-two" />

        <div className="admin-tooth-card">
          <svg
            className="admin-tooth-illustration"
            viewBox="0 0 160 180"
            fill="none"
          >
            <path
              d="M51 21C33 21 19 36 22 58C25 83 39 143 55 148C67 152 68 111 80 111C92 111 93 152 105 148C121 143 135 83 138 58C141 36 127 21 109 21C95 21 90 31 80 31C70 31 65 21 51 21Z"
              fill="#FFFFFF"
              stroke="#C6E7E0"
              strokeWidth="3"
            />
            <path
              d="M47 47C42 55 45 73 49 84"
              stroke="#E0F3EE"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M59 12L59 29M50.5 20.5H67.5"
              stroke="#42B7A4"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="124" cy="43" r="13" fill="#D9F4EC" />
            <path
              d="M118 43L122 47L130 38"
              stroke="#157A70"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="admin-tooth-caption">
            <span className="admin-tooth-caption-dot" />
            CARE WITH CONFIDENCE
          </div>
        </div>

        <div className="admin-float-card admin-float-top">
          <span className="admin-float-icon calendar-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <rect
                x="3.5"
                y="5.5"
                width="17"
                height="15"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M7.5 3.5V7.5M16.5 3.5V7.5M3.5 10H20.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
              <path
                d="M8 14H10M14 14H16M8 17H10"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <span>
            <strong>Appointments</strong>
            <small>Organized with care</small>
          </span>
        </div>

        <div className="admin-float-card admin-float-bottom">
          <span className="admin-float-icon shield-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3L20 6V11.5C20 16.2 16.6 20 12 21C7.4 20 4 16.2 4 11.5V6L12 3Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 12L11 14.5L15.8 9.7"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <span>
            <strong>Secure workspace</strong>
            <small>Administrator access</small>
          </span>
        </div>
      </div>

      <div className="admin-intro-footer">
        <span className="admin-intro-footer-line" />
        <p>Thoughtful care. Seamless management.</p>
      </div>
    </div>

    <div className="admin-login-panel">
      <div className="admin-login-card">
        <div className="admin-mobile-mark">
          <span className="admin-mobile-mark-icon">+</span>
          ORAVIA
        </div>

        <div className="admin-card-eyebrow">
          <span className="admin-card-eyebrow-line" />
          ADMINISTRATOR ACCESS
        </div>

        <h2>Welcome back</h2>

        <p className="admin-card-description">
          Sign in to access your clinic dashboard.
        </p>

        {error && (
          <div className="admin-login-error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M12 8V12.2M12 16H12.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            <span>{error}</span>
          </div>
        )}

        <form className="admin-login-form" onSubmit={handleLogin}>
          <div className="admin-form-field">
            <label htmlFor="admin-email">
              Email address
            </label>

            <div className="admin-input-wrapper">
              <svg
                className="admin-input-icon"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M4 7L12 13L20 7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <input
                id="admin-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="admin@yourclinic.com"
                autoComplete="username"
                maxLength={254}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="admin-form-field">
            <div className="admin-password-label-row">
              <label htmlFor="admin-password">
                Password
              </label>
              <span className="admin-password-hint">
                Administrator account
              </span>
            </div>

            <div className="admin-input-wrapper">
              <svg
                className="admin-input-icon"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="4.5"
                  y="10"
                  width="15"
                  height="11"
                  rx="2.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M8 10V7.5C8 5.3 9.8 3.5 12 3.5C14.2 3.5 16 5.3 16 7.5V10"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="15" r="1.3" fill="currentColor" />
              </svg>

              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={loading}
              />

              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                aria-pressed={showPassword}
                disabled={loading}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 3L21 21M10.6 10.6A2 2 0 0013.4 13.4M9.9 5.2A10.5 10.5 0 0112 5C17 5 20.5 9.5 21 12C20.7 13.4 19.8 14.8 18.6 16M6.2 6.2C4.2 7.5 3.3 9.5 3 12C3.5 14.5 7 19 12 19C13.1 19 14.1 18.8 15 18.4"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M3 12C3.5 9.5 7 5 12 5C17 5 20.5 9.5 21 12C20.5 14.5 17 19 12 19C7 19 3.5 14.5 3 12Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-submit-button"
            disabled={loading}
          >
            <span>
              {loading ? "Signing you in..." : "Sign in to dashboard"}
            </span>

            {!loading && (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 12H19M13 6L19 12L13 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}

            {loading && <span className="admin-button-spinner" />}
          </button>
        </form>

        <div className="admin-login-divider">
          <span />
          <span className="admin-divider-icon">✦</span>
          <span />
        </div>

        <div className="admin-security-note">
          <span className="admin-security-icon">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3L20 6V11.5C20 16.2 16.6 20 12 21C7.4 20 4 16.2 4 11.5V6L12 3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M9 12L11 14L15 10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <p>
            <strong>Your workspace, protected.</strong>
            <span>
              This sign-in is reserved for authorized clinic administrators.
            </span>
          </p>
        </div>

        <p className="admin-patient-link">
          Looking for patient access?{" "}
          <a href="/login">Patient sign in</a>
        </p>
      </div>

      <p className="admin-panel-footer">
        © {new Date().getFullYear()} ORAVIA Dental Care
        <span>·</span>
        Care in every detail.
      </p>
    </div>
  </section>
</main>

);
}

export default AdminLogin;
