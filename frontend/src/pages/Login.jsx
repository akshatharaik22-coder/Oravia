import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config/api";
import "./Login.css";

function getRedirectPath(from) {
  const candidate = typeof from === "string" ? from : from?.pathname;

  // Only allow an internal application path. This prevents an external redirect.
  if (
    typeof candidate === "string" &&
    candidate.startsWith("/") &&
    !candidate.startsWith("//")
  ) {
    return candidate;
  }

  return "/dashboard";
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const email = form.email.trim().toLowerCase();
    if (!email || !form.password) {
      setError("Enter your email address and password to continue.");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password: form.password,
      });

      const { token, user } = response.data || {};
      if (!token || !user || user.role !== "patient") {
        throw new Error("We couldn't verify this patient account. Please try again.");
      }

      // Keep patient and administrator sessions separate.
      localStorage.removeItem("oraviaAdminToken");
      localStorage.removeItem("oraviaAdminUser");
      localStorage.setItem("oraviaToken", token);
      localStorage.setItem("oraviaUser", JSON.stringify(user));

      navigate(getRedirectPath(location.state?.from), { replace: true });
    } catch (requestError) {
      const status = requestError.response?.status;
      const message = requestError.response?.data?.message;

      if (status === 401 || status === 403) {
        setError(message || "The email or password is incorrect. Please try again.");
      } else if (requestError.response) {
        setError(message || "We couldn't sign you in. Please try again.");
      } else if (requestError.request) {
        setError("We couldn't reach ORAVIA right now. Check your connection and try again.");
      } else {
        setError(requestError.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="patient-login-page">
      <section className="patient-login-shell" aria-label="Patient sign in">
        <div className="patient-login-story">
          <Link className="patient-login-brand" to="/" aria-label="ORAVIA home">
            <span className="patient-login-brand-mark" aria-hidden="true">O</span>
            <span>ORAVIA<span className="patient-login-brand-dot">.</span></span>
          </Link>

          <div className="patient-login-story-content">
            <span className="patient-login-eyebrow">YOUR SMILE, OUR PRIORITY</span>
            <h1>Care that keeps you smiling.</h1>
            <p>
              Sign in to manage your dental appointments, follow visit updates,
              and keep your care information together in one place.
            </p>
            <div className="patient-login-note">
              <span className="patient-login-note-icon" aria-hidden="true">✦</span>
              <span>Thoughtful dental care, made easier.</span>
            </div>
          </div>

          <div className="patient-login-story-footer">
            <span>Patient portal</span>
            <span>Secure access to your ORAVIA account</span>
          </div>
          <span className="patient-login-orb patient-login-orb-one" aria-hidden="true" />
          <span className="patient-login-orb patient-login-orb-two" aria-hidden="true" />
        </div>

        <div className="patient-login-form-panel">
          <div className="patient-login-form-topline">
            <Link to="/" className="patient-login-mobile-brand" aria-label="ORAVIA home">
              <span className="patient-login-brand-mark" aria-hidden="true">O</span>
              <span>ORAVIA<span className="patient-login-brand-dot">.</span></span>
            </Link>
            <span className="patient-login-secure-label">
              <span aria-hidden="true">●</span> Secure patient login
            </span>
          </div>

          <div className="patient-login-form-content">
            <div className="patient-login-heading">
              <span className="patient-login-eyebrow">WELCOME BACK</span>
              <h2>Sign in to your account</h2>
              <p>Enter the email and password associated with your patient account.</p>
            </div>

            <form className="patient-login-form" onSubmit={handleSubmit} noValidate>
              <div className="patient-login-field">
                <label htmlFor="patient-login-email">Email address</label>
                <input
                  id="patient-login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="patient-login-field">
                <div className="patient-login-label-row">
                  <label htmlFor="patient-login-password">Password</label>
                </div>
                <div className="patient-login-password-wrap">
                  <input
                    id="patient-login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  <button
                    className="patient-login-show-password"
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    disabled={loading}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="patient-login-error" role="alert">
                  <span aria-hidden="true">!</span>
                  <p>{error}</p>
                </div>
              )}

              <button className="patient-login-submit" type="submit" disabled={loading}>
                {loading ? (
                  <><span className="patient-login-spinner" aria-hidden="true" /> Signing you in...</>
                ) : (
                  <>Sign in <span aria-hidden="true">→</span></>
                )}
              </button>
            </form>

            <p className="patient-login-register">
              New to ORAVIA? <Link to="/register">Create a patient account</Link>
            </p>

            <div className="patient-login-divider"><span>OR</span></div>
            <Link className="patient-login-home-link" to="/">Back to ORAVIA home</Link>
          </div>

          <div className="patient-login-bottom-note">
            <span aria-hidden="true">♡</span>
            Your dental care journey, all in one place.
          </div>
        </div>
      </section>
    </main>
  );
}
