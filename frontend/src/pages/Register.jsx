import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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

    const phonePattern = /^[6-9]\d{9}$/;

    const passwordPattern =/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&]).{8,}$/;

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required.";
    }

    if (!phonePattern.test(formData.phone.trim())) {
      newErrors.phone =
        "Enter a valid 10-digit Indian mobile number.";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
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
    }));

    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccess("");

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:5000/api/auth/register",
        formData
      );

      setSuccess(response.data.message);

      setFormData({
        name: "",
        phone: "",
        email: "",
        password: "",
      });

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Registration failed. Please try again.";

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
                required
              />

              {errors.name && (
                <p className="form-error">
                  {errors.name}
                </p>
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
                required
              />

              {errors.phone && (
                <p className="form-error">
                  {errors.phone}
                </p>
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
            required
          />

          {errors.email && (
            <p className="form-error">
              {errors.email}
            </p>
          )}

          <label htmlFor="password">Create password</label>

          <input
            id="password"
            name="password"
            type="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            minLength={8}
            required
          />

          <p className="password-hint">
            Use at least 8 characters with uppercase, lowercase,
            a number and a special character.
          </p>

          {errors.password && (
            <p className="form-error">
              {errors.password}
            </p>
          )}

          {errors.general && (
            <p className="form-error">
              {errors.general}
            </p>
          )}

          {success && (
            <p className="form-success">
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
          >
            Sign in
          </button>
        </p>

      </section>
    </main>
  );
}

export default Register;