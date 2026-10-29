
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config/api.js";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    const name = formData.name.trim();
    const phone = formData.phone.trim();
    const email = formData.email.trim();

    const phonePattern = /^[6-9]\d{9}$/;

    const passwordPattern =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&]).{8,}$/;

    if (!name) {
      newErrors.name = "Full name is required.";
    } else if (name.length > 100) {
      newErrors.name = "Name must not exceed 100 characters.";
    }

    if (!phonePattern.test(phone)) {
      newErrors.phone =
        "Enter a valid 10-digit Indian mobile number.";
    }

    if (!email) {
      newErrors.email = "Email address is required.";
    } else if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!passwordPattern.test(formData.password)) {
      newErrors.password =
        "Password must contain at least 8 characters, including uppercase, lowercase, number and special character.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: "",
      general: "",
    }));

    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/register`,
        {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
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

      // Registration should create an account, not silently
      // authenticate the user or create an admin session.
      // Clear previous sessions to avoid cross-role confusion.
      localStorage.removeItem("oraviaToken");
      localStorage.removeItem("oraviaUser");
      localStorage.removeItem("oraviaAdminToken");
      localStorage.removeItem("oraviaAdminUser");

      setSuccess(
        response.data?.message ||
          "Registration successful! Redirecting to login..."
      );

      setFormData({
        name: "",
        phone: "",
        email: "",
        password: "",
      });

      setErrors({});

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (error) {
      let message = "Registration failed. Please try again.";

      if (error.response) {
        const status = error.response.status;

        if (status === 409) {
          message =
            error.response.data?.message ||
            "An account with this email already exists. Please sign in.";
        } else {
          message =
            error.response.data?.message || message;
        }
      } else if (error.code === "ECONNABORTED") {
        message =
          "The request timed out. Check your connection before trying again.";
      } else if (error.code === "ERR_NETWORK") {
        message =
          "Unable to connect to the server. Check your connection and backend configuration.";
      }

      setErrors({
        general: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <p className="section-label">NEW PATIENT</p>

        <h1>Create your ORAVIA account.</h1>

        <p className="auth-description">
          Create an account once and keep your patient information
          and appointment history connected for future visits.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <div>
              <label htmlFor="name">Full name</label>

              <input
                id="name"
                name="name"
                type="text"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
                maxLength={100}
                required
                disabled={loading}
              />

              {errors.name && (
                <p className="form-error">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone">Phone number</label>

              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
                disabled={loading}
              />

              {errors.phone && (
                <p className="form-error">{errors.phone}</p>
              )}
            </div>
          </div>

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

          {errors.email && (
            <p className="form-error">{errors.email}</p>
          )}

          <label htmlFor="password">Create password</label>

          <input
            id="password"
            name="password"
            type="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={loading}
          />

          <p className="password-hint">
            Use at least 8 characters with uppercase, lowercase,
            a number and a special character.
          </p>

          {errors.password && (
            <p className="form-error">{errors.password}</p>
          )}

          {errors.general && (
            <p className="form-error" role="alert">
              {errors.general}
            </p>
          )}

          {success && (
            <p className="form-success" role="status">
              {success}
            </p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Patient Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            Sign in
          </button>
        </p>
      </section>
    </main>
  );
}

export default Register;
