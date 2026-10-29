import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../config/api";
import "./PatientDashboard.css";

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("oraviaUser") || "null");
  } catch {
    return null;
  }
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Date not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (timeValue) => {
  if (!timeValue) return "Time not available";

  const match = String(timeValue).match(
    /^([01]?\d|2[0-3]):([0-5]\d)$/
  );

  if (!match) return String(timeValue);

  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getStatusClass = (status) =>
  String(status || "Pending").toLowerCase().replace(/\s+/g, "-");

const getQueueLabel = (status) => {
  const labels = {
    Waiting: "Waiting for your turn",
    Called: "Please proceed when called",
    "In Consultation": "Consultation in progress",
    Completed: "Consultation completed",
    Skipped: "Queue skipped",
  };

  return labels[status] || "";
};

export default function PatientDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(getStoredUser);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");

  const loadAppointments = useCallback(async () => {
    const token = localStorage.getItem("oraviaToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/appointments/mine`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 15000,
        }
      );

      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error("Unexpected appointments response");
      }

      setAppointments(data);
    } catch (requestError) {
      if (
        requestError.response?.status === 401 ||
        requestError.response?.status === 403
      ) {
        localStorage.removeItem("oraviaToken");
        localStorage.removeItem("oraviaUser");

        navigate("/login", { replace: true });
        return;
      }

      setError(
        requestError.response?.data?.message ||
          "We couldn't load your appointments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleCancel = async (appointment) => {
    if (!appointment?._id || cancellingId) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    const token = localStorage.getItem("oraviaToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setCancellingId(appointment._id);
    setError("");

    try {
      await axios.patch(
        `${API_BASE_URL}/api/appointments/${appointment._id}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 15000,
        }
      );

      await loadAppointments();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to cancel this appointment. Please try again."
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("oraviaToken");
    localStorage.removeItem("oraviaUser");
    navigate("/login", { replace: true });
  };

  const displayedAppointments = appointments.filter((appointment) => {
    if (activeFilter === "All") return true;

    if (activeFilter === "Upcoming") {
      return (
        !["Completed", "Cancelled"].includes(appointment.status) &&
        appointment.status !== "Completed"
      );
    }

    return appointment.status === activeFilter;
  });

  const upcomingCount = appointments.filter(
    (appointment) =>
      !["Completed", "Cancelled"].includes(appointment.status)
  ).length;

  const completedCount = appointments.filter(
    (appointment) => appointment.status === "Completed"
  ).length;

  const firstName = user?.name?.trim()?.split(/\s+/)[0] || "there";

  return (
    <main className="patient-dashboard">
      <header className="patient-dashboard-header">
        <button
          className="patient-dashboard-brand"
          onClick={() => navigate("/")}
          aria-label="ORAVIA home"
        >
          <span className="patient-brand-mark">O</span>

          <span>
            ORAVIA
            <small>YOUR SMILE, OUR CARE</small>
          </span>
        </button>

        <nav className="patient-header-nav" aria-label="Patient navigation">
          <button onClick={() => navigate("/")}>Home</button>
          <button onClick={() => navigate("/services")}>Services</button>
          <button onClick={() => navigate("/clinics")}>Our Clinics</button>
        </nav>

        <div className="patient-header-actions">
          <span className="patient-account-name">
            {user?.name || "Patient"}
          </span>

          <button className="patient-logout-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <section className="patient-welcome">
        <div className="patient-welcome-content">
          <span className="patient-eyebrow">
            <span /> YOUR PERSONAL SPACE
          </span>

          <h1>
            Hello, {firstName}.
            <br />
            <em>Let's care for your smile.</em>
          </h1>

          <p>
            Keep track of your appointments and stay informed about your
            dental care journey.
          </p>

          <button
            className="patient-primary-button"
            onClick={() => navigate("/booking")}
          >
            Book an appointment <span>↗</span>
          </button>
        </div>

        <div className="patient-welcome-decoration" aria-hidden="true">
          <div className="patient-decoration-circle">
            <span>✳</span>
          </div>
          <span className="patient-decoration-caption">
            A little care goes a long way.
          </span>
        </div>
      </section>

      <section className="patient-dashboard-content">
        <div className="patient-summary-grid">
          <article className="patient-summary-card">
            <span className="patient-summary-icon">◷</span>
            <span className="patient-summary-label">All appointments</span>
            <strong>{appointments.length}</strong>
            <span className="patient-summary-caption">
              Your booking history
            </span>
          </article>

          <article className="patient-summary-card patient-summary-highlight">
            <span className="patient-summary-icon">✳</span>
            <span className="patient-summary-label">Active appointments</span>
            <strong>{upcomingCount}</strong>
            <span className="patient-summary-caption">
              Awaiting completion
            </span>
          </article>

          <article className="patient-summary-card">
            <span className="patient-summary-icon">✓</span>
            <span className="patient-summary-label">Completed visits</span>
            <strong>{completedCount}</strong>
            <span className="patient-summary-caption">
              Completed appointments
            </span>
          </article>
        </div>

        <div className="patient-appointments-heading">
          <div>
            <span className="patient-section-label">YOUR CARE JOURNEY</span>
            <h2>My appointments</h2>
            <p>View your bookings and check their current status.</p>
          </div>

          <button
            className="patient-secondary-button"
            onClick={loadAppointments}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        <div className="patient-filter-bar">
          {["All", "Upcoming", "Pending", "Confirmed", "Completed", "Cancelled"].map(
            (filter) => (
              <button
                key={filter}
                className={
                  activeFilter === filter ? "patient-filter-active" : ""
                }
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            )
          )}
        </div>

        {error && (
          <div className="patient-error-message" role="alert">
            <span>{error}</span>
            <button onClick={loadAppointments}>Try again</button>
          </div>
        )}

        {loading ? (
          <div className="patient-state-card" role="status">
            <div className="patient-loading-spinner" />
            <h3>Loading your appointments</h3>
            <p>Just a moment while we retrieve your bookings.</p>
          </div>
        ) : displayedAppointments.length === 0 ? (
          <div className="patient-empty-state">
            <div className="patient-empty-icon">✳</div>
            <h3>
              {appointments.length === 0
                ? "Your smile journey starts here."
                : "No appointments found."}
            </h3>
            <p>
              {appointments.length === 0
                ? "You haven't booked an appointment yet. Choose a time that works for you."
                : "Try selecting another filter to view your appointments."}
            </p>

            {appointments.length === 0 && (
              <button
                className="patient-primary-button"
                onClick={() => navigate("/booking")}
              >
                Book your first visit <span>↗</span>
              </button>
            )}
          </div>
        ) : (
          <div className="patient-appointment-list">
            {displayedAppointments.map((appointment) => (
              <article
                className="patient-appointment-card"
                key={appointment._id}
              >
                <div className="patient-appointment-date">
                  <span>{formatDate(appointment.appointmentDate)}</span>
                  <strong>{formatTime(appointment.appointmentTime)}</strong>
                </div>

                <div className="patient-appointment-details">
                  <h3>{appointment.treatment || "Dental appointment"}</h3>

                  <p>
                    Booking ID:{" "}
                    <span>{appointment._id.slice(-8).toUpperCase()}</span>
                  </p>

                  {appointment.symptoms && (
                    <p className="patient-appointment-symptoms">
                      Notes: {appointment.symptoms}
                    </p>
                  )}

                  {appointment.tokenNumber && (
                    <p>
                      Queue token: <strong>{appointment.tokenNumber}</strong>
                    </p>
                  )}

                  {appointment.queueStatus && (
                    <span className="patient-queue-label">
                      {getQueueLabel(appointment.queueStatus)}
                    </span>
                  )}
                </div>

                <div className="patient-appointment-actions">
                  <span
                    className={`patient-status-badge patient-status-${getStatusClass(
                      appointment.status
                    )}`}
                  >
                    {appointment.status || "Pending"}
                  </span>

                  {!["Completed", "Cancelled"].includes(
                    appointment.status
                  ) &&
                    !["In Consultation", "Completed"].includes(
                      appointment.queueStatus
                    ) && (
                      <button
                        className="patient-cancel-button"
                        onClick={() => handleCancel(appointment)}
                        disabled={cancellingId === appointment._id}
                      >
                        {cancellingId === appointment._id
                          ? "Cancelling..."
                          : "Cancel booking"}
                      </button>
                    )}
                </div>
              </article>
            ))}
          </div>
        )}

        <section className="patient-help-card">
          <div className="patient-help-symbol">✧</div>

          <div>
            <h3>Need to book another visit?</h3>
            <p>
              Choose a suitable date and time to request your next appointment.
            </p>
          </div>

          <button
            className="patient-secondary-button"
            onClick={() => navigate("/booking")}
          >
            Book a visit <span>↗</span>
          </button>
        </section>
      </section>

      <footer className="patient-dashboard-footer">
        <button onClick={() => navigate("/")}>ORAVIA</button>
        <p>Thoughtful dental care. A smile at a time.</p>
        <span>© {new Date().getFullYear()} ORAVIA</span>
      </footer>
    </main>
  );
}