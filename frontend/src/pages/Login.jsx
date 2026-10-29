
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config/api.js";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
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

      // Do not create a session from an incomplete response.
      if (
        typeof token !== "string" ||
        !token ||
        !user ||
        typeof user !== "object" ||
        user.role !== "patient"
      ) {
        throw new Error(
          "The server returned an invalid patient login response."
        );
      }

      // Keep patient and admin sessions separate.
      // Do not retain a previous admin session after patient login.
      localStorage.removeItem("oraviaAdminToken");
      localStorage.removeItem("oraviaAdminUser");

      localStorage.setItem("oraviaToken", token);
      localStorage.setItem("oraviaUser", JSON.stringify(user));

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error(
        "Patient login error:",
        error.response?.status || error.message
      );

      if (error.response) {
        setError(
          error.response.data?.message ||
            "Login failed. Please check your credentials."
        );
      } else if (error.code === "ECONNABORTED") {
        setError(
          "The server took too long to respond. Please try again."
        );
      } else if (error.response === undefined && error.message) {
        setError(
          error.message.includes("invalid patient login response")
            ? error.message
            : "Unable to connect to the server. Please try again."
        );
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="section-label">PATIENT ACCOUNT</p>

        <h1>Welcome back.</h1>

        <p className="auth-description">
          Sign in to manage your appointments and view your
          ORAVIA care history.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>

          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            maxLength={254}
            required
            disabled={loading}
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
            disabled={loading}
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New to ORAVIA?{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            disabled={loading}
          >
            Create an account
          </button>
        </p>
      </section>
    </main>
  );
}

export default Login;
