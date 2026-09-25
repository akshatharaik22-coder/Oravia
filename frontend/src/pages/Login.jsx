import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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

    setError("");

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        formData
      );

      localStorage.setItem("oraviaToken", response.data.token);
      localStorage.setItem(
        "oraviaUser",
        JSON.stringify(response.data.user)
      );

      navigate("/dashboard");
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Login failed. Please try again."
      );
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
            required
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          {error && (
            <p className="form-error">
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
          <button onClick={() => navigate("/register")}>
            Create an account
          </button>
        </p>
      </section>
    </main>
  );
}

export default Login;