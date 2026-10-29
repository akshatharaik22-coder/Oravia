
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api.js";
import "./AdminAppointments.css";

const EMPTY_RECORD_FORM = {
  patient: "",
  appointment: "",
  treatment: "",
  visitDate: "",
  dentalNotes: "",
  medications: "",
  prescription: "",
  additionalNotes: "",
};

const STATUS_OPTIONS = [
  "All",
  "Pending",
  "Confirmed",
  "Completed",
  "Cancelled",
];

const QUEUE_STATUS_OPTIONS = [
  "All",
  "Waiting",
  "Called",
  "In Consultation",
  "Completed",
  "Skipped",
];

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatToday() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusClass(status = "") {
  return `status-badge status-${String(status)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")}`;
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function getPatientId(appointment) {
  if (!appointment?.patient) return "";

  return typeof appointment.patient === "string"
    ? appointment.patient
    : appointment.patient._id || "";
}

function getLocalDateInputValue(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  // Use local date components rather than UTC ISO conversion.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function AdminAppointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [recordError, setRecordError] = useState("");
  const [recordSuccess, setRecordSuccess] = useState("");

  const [updatingId, setUpdatingId] = useState(null);
  const [queueActionId, setQueueActionId] = useState(null);
  const [savingRecord, setSavingRecord] = useState(false);

  const [statusFilter, setStatusFilter] = useState("All");
  const [queueFilter, setQueueFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [recordForm, setRecordForm] = useState(EMPTY_RECORD_FORM);

  const getAdminToken = useCallback(() => {
    const token = localStorage.getItem("oraviaAdminToken");

    if (!token) {
      localStorage.removeItem("oraviaAdminUser");
      navigate("/admin/login", { replace: true });
      return null;
    }

    return token;
  }, [navigate]);

  const handleUnauthorized = useCallback(
    (requestError) => {
      const status = requestError?.response?.status;

      if (status === 401) {
        localStorage.removeItem("oraviaAdminToken");
        localStorage.removeItem("oraviaAdminUser");

        navigate("/admin/login", { replace: true });

        return true;
      }

      if (status === 403) {
        setError(
          requestError?.response?.data?.message ||
            "You do not have permission to perform this action."
        );

        return true;
      }

      return false;
    },
    [navigate]
  );

  const fetchAppointments = useCallback(async () => {
    const token = getAdminToken();

    if (!token) return;

    try {
      setLoading(true);

      const response = await axios.get(
        `${API_BASE_URL}/api/appointments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAppointments(
        Array.isArray(response.data) ? response.data : []
      );

      setError("");
    } catch (requestError) {
      console.error(
        "Error fetching appointments:",
        requestError
      );

      if (handleUnauthorized(requestError)) return;

      setError(
        getErrorMessage(
          requestError,
          "Unable to load appointments. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [getAdminToken, handleUnauthorized]);

  const fetchMedicalRecords = useCallback(async () => {
    const token = getAdminToken();

    if (!token) return;

    try {
      setRecordsLoading(true);

      const response = await axios.get(
        `${API_BASE_URL}/api/medical-records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMedicalRecords(
        Array.isArray(response.data) ? response.data : []
      );

      setRecordError("");
    } catch (requestError) {
      console.error(
        "Error fetching medical records:",
        requestError
      );

      if (handleUnauthorized(requestError)) return;

      setRecordError(
        getErrorMessage(
          requestError,
          "Unable to load medical records."
        )
      );
    } finally {
      setRecordsLoading(false);
    }
  }, [getAdminToken, handleUnauthorized]);

  useEffect(() => {
    if (!localStorage.getItem("oraviaAdminToken")) {
      localStorage.removeItem("oraviaAdminUser");
      navigate("/admin/login", { replace: true });
      return;
    }

    fetchAppointments();
    fetchMedicalRecords();
  }, [navigate, fetchAppointments, fetchMedicalRecords]);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        fetchAppointments(),
        fetchMedicalRecords(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAppointments, fetchMedicalRecords]);

  const updateAppointmentLocally = useCallback(
    (appointmentId, updatedAppointment) => {
      if (!updatedAppointment) return;

      setAppointments((current) =>
        current.map((appointment) =>
          appointment._id === appointmentId
            ? { ...appointment, ...updatedAppointment }
            : appointment
        )
      );
    },
    []
  );

  const updateStatus = async (appointmentId, newStatus) => {
    if (updatingId || queueActionId) return;

    const confirmed =
      newStatus !== "Cancelled" ||
      window.confirm(
        "Cancel this appointment? This action will update the appointment status."
      );

    if (!confirmed) return;

    try {
      setUpdatingId(appointmentId);
      setError("");

      const token = getAdminToken();

      if (!token) return;

      const response = await axios.patch(
        `${API_BASE_URL}/api/appointments/${appointmentId}/status`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      updateAppointmentLocally(
        appointmentId,
        response.data.appointment
      );
    } catch (requestError) {
      console.error(
        "Error updating appointment:",
        requestError
      );

      if (handleUnauthorized(requestError)) return;

      setError(
        getErrorMessage(
          requestError,
          "Unable to update appointment status."
        )
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const performQueueAction = async (
    appointmentId,
    endpoint,
    errorMessage
  ) => {
    if (updatingId || queueActionId) return null;

    try {
      setQueueActionId(appointmentId);
      setError("");

      const token = getAdminToken();

      if (!token) return null;

      const response = await axios.patch(
        `${API_BASE_URL}/api/queue/${appointmentId}/${endpoint}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      updateAppointmentLocally(
        appointmentId,
        response.data.appointment
      );

      return response.data;
    } catch (requestError) {
      console.error(errorMessage, requestError);

      if (handleUnauthorized(requestError)) return null;

      setError(
        getErrorMessage(requestError, errorMessage)
      );

      return null;
    } finally {
      setQueueActionId(null);
    }
  };

  const handleGiveToken = async (appointmentId) => {
    await performQueueAction(
      appointmentId,
      "give-token",
      "Unable to generate the queue token."
    );
  };

  const handleCallToken = async (appointmentId) => {
    await performQueueAction(
      appointmentId,
      "call",
      "Unable to call this queue token."
    );
  };

  const handleCheckIn = async (appointmentId) => {
    const result = await performQueueAction(
      appointmentId,
      "check-in",
      "Unable to start the consultation."
    );

    if (result) {
      navigate("/admin/doctor-monitor");
    }
  };

  const handleComplete = async (appointmentId) => {
    await performQueueAction(
      appointmentId,
      "complete",
      "Unable to complete the consultation."
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("oraviaAdminToken");
    localStorage.removeItem("oraviaAdminUser");

    navigate("/admin/login", { replace: true });
  };

  const handleRecordChange = (event) => {
    const { name, value } = event.target;

    setRecordForm((current) => ({
      ...current,
      [name]: value,
    }));

    setRecordError("");
    setRecordSuccess("");
  };

  const handlePatientChange = (event) => {
    const patientId = event.target.value;

    setRecordForm((current) => ({
      ...current,
      patient: patientId,
      appointment: "",
      treatment: "",
      visitDate: "",
    }));

    setRecordError("");
    setRecordSuccess("");
  };

  const handleAppointmentChange = (event) => {
    const appointmentId = event.target.value;

    const appointment = appointments.find(
      (item) => item._id === appointmentId
    );

    setRecordForm((current) => ({
      ...current,
      appointment: appointmentId,
      patient: appointment
        ? getPatientId(appointment)
        : current.patient,
      treatment: appointment
        ? appointment.treatment || ""
        : current.treatment,
      visitDate: appointment
        ? getLocalDateInputValue(appointment.appointmentDate)
        : current.visitDate,
    }));

    setRecordError("");
    setRecordSuccess("");
  };

  const handleCreateRecord = async (event) => {
    event.preventDefault();

    setRecordError("");
    setRecordSuccess("");

    if (
      !recordForm.patient ||
      !recordForm.treatment.trim() ||
      !recordForm.visitDate
    ) {
      setRecordError(
        "Please select a patient and enter the treatment and visit date."
      );
      return;
    }

    if (savingRecord) return;

    try {
      setSavingRecord(true);

      const token = getAdminToken();

      if (!token) return;

      const payload = {
        ...recordForm,
        treatment: recordForm.treatment.trim(),
        dentalNotes: recordForm.dentalNotes.trim(),
        medications: recordForm.medications.trim(),
        prescription: recordForm.prescription.trim(),
        additionalNotes: recordForm.additionalNotes.trim(),
        appointment: recordForm.appointment || null,
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/medical-records`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.record) {
        setMedicalRecords((current) => [
          response.data.record,
          ...current,
        ]);
      } else {
        await fetchMedicalRecords();
      }

      setRecordSuccess(
        "Medical record saved successfully."
      );

      setRecordForm({ ...EMPTY_RECORD_FORM });
    } catch (requestError) {
      console.error(
        "Error creating medical record:",
        requestError
      );

      if (handleUnauthorized(requestError)) return;

      setRecordError(
        getErrorMessage(
          requestError,
          "Unable to save the medical record."
        )
      );
    } finally {
      setSavingRecord(false);
    }
  };

  const pendingCount = appointments.filter(
    (item) => item.status === "Pending"
  ).length;

  const confirmedCount = appointments.filter(
    (item) => item.status === "Confirmed"
  ).length;

  const completedCount = appointments.filter(
    (item) => item.status === "Completed"
  ).length;

  const cancelledCount = appointments.filter(
    (item) => item.status === "Cancelled"
  ).length;

  const waitingCount = appointments.filter(
    (item) =>
      item.status === "Confirmed" &&
      (item.queueStatus || "Waiting") === "Waiting"
  ).length;

  const uniquePatients = useMemo(() => {
    const patients = new Map();

    appointments.forEach((appointment) => {
      const patient = appointment.patient;

      if (
        patient &&
        typeof patient === "object" &&
        patient._id &&
        !patients.has(patient._id)
      ) {
        patients.set(patient._id, patient);
      }
    });

    return Array.from(patients.values()).sort((a, b) =>
      String(a.name || "").localeCompare(
        String(b.name || "")
      )
    );
  }, [appointments]);

  const completedAppointments = useMemo(
    () =>
      appointments.filter(
        (appointment) =>
          appointment.status === "Completed" &&
          getPatientId(appointment)
      ),
    [appointments]
  );

  const filteredAppointments = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return appointments
      .filter((appointment) => {
        const matchesStatus =
          statusFilter === "All" ||
          appointment.status === statusFilter;

        const matchesQueue =
          queueFilter === "All" ||
          (appointment.queueStatus || "Waiting") ===
            queueFilter;

        const searchableValues = [
          appointment.patientName,
          appointment.patient?.name,
          appointment.email,
          appointment.phone,
          appointment.treatment,
          appointment.symptoms,
          appointment.tokenNumber,
          appointment._id,
        ];

        const matchesSearch =
          !search ||
          searchableValues.some((value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(search)
          );

        return (
          matchesStatus &&
          matchesQueue &&
          matchesSearch
        );
      })
      .sort((a, b) => {
        const dateA = new Date(
          a.appointmentDate || 0
        ).getTime();

        const dateB = new Date(
          b.appointmentDate || 0
        ).getTime();

        if (dateA !== dateB) {
          return dateA - dateB;
        }

        return String(a.appointmentTime || "").localeCompare(
          String(b.appointmentTime || "")
        );
      });
  }, [
    appointments,
    searchTerm,
    statusFilter,
    queueFilter,
  ]);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <button
          type="button"
          className="admin-brand"
          onClick={() => navigate("/admin/dashboard")}
          aria-label="Open ORAVIA admin dashboard"
        >
          <span className="brand-mark">O</span>

          <span>
            <strong>ORAVIA</strong>
            <small>Clinic administration</small>
          </span>
        </button>

        <nav
          className="admin-header-actions"
          aria-label="Admin navigation"
        >
          <button
            type="button"
            className="admin-nav-button"
            onClick={() =>
              navigate("/admin/dashboard")
            }
          >
            Dashboard
          </button>

          <button
            type="button"
            className="admin-nav-button"
            onClick={() =>
              navigate("/admin/doctor-monitor")
            }
          >
            Doctor monitor
          </button>

          <button
            type="button"
            className="admin-nav-button"
            onClick={() => navigate("/admin/billing")}
          >
            Billing
          </button>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={refreshDashboard}
            disabled={refreshing}
          >
            <span aria-hidden="true">↻</span>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>

          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="admin-content">
        <section className="admin-welcome">
          <div>
            <p className="admin-eyebrow">
              CLINIC MANAGEMENT
            </p>

            <h1>Appointments &amp; patient care</h1>

            <p className="admin-subtitle">
              Manage bookings, coordinate the waiting
              queue, and maintain clinical records from
              one workspace.
            </p>
          </div>

          <div className="admin-date-card">
            <span
              className="admin-date-icon"
              aria-hidden="true"
            >
              ◷
            </span>

            <div>
              <span>Today</span>
              <strong>{formatToday()}</strong>
            </div>
          </div>
        </section>

        <section
          className="admin-summary-grid"
          aria-label="Appointment statistics"
        >
          <article className="admin-stat-card">
            <div className="admin-stat-top">
              <span>Total appointments</span>
              <span className="admin-stat-icon icon-green">
                ▤
              </span>
            </div>

            <strong>{appointments.length}</strong>
            <p>All bookings in the system</p>
          </article>

          <article className="admin-stat-card">
            <div className="admin-stat-top">
              <span>Pending</span>
              <span className="admin-stat-icon icon-amber">
                ◷
              </span>
            </div>

            <strong>{pendingCount}</strong>
            <p>Require staff attention</p>
          </article>

          <article className="admin-stat-card">
            <div className="admin-stat-top">
              <span>Confirmed</span>
              <span className="admin-stat-icon icon-blue">
                ✓
              </span>
            </div>

            <strong>{confirmedCount}</strong>
            <p>Accepted appointments</p>
          </article>

          <article className="admin-stat-card">
            <div className="admin-stat-top">
              <span>Completed</span>
              <span className="admin-stat-icon icon-green">
                ✦
              </span>
            </div>

            <strong>{completedCount}</strong>
            <p>Completed appointments</p>
          </article>

          <article className="admin-stat-card">
            <div className="admin-stat-top">
              <span>Cancelled</span>
              <span className="admin-stat-icon icon-red">
                ×
              </span>
            </div>

            <strong>{cancelledCount}</strong>
            <p>Cancelled bookings</p>
          </article>

          <article className="admin-stat-card">
            <div className="admin-stat-top">
              <span>Waiting queue</span>
              <span className="admin-stat-icon icon-amber">
                ◷
              </span>
            </div>

            <strong>{waitingCount}</strong>
            <p>Confirmed and awaiting their turn</p>
          </article>
        </section>

        {error && (
          <div
            className="admin-alert admin-alert-error"
            role="alert"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error message"
            >
              Dismiss
            </button>
          </div>
        )}

        <section
          className="admin-panel"
          id="appointments"
        >
          <div className="admin-panel-heading">
            <div>
              <p className="admin-eyebrow">
                SCHEDULE &amp; QUEUE
              </p>

              <h2>All appointments</h2>

              <p>
                Review bookings, check patient details,
                and manage appointment progress.
              </p>
            </div>

            <span className="admin-count-pill">
              {filteredAppointments.length} shown
            </span>
          </div>

          <div className="admin-toolbar">
            <label className="admin-search">
              <span aria-hidden="true">⌕</span>

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search patient, phone, treatment…"
                aria-label="Search appointments"
              />
            </label>

            <label className="admin-filter">
              <span>Appointment status</span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                {STATUS_OPTIONS.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-filter">
              <span>Queue status</span>

              <select
                value={queueFilter}
                onChange={(event) =>
                  setQueueFilter(event.target.value)
                }
              >
                {QUEUE_STATUS_OPTIONS.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div
              className="admin-state"
              role="status"
              aria-live="polite"
            >
              <span className="admin-spinner" />
              <p>Loading appointments…</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="admin-state">
              <span className="admin-empty-icon">
                ▤
              </span>

              <h3>No appointments yet</h3>

              <p>
                Patient bookings will appear here after an
                appointment is submitted.
              </p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="admin-state">
              <span className="admin-empty-icon">
                ⌕
              </span>

              <h3>No matching appointments</h3>

              <p>
                Try a different search term or change the
                appointment and queue filters.
              </p>

              <button
                type="button"
                className="admin-button admin-button-light"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("All");
                  setQueueFilter("All");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="admin-table-scroll">
              <table className="admin-appointments-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Contact</th>
                    <th>Treatment</th>
                    <th>Date &amp; time</th>
                    <th>Status</th>
                    <th>Queue</th>
                    <th>Manage</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAppointments.map(
                    (appointment) => {
                      const isQueueProcessing =
                        queueActionId === appointment._id;

                      const isStatusProcessing =
                        updatingId === appointment._id;

                      const queueStatus =
                        appointment.queueStatus || "Waiting";

                      const hasToken =
                        appointment.tokenNumber !== null &&
                        appointment.tokenNumber !== undefined &&
                        appointment.tokenNumber !== "";

                      const consultationStarted =
                        queueStatus === "In Consultation" ||
                        queueStatus === "Completed";

                      const canConfirm =
                        appointment.status === "Pending";

                      const canGiveToken =
                        appointment.status === "Confirmed" &&
                        !hasToken;

                      const canCallToken =
                        hasToken &&
                        queueStatus === "Waiting" &&
                        appointment.status === "Confirmed";

                      const canCheckIn =
                        hasToken &&
                        queueStatus === "Called" &&
                        appointment.status === "Confirmed";

                      const canComplete =
                        queueStatus === "In Consultation" &&
                        appointment.status === "Confirmed";

                      const canCancel =
                        appointment.status !== "Completed" &&
                        appointment.status !== "Cancelled" &&
                        !consultationStarted;

                      const noAvailableAction =
                        !canConfirm &&
                        !canGiveToken &&
                        !canCallToken &&
                        !canCheckIn &&
                        !canComplete &&
                        !canCancel;

                      return (
                        <tr key={appointment._id}>
                          <td>
                            <div className="admin-patient-cell">
                              <span className="admin-avatar">
                                {(
                                  appointment.patientName ||
                                  appointment.patient?.name ||
                                  "P"
                                )
                                  .trim()
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>

                              <div>
                                <strong>
                                  {appointment.patientName ||
                                    appointment.patient?.name ||
                                    "Patient"}
                                </strong>

                                <small>
                                  {appointment.patient?._id
                                    ? "Registered patient"
                                    : "Patient details"}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="admin-contact-cell">
                              <span>
                                {appointment.phone || "—"}
                              </span>

                              <small>
                                {appointment.email || "—"}
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="admin-treatment-cell">
                              <strong>
                                {appointment.treatment || "—"}
                              </strong>

                              {appointment.symptoms && (
                                <small
                                  title={appointment.symptoms}
                                >
                                  {appointment.symptoms}
                                </small>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="admin-date-cell">
                              <strong>
                                {formatDate(
                                  appointment.appointmentDate
                                )}
                              </strong>

                              <small>
                                {appointment.appointmentTime ||
                                  "Time not set"}
                              </small>
                            </div>
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                appointment.status || "Pending"
                              )}
                            >
                              {appointment.status || "Pending"}
                            </span>
                          </td>

                          <td>
                            <div className="admin-queue-cell">
                              {hasToken ? (
                                <>
                                  <strong>
                                    Token #{appointment.tokenNumber}
                                  </strong>

                                  <span
                                    className={getStatusClass(
                                      queueStatus
                                    )}
                                  >
                                    {queueStatus}
                                  </span>
                                </>
                              ) : (
                                <span className="admin-no-token">
                                  Not issued
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="admin-row-actions">
                              {canConfirm && (
                                <button
                                  type="button"
                                  className="admin-button admin-button-green"
                                  onClick={() =>
                                    updateStatus(
                                      appointment._id,
                                      "Confirmed"
                                    )
                                  }
                                  disabled={
                                    Boolean(updatingId) ||
                                    Boolean(queueActionId)
                                  }
                                >
                                  {isStatusProcessing
                                    ? "Updating…"
                                    : "Confirm"}
                                </button>
                              )}

                              {canGiveToken && (
                                <button
                                  type="button"
                                  className="admin-button admin-button-green"
                                  onClick={() =>
                                    handleGiveToken(
                                      appointment._id
                                    )
                                  }
                                  disabled={
                                    Boolean(updatingId) ||
                                    Boolean(queueActionId)
                                  }
                                >
                                  {isQueueProcessing
                                    ? "Processing…"
                                    : "Give token"}
                                </button>
                              )}

                              {canCallToken && (
                                <button
                                  type="button"
                                  className="admin-button admin-button-blue"
                                  onClick={() =>
                                    handleCallToken(
                                      appointment._id
                                    )
                                  }
                                  disabled={
                                    Boolean(updatingId) ||
                                    Boolean(queueActionId)
                                  }
                                >
                                  {isQueueProcessing
                                    ? "Processing…"
                                    : "Call token"}
                                </button>
                              )}

                              {canCheckIn && (
                                <button
                                  type="button"
                                  className="admin-button admin-button-green"
                                  onClick={() =>
                                    handleCheckIn(
                                      appointment._id
                                    )
                                  }
                                  disabled={
                                    Boolean(updatingId) ||
                                    Boolean(queueActionId)
                                  }
                                >
                                  {isQueueProcessing
                                    ? "Starting…"
                                    : "Check in"}
                                </button>
                              )}

                              {canComplete && (
                                <button
                                  type="button"
                                  className="admin-button admin-button-dark"
                                  onClick={() =>
                                    handleComplete(
                                      appointment._id
                                    )
                                  }
                                  disabled={
                                    Boolean(updatingId) ||
                                    Boolean(queueActionId)
                                  }
                                >
                                  {isQueueProcessing
                                    ? "Saving…"
                                    : "Complete"}
                                </button>
                              )}

                              {canCancel && (
                                <button
                                  type="button"
                                  className="admin-button admin-button-danger"
                                  onClick={() =>
                                    updateStatus(
                                      appointment._id,
                                      "Cancelled"
                                    )
                                  }
                                  disabled={
                                    Boolean(updatingId) ||
                                    Boolean(queueActionId)
                                  }
                                >
                                  Cancel
                                </button>
                              )}

                              {noAvailableAction && (
                                <span className="admin-action-done">
                                  {appointment.status ===
                                  "Cancelled"
                                    ? "Cancelled"
                                    : appointment.status ===
                                      "Completed"
                                    ? "Completed"
                                    : queueStatus ===
                                      "Skipped"
                                    ? "Skipped"
                                    : "In progress"}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-panel-footer">
            <span>
              Showing {filteredAppointments.length} of{" "}
              {appointments.length} appointments
            </span>

            <button
              type="button"
              className="admin-text-button"
              onClick={refreshDashboard}
              disabled={refreshing}
            >
              Refresh list ↻
            </button>
          </div>
        </section>

        <section
          className="admin-clinical-section"
          id="medical-records"
        >
          <div className="admin-panel-heading">
            <div>
              <p className="admin-eyebrow">
                CLINICAL CARE
              </p>

              <h2>Medical records</h2>

              <p>
                Create and review clinical notes for the
                appropriate patient.
              </p>
            </div>

            <span className="admin-count-pill">
              {medicalRecords.length} records
            </span>
          </div>

          <div className="admin-record-layout">
            <section className="admin-record-form-card">
              <div className="admin-record-form-heading">
                <span className="admin-record-icon">
                  ✚
                </span>

                <div>
                  <h3>Create a medical record</h3>

                  <p>
                    Enter the clinical information associated
                    with the visit.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleCreateRecord}
                className="admin-record-form"
              >
                <div className="admin-form-grid">
                  <div className="admin-field">
                    <label htmlFor="recordPatient">
                      Patient *
                    </label>

                    <select
                      id="recordPatient"
                      name="patient"
                      value={recordForm.patient}
                      onChange={handlePatientChange}
                      required
                    >
                      <option value="">
                        Select a patient
                      </option>

                      {uniquePatients.map((patient) => (
                        <option
                          key={patient._id}
                          value={patient._id}
                        >
                          {patient.name || "Patient"}
                          {patient.email
                            ? ` — ${patient.email}`
                            : ""}
                        </option>
                      ))}
                    </select>

                    {uniquePatients.length === 0 && (
                      <small>
                        Registered patients will be available
                        after their appointments are loaded.
                      </small>
                    )}
                  </div>

                  <div className="admin-field">
                    <label htmlFor="recordAppointment">
                      Completed appointment
                    </label>

                    <select
                      id="recordAppointment"
                      name="appointment"
                      value={recordForm.appointment}
                      onChange={handleAppointmentChange}
                    >
                      <option value="">
                        Select an appointment (optional)
                      </option>

                      {completedAppointments
                        .filter(
                          (appointment) =>
                            !recordForm.patient ||
                            getPatientId(appointment) ===
                              recordForm.patient
                        )
                        .map((appointment) => (
                          <option
                            key={appointment._id}
                            value={appointment._id}
                          >
                            {appointment.patientName ||
                              "Patient"}{" "}
                            — {appointment.treatment} —{" "}
                            {formatDate(
                              appointment.appointmentDate
                            )}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="admin-field">
                    <label htmlFor="recordTreatment">
                      Treatment performed *
                    </label>

                    <input
                      id="recordTreatment"
                      name="treatment"
                      value={recordForm.treatment}
                      onChange={handleRecordChange}
                      placeholder="e.g. Dental cleaning"
                      maxLength={120}
                      required
                    />
                  </div>

                  <div className="admin-field">
                    <label htmlFor="recordVisitDate">
                      Visit date *
                    </label>

                    <input
                      id="recordVisitDate"
                      name="visitDate"
                      type="date"
                      value={recordForm.visitDate}
                      onChange={handleRecordChange}
                      required
                    />
                  </div>
                </div>

                <div className="admin-field">
                  <label htmlFor="dentalNotes">
                    Dental notes
                  </label>

                  <textarea
                    id="dentalNotes"
                    name="dentalNotes"
                    rows={3}
                    maxLength={5000}
                    value={recordForm.dentalNotes}
                    onChange={handleRecordChange}
                    placeholder="Clinical observations and treatment details…"
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="medications">
                    Medications
                  </label>

                  <textarea
                    id="medications"
                    name="medications"
                    rows={2}
                    maxLength={3000}
                    value={recordForm.medications}
                    onChange={handleRecordChange}
                    placeholder="Medication details, if applicable…"
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="prescription">
                    Prescription
                  </label>

                  <textarea
                    id="prescription"
                    name="prescription"
                    rows={2}
                    maxLength={3000}
                    value={recordForm.prescription}
                    onChange={handleRecordChange}
                    placeholder="Prescription and dosage instructions…"
                  />
                </div>

                <div className="admin-field">
                  <label htmlFor="additionalNotes">
                    Additional notes
                  </label>

                  <textarea
                    id="additionalNotes"
                    name="additionalNotes"
                    rows={2}
                    maxLength={3000}
                    value={recordForm.additionalNotes}
                    onChange={handleRecordChange}
                    placeholder="Follow-up advice or other relevant notes…"
                  />
                </div>

                {recordError && (
                  <div
                    className="admin-alert admin-alert-error"
                    role="alert"
                  >
                    {recordError}
                  </div>
                )}

                {recordSuccess && (
                  <div
                    className="admin-alert admin-alert-success"
                    role="status"
                    aria-live="polite"
                  >
                    {recordSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  className="admin-button admin-button-green admin-save-record"
                  disabled={savingRecord}
                >
                  {savingRecord
                    ? "Saving record…"
                    : "Save medical record →"}
                </button>
              </form>
            </section>

            <section className="admin-record-history">
              <div className="admin-history-heading">
                <div>
                  <h3>Clinical history</h3>

                  <p>
                    Previously recorded patient visits
                  </p>
                </div>
              </div>

              {recordsLoading ? (
                <div
                  className="admin-state admin-state-compact"
                  role="status"
                >
                  <span className="admin-spinner" />
                  <p>Loading medical records…</p>
                </div>
              ) : medicalRecords.length === 0 ? (
                <div className="admin-state admin-state-compact">
                  <span className="admin-empty-icon">
                    ▤
                  </span>

                  <h3>No records available</h3>

                  <p>
                    Saved clinical records will appear here.
                  </p>
                </div>
              ) : (
                <div className="admin-record-list">
                  {medicalRecords.map((record) => (
                    <article
                      className="admin-record-item"
                      key={record._id}
                    >
                      <div className="admin-record-item-top">
                        <span className="admin-record-icon">
                          ✚
                        </span>

                        <span className="admin-record-date">
                          {formatDate(record.visitDate)}
                        </span>
                      </div>

                      <h4>
                        {record.treatment || "Clinical visit"}
                      </h4>

                      <p className="admin-record-patient">
                        {record.patient?.name || "Patient"}
                      </p>

                      {record.dentalNotes && (
                        <div className="admin-record-detail">
                          <strong>Dental notes</strong>
                          <p>{record.dentalNotes}</p>
                        </div>
                      )}

                      {record.medications && (
                        <div className="admin-record-detail">
                          <strong>Medications</strong>
                          <p>{record.medications}</p>
                        </div>
                      )}

                      {record.prescription && (
                        <div className="admin-record-detail">
                          <strong>Prescription</strong>
                          <p>{record.prescription}</p>
                        </div>
                      )}

                      {record.additionalNotes && (
                        <div className="admin-record-detail">
                          <strong>Additional notes</strong>
                          <p>{record.additionalNotes}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {recordError && medicalRecords.length > 0 && (
                <div
                  className="admin-alert admin-alert-error"
                  role="alert"
                >
                  {recordError}
                </div>
              )}
            </section>
          </div>
        </section>

        <footer className="admin-footer">
          <span>
            ORAVIA · Dental Clinic Management
          </span>

          <span>
            Authorized clinic staff workspace
          </span>
        </footer>
      </main>
    </div>
  );
}

export default AdminAppointments;
