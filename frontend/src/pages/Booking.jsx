import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api";
import "./Booking.css";

const initialForm = {
  patientName: "",
  phone: "",
  email: "",
  treatment: "",
  appointmentDate: "",
  appointmentTime: "",
  symptoms: "",
};

function Booking() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const today = new Date();
  const minDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const token = localStorage.getItem("oraviaToken");

    if (!token) {
      navigate("/login", {
        state: { from: "/booking" },
      });
      return;
    }

    if (form.appointmentDate < minDate) {
      setError("Please choose today or a future date.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/appointments`,
        {
          ...form,
          patientName: form.patientName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 15000,
        }
      );

      setMessage(
        response.data?.message ||
          "Your appointment request has been submitted."
      );

      setForm(initialForm);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("oraviaToken");
        localStorage.removeItem("oraviaUser");

        navigate("/login", {
          state: { from: "/booking" },
        });
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to submit your appointment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="oravia-booking-page">
      <header className="booking-header">
        <button
          className="booking-brand"
          onClick={() => navigate("/")}
          aria-label="Return to ORAVIA home"
        >
          <span className="booking-brand-icon">O</span>

          <span>
            <strong>ORAVIA</strong>
            <small>DENTAL CARE</small>
          </span>
        </button>

        <button
          className="booking-back-button"
          onClick={() => navigate("/")}
        >
          ← Back to home
        </button>
      </header>

      <main>
        <section className="booking-intro">
          <p className="booking-eyebrow">
            YOUR JOURNEY TO A HEALTHIER SMILE
          </p>

          <h1>
            Let's make time
            <br />
            <span>for your smile.</span>
          </h1>

          <p>
            Tell us a little about yourself and your preferred
            appointment. Our team can help you take the next step
            toward better dental health.
          </p>
        </section>

        <section className="booking-content">
          <div className="booking-information">
            <span className="booking-information-icon">✦</span>

            <p className="booking-eyebrow">A BETTER DENTAL EXPERIENCE</p>

            <h2>Care begins with a conversation.</h2>

            <p>
              Share your details and select the treatment
              you are interested in. Please provide accurate
              contact information so the clinic can follow up.
            </p>

            <div className="booking-info-item">
              <span>01</span>
              <div>
                <strong>Tell us about yourself</strong>
                <p>Enter your contact details.</p>
              </div>
            </div>

            <div className="booking-info-item">
              <span>02</span>
              <div>
                <strong>Choose your preferences</strong>
                <p>Select a treatment and preferred time.</p>
              </div>
            </div>

            <div className="booking-info-item">
              <span>03</span>
              <div>
                <strong>Submit your request</strong>
                <p>The clinic can review your appointment request.</p>
              </div>
            </div>

            <div className="booking-note">
              <span>i</span>
              <p>
                Submitting a request does not necessarily mean
                your appointment is confirmed.
              </p>
            </div>
          </div>

          <div className="booking-form-card">
            <div className="booking-form-heading">
              <div>
                <p className="booking-eyebrow">APPOINTMENT DETAILS</p>
                <h2>Book your visit</h2>
              </div>

              <span className="booking-required">* Required fields</span>
            </div>

            {message && (
              <div className="booking-success" role="status">
                {message}
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                >
                  View my dashboard →
                </button>
              </div>
            )}

            {error && (
              <div className="booking-error" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="booking-field">
                <label htmlFor="patientName">Full name *</label>
                <input
                  id="patientName"
                  name="patientName"
                  type="text"
                  placeholder="Enter your full name"
                  value={form.patientName}
                  onChange={handleChange}
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  required
                />
              </div>

              <div className="booking-form-row">
                <div className="booking-field">
                  <label htmlFor="phone">Phone number *</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Your phone number"
                    value={form.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                    minLength={7}
                    maxLength={20}
                    required
                  />
                </div>

                <div className="booking-field">
                  <label htmlFor="email">Email address *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="booking-field">
                <label htmlFor="treatment">Treatment *</label>

                <select
                  id="treatment"
                  name="treatment"
                  value={form.treatment}
                  onChange={handleChange}
                  required
                >
                  <option value="">Choose a treatment</option>
                  <option value="General Dentistry">
                    General Dentistry
                  </option>
                  <option value="Teeth Cleaning">
                    Teeth Cleaning
                  </option>
                  <option value="Teeth Whitening">
                    Teeth Whitening
                  </option>
                  <option value="Dental Implants">
                    Dental Implants
                  </option>
                  <option value="Orthodontics">
                    Orthodontics
                  </option>
                  <option value="Cosmetic Dentistry">
                    Cosmetic Dentistry
                  </option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="booking-form-row">
                <div className="booking-field">
                  <label htmlFor="appointmentDate">Preferred date *</label>
                  <input
                    id="appointmentDate"
                    name="appointmentDate"
                    type="date"
                    value={form.appointmentDate}
                    min={minDate}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="booking-field">
                  <label htmlFor="appointmentTime">Preferred time *</label>
                  <input
                    id="appointmentTime"
                    name="appointmentTime"
                    type="time"
                    value={form.appointmentTime}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="booking-field">
                <label htmlFor="symptoms">
                  How can we help? <span>(Optional)</span>
                </label>

                <textarea
                  id="symptoms"
                  name="symptoms"
                  placeholder="Briefly describe your concerns..."
                  value={form.symptoms}
                  onChange={handleChange}
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <button
                className="booking-submit-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Submitting request..." : "Request appointment"}
                {!loading && <span aria-hidden="true">↗</span>}
              </button>

              <p className="booking-privacy-note">
                Your information is submitted to the clinic
                for appointment processing.
              </p>
            </form>
          </div>
        </section>
      </main>

      <footer className="booking-footer">
        <span>© {new Date().getFullYear()} ORAVIA Dental Care</span>
        <button onClick={() => navigate("/login")}>
          Patient sign in
        </button>
      </footer>
    </div>
  );
}

export default Booking;