
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, NavLink, useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api.js";
import "./Admindashboard.css";

const API = `${API_BASE_URL}/api`;

const NAV_ITEMS = [
  {
    label: "Dashboard",
    to: "/admin/dashboard",
    icon: "▦",
  },
  {
    label: "Appointments",
    to: "/admin/appointments",
    icon: "▤",
  },
  {
    label: "Doctor monitor",
    to: "/admin/doctor-monitor",
    icon: "◉",
  },
  {
    label: "Billing & payments",
    to: "/admin/billing",
    icon: "₹",
  },
];

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getId = (value) => {
  if (!value) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return String(value._id || value.id || "");
};

const getPatientName = (appointment) => {
  const patient = appointment?.patient;

  if (patient && typeof patient === "object") {
    return (
      patient.name ||
      patient.fullName ||
      patient.username ||
      appointment.patientName ||
      "Patient"
    );
  }

  return (
    appointment?.patientName ||
    appointment?.patient?.name ||
    "Patient"
  );
};

const getPatientId = (appointment) => {
  return (
    getId(appointment?.patient) ||
    getId(appointment?.patientId) ||
    getId(appointment?.userId) ||
    ""
  );
};

const getAppointmentDate = (appointment) =>
  appointment?.appointmentDate ||
  appointment?.date ||
  appointment?.createdAt ||
  null;

const normalizeStatus = (status) =>
  String(status || "Pending")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);

  const labels = {
    "in-progress": "In progress",
    "checked-in": "Checked in",
    "checked-out": "Checked out",
    completed: "Completed",
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    canceled: "Cancelled",
    rejected: "Rejected",
    scheduled: "Scheduled",
  };

  if (labels[normalized]) return labels[normalized];

  return normalized
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getStatusClass = (status) => {
  const normalized = normalizeStatus(status);

  const allowedStatuses = [
    "pending",
    "completed",
    "confirmed",
    "cancelled",
    "canceled",
    "rejected",
    "in-progress",
    "scheduled",
    "checked-in",
    "checked-out",
  ];

  const safeStatus = allowedStatuses.includes(normalized)
    ? normalized
    : "default";

  return `admin-dashboard-status admin-dashboard-status--${safeStatus}`;
};

const getTreatment = (appointment) =>
  appointment?.treatment ||
  appointment?.service ||
  appointment?.reason ||
  appointment?.treatmentType ||
  "Dental consultation";

const getErrorMessage = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.request) {
    return "Unable to connect to the server. Check your connection and try again.";
  }

  return error?.message || "Unable to load dashboard information.";
};

const getAppointmentList = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.appointments)) return data.appointments;

  if (Array.isArray(data?.data)) return data.data;

  if (Array.isArray(data?.results)) return data.results;

  return null;
};

function AdminDashboard() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const token = localStorage.getItem("oraviaAdminToken");

  const adminUser = useMemo(() => {
    try {
      return JSON.parse(
        localStorage.getItem("oraviaAdminUser") || "{}"
      );
    } catch {
      return {};
    }
  }, []);

  const adminName =
    adminUser?.name ||
    adminUser?.username ||
    adminUser?.email?.split("@")[0] ||
    "Administrator";

  const fetchDashboardData = useCallback(
    async ({ silent = false } = {}) => {
      const currentToken = localStorage.getItem("oraviaAdminToken");

      if (!currentToken) {
        navigate("/admin/login", { replace: true });
        return;
      }

      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await axios.get(`${API}/appointments`, {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
          timeout: 20000,
        });

        const list = getAppointmentList(response.data);

        if (!list) {
          throw new Error(
            "The appointments API returned an unexpected response."
          );
        }

        setAppointments(list);
        setLastUpdated(new Date());
      } catch (requestError) {
        const status = requestError?.response?.status;

        if (status === 401) {
          localStorage.removeItem("oraviaAdminToken");
          localStorage.removeItem("oraviaAdminUser");

          navigate("/admin/login", { replace: true });
          return;
        }

        if (status === 403) {
          setError(
            "You do not have permission to view dashboard appointments. Please verify your admin account."
          );
        } else {
          setError(getErrorMessage(requestError));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const statistics = useMemo(() => {
    const pending = appointments.filter((appointment) =>
      ["pending", "scheduled"].includes(
        normalizeStatus(appointment.status)
      )
    ).length;

    const completed = appointments.filter(
      (appointment) =>
        normalizeStatus(appointment.status) === "completed"
    ).length;

    const patientIds = new Set(
      appointments.map(getPatientId).filter(Boolean)
    );

    return {
      total: appointments.length,
      pending,
      completed,
      patients: patientIds.size,
    };
  }, [appointments]);

  const recentAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => {
        const dateA = new Date(
          getAppointmentDate(a) || 0
        ).getTime();

        const dateB = new Date(
          getAppointmentDate(b) || 0
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 6);
  }, [appointments]);

  const handleLogout = () => {
    localStorage.removeItem("oraviaAdminToken");
    localStorage.removeItem("oraviaAdminUser");

    navigate("/admin/login", { replace: true });
  };

  const handleRefresh = () => {
    if (!loading && !refreshing) {
      fetchDashboardData({ silent: appointments.length > 0 });
    }
  };

  return (
    <main className="admin-dashboard">
      <aside
        className={`admin-dashboard-sidebar ${
          mobileNavOpen ? "is-open" : ""
        }`}
      >
        <Link
          to="/admin/dashboard"
          className="admin-dashboard-brand"
          aria-label="ORAVIA admin dashboard"
          onClick={() => setMobileNavOpen(false)}
        >
          <span className="admin-dashboard-brand-icon">O</span>

          <span className="admin-dashboard-brand-copy">
            <strong>ORAVIA</strong>
            <small>ADMIN WORKSPACE</small>
          </span>
        </Link>

        <div className="admin-dashboard-nav-label">
          WORKSPACE
        </div>

        <nav
          className="admin-dashboard-nav"
          aria-label="Admin navigation"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin/dashboard"}
              className={({ isActive }) =>
                `admin-dashboard-nav-link ${
                  isActive ? "is-active" : ""
                }`
              }
              aria-label={item.label}
              onClick={() => setMobileNavOpen(false)}
            >
              <span
                className="admin-dashboard-nav-icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-dashboard-sidebar-bottom">
          <div className="admin-dashboard-support-card">
            <span className="admin-dashboard-support-icon">
              ✦
            </span>

            <strong>ORAVIA workspace</strong>

            <p>
              Manage clinic operations from one secure place.
            </p>
          </div>

          <button
            type="button"
            className="admin-dashboard-logout"
            onClick={handleLogout}
          >
            <span aria-hidden="true">↪</span>
            Sign out
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <button
          type="button"
          className="admin-dashboard-mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <section className="admin-dashboard-main">
        <header className="admin-dashboard-topbar">
          <div className="admin-dashboard-heading">
            <button
              type="button"
              className="admin-dashboard-menu-button"
              aria-label={
                mobileNavOpen ? "Close menu" : "Open menu"
              }
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>

            <div>
              <span className="admin-dashboard-breadcrumb">
                WORKSPACE / OVERVIEW
              </span>

              <h1>Admin dashboard</h1>
            </div>
          </div>

          <div className="admin-dashboard-account">
            <div
              className="admin-dashboard-avatar"
              aria-hidden="true"
            >
              {adminName.charAt(0).toUpperCase()}
            </div>

            <div className="admin-dashboard-account-details">
              <strong title={adminName}>{adminName}</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        <div className="admin-dashboard-content">
          <section className="admin-dashboard-welcome">
            <div className="admin-dashboard-welcome-copy">
              <span className="admin-dashboard-eyebrow">
                YOUR CLINIC AT A GLANCE
              </span>

              <h2>Welcome back, {adminName}.</h2>

              <p>
                Keep track of appointment activity and access
                your clinic management tools from one place.
              </p>
            </div>

            <button
              type="button"
              className="admin-dashboard-button admin-dashboard-button--light"
              onClick={handleRefresh}
              disabled={loading || refreshing}
            >
              <span
                className={
                  refreshing
                    ? "admin-dashboard-refresh-icon is-spinning"
                    : "admin-dashboard-refresh-icon"
                }
                aria-hidden="true"
              >
                ↻
              </span>

              {loading
                ? "Loading..."
                : refreshing
                  ? "Refreshing..."
                  : "Refresh data"}
            </button>
          </section>

          {error && (
            <div
              className="admin-dashboard-alert"
              role="alert"
            >
              <span className="admin-dashboard-alert-icon">
                !
              </span>

              <div className="admin-dashboard-alert-copy">
                <strong>Unable to update dashboard</strong>
                <p>{error}</p>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading || refreshing}
              >
                Try again
              </button>
            </div>
          )}

          <section className="admin-dashboard-section">
            <div className="admin-dashboard-section-heading">
              <div>
                <span className="admin-dashboard-eyebrow">
                  CLINIC OVERVIEW
                </span>

                <h2>Appointment statistics</h2>

                <p>
                  A summary of the appointment records available
                  through your admin account.
                </p>
              </div>

              {lastUpdated && (
                <span className="admin-dashboard-updated">
                  <span
                    className="admin-dashboard-live-dot"
                    aria-hidden="true"
                  />

                  Updated{" "}
                  {lastUpdated.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>

            <div className="admin-dashboard-stat-grid">
              <article className="admin-dashboard-stat admin-dashboard-stat--featured">
                <div className="admin-dashboard-stat-top">
                  <span>Total appointments</span>

                  <span
                    className="admin-dashboard-stat-icon"
                    aria-hidden="true"
                  >
                    ▤
                  </span>
                </div>

                <strong>
                  {loading ? "—" : statistics.total}
                </strong>

                <small>
                  Records returned by the appointment API
                </small>
              </article>

              <article className="admin-dashboard-stat">
                <div className="admin-dashboard-stat-top">
                  <span>Pending appointments</span>

                  <span
                    className="admin-dashboard-stat-icon"
                    aria-hidden="true"
                  >
                    ◷
                  </span>
                </div>

                <strong>
                  {loading ? "—" : statistics.pending}
                </strong>

                <small>
                  Pending or scheduled appointments
                </small>
              </article>

              <article className="admin-dashboard-stat">
                <div className="admin-dashboard-stat-top">
                  <span>Completed appointments</span>

                  <span
                    className="admin-dashboard-stat-icon"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </div>

                <strong>
                  {loading ? "—" : statistics.completed}
                </strong>

                <small>
                  Appointments marked completed
                </small>
              </article>

              <article className="admin-dashboard-stat">
                <div className="admin-dashboard-stat-top">
                  <span>Patients represented</span>

                  <span
                    className="admin-dashboard-stat-icon"
                    aria-hidden="true"
                  >
                    ♙
                  </span>
                </div>

                <strong>
                  {loading ? "—" : statistics.patients}
                </strong>

                <small>
                  Distinct linked patient IDs in these records
                </small>
              </article>
            </div>

            <p className="admin-dashboard-stat-note">
              These figures reflect the records returned by the
              current API. They are not guaranteed to represent
              all-time clinic totals.
            </p>
          </section>

          <section className="admin-dashboard-section">
            <div className="admin-dashboard-section-heading">
              <div>
                <span className="admin-dashboard-eyebrow">
                  QUICK ACCESS
                </span>

                <h2>Manage your clinic</h2>

                <p>
                  Open a workspace to continue managing clinic
                  operations.
                </p>
              </div>
            </div>

            <div className="admin-dashboard-action-grid">
              <Link
                to="/admin/appointments"
                className="admin-dashboard-action-card"
              >
                <span
                  className="admin-dashboard-action-icon"
                  aria-hidden="true"
                >
                  ▤
                </span>

                <span className="admin-dashboard-action-copy">
                  <strong>Appointments</strong>

                  <small>
                    Review and manage patient visits.
                  </small>
                </span>

                <span
                  className="admin-dashboard-action-arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>

              <Link
                to="/admin/doctor-monitor"
                className="admin-dashboard-action-card"
              >
                <span
                  className="admin-dashboard-action-icon"
                  aria-hidden="true"
                >
                  ◉
                </span>

                <span className="admin-dashboard-action-copy">
                  <strong>Doctor monitor</strong>

                  <small>
                    Review the existing doctor monitoring page.
                  </small>
                </span>

                <span
                  className="admin-dashboard-action-arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>

              <Link
                to="/admin/billing"
                className="admin-dashboard-action-card"
              >
                <span
                  className="admin-dashboard-action-icon"
                  aria-hidden="true"
                >
                  ₹
                </span>

                <span className="admin-dashboard-action-copy">
                  <strong>Billing & payments</strong>

                  <small>
                    Create invoices and record payments.
                  </small>
                </span>

                <span
                  className="admin-dashboard-action-arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              </Link>
            </div>
          </section>

          <section className="admin-dashboard-section admin-dashboard-appointments">
            <div className="admin-dashboard-section-heading">
              <div>
                <span className="admin-dashboard-eyebrow">
                  LATEST ACTIVITY
                </span>

                <h2>Recent appointments</h2>

                <p>
                  The six most recent appointments available from
                  the admin API.
                </p>
              </div>

              <Link
                to="/admin/appointments"
                className="admin-dashboard-view-all"
              >
                View all
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {loading ? (
              <div
                className="admin-dashboard-loading"
                role="status"
                aria-live="polite"
              >
                <span className="admin-dashboard-spinner" />

                <span>Loading appointment records...</span>
              </div>
            ) : recentAppointments.length === 0 ? (
              <div className="admin-dashboard-empty">
                <span
                  className="admin-dashboard-empty-icon"
                  aria-hidden="true"
                >
                  ▤
                </span>

                <h3>
                  {error
                    ? "Appointments are unavailable"
                    : "No appointments yet"}
                </h3>

                <p>
                  {error
                    ? "Check your connection and try refreshing the dashboard."
                    : "New appointment records will appear here when available."}
                </p>

                {error && (
                  <button
                    type="button"
                    className="admin-dashboard-empty-button"
                    onClick={handleRefresh}
                    disabled={loading || refreshing}
                  >
                    Retry loading
                  </button>
                )}
              </div>
            ) : (
              <div className="admin-dashboard-table-wrap">
                <table className="admin-dashboard-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Treatment / service</th>
                      <th>Appointment date</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentAppointments.map((appointment, index) => {
                      const appointmentId =
                        getId(appointment) ||
                        `${getPatientName(appointment)}-${index}`;

                      const patientName =
                        getPatientName(appointment);

                      const appointmentDate =
                        getAppointmentDate(appointment);

                      return (
                        <tr key={appointmentId}>
                          <td>
                            <div className="admin-dashboard-patient">
                              <span
                                className="admin-dashboard-patient-avatar"
                                aria-hidden="true"
                              >
                                {patientName
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>

                              <div className="admin-dashboard-patient-copy">
                                <strong>{patientName}</strong>

                                <small>
                                  {getPatientId(appointment)
                                    ? "Registered patient"
                                    : "Patient record"}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="admin-dashboard-treatment">
                              {getTreatment(appointment)}
                            </span>
                          </td>

                          <td>
                            <span className="admin-dashboard-date">
                              {formatDate(appointmentDate)}
                            </span>

                            {formatTime(appointmentDate) && (
                              <small className="admin-dashboard-time">
                                {formatTime(appointmentDate)}
                              </small>
                            )}
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                appointment.status
                              )}
                            >
                              <span
                                className="admin-dashboard-status-dot"
                                aria-hidden="true"
                              />

                              {getStatusLabel(appointment.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <footer className="admin-dashboard-footer">
            <span>ORAVIA · Dental Care Management</span>
            <span>Administrator workspace</span>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default AdminDashboard;
