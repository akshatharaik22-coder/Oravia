import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api.js";
import "./DoctorMonitor.css";

const API_BASE = `${API_BASE_URL}/api`;
const POLLING_INTERVAL = 5000;

const EMPTY_FORM = {
  treatment: "",
  visitDate: "",
  dentalNotes: "",
  medications: "",
  prescription: "",
  additionalNotes: "",
};

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";

  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPatientName(appointment) {
  return (
    appointment?.patient?.name ||
    appointment?.patientName ||
    "Patient"
  );
}

function createInitialForm(appointment = null) {
  return {
    ...EMPTY_FORM,
    treatment: appointment?.treatment || "",
    visitDate: getLocalDate(),
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function DoctorMonitor() {
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState(() =>
    createInitialForm()
  );

  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const requestInProgress = useRef(false);
  const activeAppointmentId = useRef(null);
  const isMounted = useRef(false);
  const actionInProgress = useRef(false);
  const formDirtyRef = useRef(false);
  const currentAppointmentRef = useRef(null);
  const pendingAppointmentRef = useRef(null);
  const formDataRef = useRef(formData);
  const savedRecordRef = useRef(null);
  const hasUnsavedChangesRef = useRef(false);

  const updateFormData = useCallback((nextForm) => {
    formDataRef.current = nextForm;
    setFormData(nextForm);
  }, []);

  const updateSavedRecord = useCallback((record) => {
    savedRecordRef.current = record;
    setSavedRecord(record);
  }, []);

  const updateDirtyState = useCallback((dirty) => {
    formDirtyRef.current = dirty;
    hasUnsavedChangesRef.current = dirty;
    setHasUnsavedChanges(dirty);
  }, []);

  const getAdminToken = useCallback(() => {
    const token = localStorage.getItem("oraviaAdminToken");

    if (!token) {
      localStorage.removeItem("oraviaAdminUser");
      navigate("/admin/login", { replace: true });

      throw new Error(
        "Your admin session has expired. Please sign in again."
      );
    }

    return token;
  }, [navigate]);

  /**
   * Only a 401 should clear the current session.
   * A 403 means the request is forbidden, not necessarily that
   * the administrator's session has expired.
   */
  const handleUnauthorized = useCallback(
    (status) => {
      if (status === 401) {
        localStorage.removeItem("oraviaAdminToken");
        localStorage.removeItem("oraviaAdminUser");

        navigate("/admin/login", { replace: true });

        return true;
      }

      return false;
    },
    [navigate]
  );

  /**
   * Apply a newly detected appointment.
   *
   * If the clinician has unsaved changes, do not silently replace
   * the current form. Keep the current patient visible and ask the
   * clinician to resolve the unsaved work first.
   */
  const applyAppointment = useCallback(
    (nextAppointment, options = {}) => {
      const { force = false } = options;
      const nextId = nextAppointment?._id || null;
      const currentId = activeAppointmentId.current;

      if (currentId === nextId) {
        currentAppointmentRef.current = nextAppointment;
        setAppointment(nextAppointment);
        return true;
      }

      if (
        !force &&
        currentId &&
        formDirtyRef.current
      ) {
        pendingAppointmentRef.current = nextAppointment;

        setError(
          nextAppointment
            ? "Another patient is now active in the queue. Save or discard your current unsaved changes before switching patients."
            : "The active consultation is no longer available. Save or discard your unsaved changes before clearing this patient's record."
        );

        return false;
      }

      activeAppointmentId.current = nextId;
      currentAppointmentRef.current = nextAppointment;
      pendingAppointmentRef.current = null;

      setAppointment(nextAppointment);

      updateSavedRecord(null);
      updateDirtyState(false);
      updateFormData(createInitialForm(nextAppointment));

      setMessage("");
      setError("");

      return true;
    },
    [updateDirtyState, updateFormData, updateSavedRecord]
  );

  const fetchCurrentPatient = useCallback(async () => {
    if (
      requestInProgress.current ||
      !isMounted.current
    ) {
      return;
    }

    requestInProgress.current = true;

    try {
      const token = getAdminToken();

      const response = await fetch(
        `${API_BASE}/queue/doctor/current`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (handleUnauthorized(response.status)) {
          throw new Error(
            "Admin session expired. Redirecting to login."
          );
        }

        throw new Error(
          data.message ||
            (response.status === 403
              ? "You do not have permission to access the doctor queue."
              : "Unable to load the current patient.")
        );
      }

      if (!isMounted.current) return;

      const nextAppointment = data.appointment || null;

      applyAppointment(nextAppointment);

      setLastUpdated(new Date());
      setConnectionError("");
    } catch (fetchError) {
      if (!isMounted.current) return;

      setConnectionError(
        fetchError.message ||
          "Unable to connect to the clinic queue."
      );
    } finally {
      requestInProgress.current = false;

      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [
    applyAppointment,
    getAdminToken,
    handleUnauthorized,
  ]);

  useEffect(() => {
    isMounted.current = true;

    fetchCurrentPatient();

    const interval = window.setInterval(() => {
      fetchCurrentPatient();
    }, POLLING_INTERVAL);

    return () => {
      isMounted.current = false;
      window.clearInterval(interval);
    };
  }, [fetchCurrentPatient]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    const nextForm = {
      ...formDataRef.current,
      [name]: value,
    };

    updateFormData(nextForm);
    updateDirtyState(true);

    // Any change means the previously saved record no longer
    // represents the exact contents currently displayed.
    updateSavedRecord(null);

    setMessage("");
    setError("");
  };

  const discardUnsavedChanges = () => {
    const confirmed = window.confirm(
      "Discard your unsaved clinical notes and switch to the newly detected queue state?"
    );

    if (!confirmed) return;

    const nextAppointment = pendingAppointmentRef.current;

    applyAppointment(nextAppointment, { force: true });

    setConnectionError("");
  };

  const saveMedicalRecord = async () => {
    const currentAppointment = currentAppointmentRef.current;
    const currentForm = formDataRef.current;

    if (!currentAppointment?._id) {
      setError("There is no active appointment.");
      return;
    }

    if (!currentAppointment?.patient?._id) {
      setError(
        "This appointment is not linked to a patient account. Please check the patient record."
      );
      return;
    }

    if (!currentForm.treatment.trim()) {
      setError("Please enter the treatment performed.");
      return;
    }

    if (!currentForm.visitDate) {
      setError("Please select the visit date.");
      return;
    }

    if (saving || completing || actionInProgress.current) {
      return;
    }

    const appointmentIdAtSave = currentAppointment._id;

    actionInProgress.current = true;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const token = getAdminToken();

      const response = await fetch(
        `${API_BASE}/medical-records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            patient: currentAppointment.patient._id,
            appointment: appointmentIdAtSave,
            treatment: currentForm.treatment.trim(),
            visitDate: currentForm.visitDate,
            dentalNotes: currentForm.dentalNotes.trim(),
            medications: currentForm.medications.trim(),
            prescription: currentForm.prescription.trim(),
            additionalNotes: currentForm.additionalNotes.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (handleUnauthorized(response.status)) {
          throw new Error(
            "Admin session expired. Please sign in again."
          );
        }

        throw new Error(
          data.message ||
            (response.status === 403
              ? "You do not have permission to save medical records."
              : "Failed to save the medical record.")
        );
      }

      if (!isMounted.current) return;

      if (!data.record) {
        throw new Error(
          "The server did not return the saved record. Verify the medical records before retrying."
        );
      }

      // Never attach a saved record to a different patient if
      // the active appointment changed while the request was running.
      if (
        currentAppointmentRef.current?._id !==
        appointmentIdAtSave
      ) {
        setError(
          "The record was saved for the original appointment, but the active patient has changed. Verify the saved record before continuing."
        );

        return;
      }

      updateSavedRecord(data.record);
      updateDirtyState(false);

      setMessage(
        data.prescriptionEmailSent
          ? "Medical record saved. Prescription email sent successfully."
          : data.prescriptionEmailWarning
            ? `Medical record saved. ${data.prescriptionEmailWarning}`
            : "Medical record saved successfully."
      );

      setError("");
    } catch (saveError) {
      if (isMounted.current) {
        setError(
          saveError.message ||
            "Failed to save the medical record."
        );
      }
    } finally {
      actionInProgress.current = false;

      if (isMounted.current) {
        setSaving(false);
      }
    }
  };

  const printPrescription = () => {
    if (!savedRecord) {
      setError("Save the medical record before printing.");
      return;
    }

    if (hasUnsavedChangesRef.current) {
      setError(
        "You have unsaved changes. Save the updated medical record before printing."
      );
      return;
    }

    const patientName = getPatientName(
      currentAppointmentRef.current
    );

    const visitDate = formatDate(savedRecord.visitDate);

    const printWindow = window.open(
      "",
      "_blank",
      "width=900,height=750"
    );

    if (!printWindow) {
      setError(
        "The print window was blocked. Allow pop-ups for ORAVIA and try again."
      );
      return;
    }

    const medications =
      savedRecord.medications || "None recorded";

    const prescription =
      savedRecord.prescription ||
      "No prescription instructions recorded";

    const dentalNotes =
      savedRecord.dentalNotes || "None recorded";

    const additionalNotes =
      savedRecord.additionalNotes || "None recorded";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>ORAVIA Dental Prescription</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              max-width: 760px;
              margin: 40px auto;
              padding: 24px;
              color: #253b31;
              font-family: Arial, sans-serif;
              line-height: 1.65;
            }

            header {
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 3px solid #244d3b;
            }

            h1 {
              margin: 0;
              color: #244d3b;
              letter-spacing: 2px;
            }

            h2 {
              margin-top: 26px;
              color: #244d3b;
              font-size: 17px;
            }

            .muted {
              color: #65736a;
            }

            .field {
              margin: 12px 0;
            }

            .content {
              white-space: pre-wrap;
              overflow-wrap: anywhere;
            }

            footer {
              margin-top: 48px;
              padding-top: 12px;
              border-top: 1px solid #d6ded8;
              font-size: 12px;
            }

            @media print {
              body {
                margin: 0 auto;
                padding: 12px;
              }
            }
          </style>
        </head>

        <body>
          <header>
            <h1>ORAVIA</h1>
            <div>Dental Clinic</div>
            <h2>Dental Prescription</h2>
            <div class="muted">
              Generated from the saved clinical record
            </div>
          </header>

          <div class="field">
            <strong>Patient:</strong>
            ${escapeHtml(patientName)}
          </div>

          <div class="field">
            <strong>Treatment:</strong>
            ${escapeHtml(savedRecord.treatment || "—")}
          </div>

          <div class="field">
            <strong>Visit date:</strong>
            ${escapeHtml(visitDate)}
          </div>

          <h2>Medications</h2>
          <div class="content">${escapeHtml(medications)}</div>

          <h2>Prescription Instructions</h2>
          <div class="content">${escapeHtml(prescription)}</div>

          <h2>Dental Notes</h2>
          <div class="content">${escapeHtml(dentalNotes)}</div>

          <h2>Additional Clinical Notes</h2>
          <div class="content">${escapeHtml(additionalNotes)}</div>

          <footer>
            ORAVIA Dental Clinic — Follow the instructions provided
            by your treating dentist.
          </footer>

          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const completeConsultation = async () => {
    const currentAppointment = currentAppointmentRef.current;

    if (
      !currentAppointment?._id ||
      completing ||
      saving ||
      actionInProgress.current
    ) {
      return;
    }

    if (!savedRecord || hasUnsavedChangesRef.current) {
      setError(
        "Save the latest medical record before completing the consultation."
      );
      return;
    }

    const confirmed = window.confirm(
      "Have you completed the consultation and verified the patient's medical record?"
    );

    if (!confirmed) return;

    const appointmentIdAtCompletion = currentAppointment._id;

    actionInProgress.current = true;
    setCompleting(true);
    setMessage("");
    setError("");

    try {
      const token = getAdminToken();

      const response = await fetch(
        `${API_BASE}/queue/${appointmentIdAtCompletion}/complete`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (handleUnauthorized(response.status)) {
          throw new Error(
            "Admin session expired. Please sign in again."
          );
        }

        throw new Error(
          data.message ||
            (response.status === 403
              ? "You do not have permission to complete this consultation."
              : "Failed to complete the consultation.")
        );
      }

      if (!isMounted.current) return;

      // Clear the completed consultation and its form only after
      // the backend confirms successful completion.
      activeAppointmentId.current = null;
      currentAppointmentRef.current = null;
      pendingAppointmentRef.current = null;

      setAppointment(null);

      updateSavedRecord(null);
      updateDirtyState(false);
      updateFormData(createInitialForm());

      setMessage("Consultation completed successfully.");
      setError("");

      // Release the request guard before refreshing the queue.
      actionInProgress.current = false;

      await fetchCurrentPatient();
    } catch (completeError) {
      if (isMounted.current) {
        setError(
          completeError.message ||
            "Failed to complete the consultation."
        );
      }
    } finally {
      actionInProgress.current = false;

      if (isMounted.current) {
        setCompleting(false);
      }
    }
  };

  const refreshDisabled = saving || completing;

  if (loading) {
    return (
      <main className="doctor-monitor-page">
        <div className="doctor-monitor-container">
          <section className="doctor-loading-card">
            <span className="doctor-spinner" />

            <h2>Loading Doctor Monitor</h2>

            <p>Connecting to the clinical queue...</p>
          </section>
        </div>
      </main>
    );
  }

  const displayedPatientName = getPatientName(appointment);

  const hasPendingAppointment =
    pendingAppointmentRef.current !== null ||
    (appointment &&
      pendingAppointmentRef.current === null &&
      error.includes("Another patient is now active"));

  return (
    <main className="doctor-monitor-page">
      <div className="doctor-monitor-container">
        <header className="doctor-monitor-header">
          <div className="doctor-header-copy">
            <div className="doctor-brand-mark">O</div>

            <div>
              <p className="doctor-monitor-label">
                ORAVIA / CLINICAL WORKSPACE
              </p>

              <h1>Doctor Monitor</h1>

              <p className="doctor-header-description">
                Manage the active consultation and maintain accurate
                clinical records.
              </p>
            </div>
          </div>

          <div
            className={`monitor-status ${
              connectionError ? "monitor-status-offline" : ""
            }`}
          >
            <span className="status-dot" />

            {connectionError
              ? "Connection issue"
              : "Queue monitoring"}
          </div>
        </header>

        <section className="doctor-overview-strip">
          <div>
            <span className="overview-label">WORKSPACE</span>

            <strong>Clinical consultation</strong>
          </div>

          <div>
            <span className="overview-label">QUEUE STATUS</span>

            <strong>
              {connectionError
                ? "Reconnecting"
                : appointment
                  ? "Patient in consultation"
                  : "Waiting for patient"}
            </strong>
          </div>

          <div>
            <span className="overview-label">LAST SYNC</span>

            <strong>
              {lastUpdated
                ? lastUpdated.toLocaleTimeString("en-IN")
                : "Not synced"}
            </strong>
          </div>

          <button
            type="button"
            className="doctor-refresh-button"
            onClick={fetchCurrentPatient}
            disabled={refreshDisabled}
          >
            ↻ Refresh
          </button>
        </section>

        {connectionError && (
          <div
            className="doctor-message doctor-error"
            role="alert"
          >
            <div>
              <strong>Unable to update the queue</strong>

              <p>{connectionError}</p>
            </div>

            <button
              type="button"
              className="doctor-message-action"
              onClick={fetchCurrentPatient}
              disabled={refreshDisabled}
            >
              Retry connection
            </button>
          </div>
        )}

        {error && (
          <div
            className="doctor-message doctor-error"
            role="alert"
          >
            <span className="message-symbol">!</span>

            <p>{error}</p>

            {hasPendingAppointment && (
              <button
                type="button"
                className="doctor-message-action"
                onClick={discardUnsavedChanges}
                disabled={saving || completing}
              >
                Discard notes and switch
              </button>
            )}

            <button
              type="button"
              className="message-dismiss"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div
            className="doctor-message doctor-success"
            role="status"
          >
            <span className="message-symbol">✓</span>

            <p>{message}</p>

            <button
              type="button"
              className="message-dismiss"
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {appointment ? (
          <>
            <section className="current-patient-card">
              <div className="patient-token-section">
                <span className="token-eyebrow">
                  NOW SERVING
                </span>

                <strong className="patient-token-number">
                  #{appointment.tokenNumber ?? "—"}
                </strong>

                <span className="consultation-status-badge">
                  <span />
                  In consultation
                </span>

                <div className="token-divider" />

                <span className="token-caption">
                  Active queue token
                </span>
              </div>

              <div className="patient-information">
                <div className="patient-heading">
                  <div
                    className="patient-avatar"
                    aria-hidden="true"
                  >
                    {displayedPatientName
                      .trim()
                      .charAt(0)
                      .toUpperCase() || "P"}
                  </div>

                  <div className="patient-heading-copy">
                    <span className="info-label">
                      CURRENT PATIENT
                    </span>

                    <h2>{displayedPatientName}</h2>

                    <p>
                      Review the appointment details before
                      recording the consultation.
                    </p>
                  </div>
                </div>

                <div className="patient-details-grid">
                  <div className="detail-box">
                    <span className="info-label">
                      TREATMENT REQUESTED
                    </span>

                    <strong>
                      {appointment.treatment || "—"}
                    </strong>
                  </div>

                  <div className="detail-box">
                    <span className="info-label">
                      APPOINTMENT DATE
                    </span>

                    <strong>
                      {formatDate(appointment.appointmentDate)}
                    </strong>
                  </div>

                  <div className="detail-box">
                    <span className="info-label">
                      APPOINTMENT TIME
                    </span>

                    <strong>
                      {appointment.appointmentTime || "—"}
                    </strong>
                  </div>

                  <div className="detail-box">
                    <span className="info-label">CONTACT</span>

                    <strong>
                      {appointment.patient?.phone ||
                        appointment.phone ||
                        "—"}
                    </strong>
                  </div>
                </div>

                <div className="symptoms-section">
                  <div className="section-title-row">
                    <span className="section-marker" />

                    <span className="info-label">
                      PATIENT COMPLAINT / SYMPTOMS
                    </span>
                  </div>

                  <div className="symptoms-box">
                    {appointment.symptoms?.trim() ||
                      "No symptoms or complaint provided."}
                  </div>
                </div>
              </div>
            </section>

            <section className="medical-record-section">
              <div className="medical-record-heading">
                <div>
                  <span className="doctor-section-eyebrow">
                    CLINICAL DOCUMENTATION
                  </span>

                  <h2>Consultation record</h2>

                  <p>
                    Record the treatment and clinical instructions
                    for this visit.
                  </p>
                </div>

                <span className="record-status-pill">
                  {savedRecord && !hasUnsavedChanges
                    ? "Record saved"
                    : hasUnsavedChanges
                      ? "Unsaved changes"
                      : "Not saved"}
                </span>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  saveMedicalRecord();
                }}
              >
                <div className="record-form-grid">
                  <div className="form-group">
                    <label htmlFor="treatment">
                      Treatment performed <span>*</span>
                    </label>

                    <input
                      id="treatment"
                      name="treatment"
                      type="text"
                      value={formData.treatment}
                      onChange={handleChange}
                      placeholder="e.g. Dental examination"
                      maxLength={200}
                      required
                      disabled={saving || completing}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="visitDate">
                      Visit date <span>*</span>
                    </label>

                    <input
                      id="visitDate"
                      name="visitDate"
                      type="date"
                      value={formData.visitDate}
                      onChange={handleChange}
                      required
                      disabled={saving || completing}
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label htmlFor="dentalNotes">
                      Dental examination notes
                    </label>

                    <textarea
                      id="dentalNotes"
                      name="dentalNotes"
                      value={formData.dentalNotes}
                      onChange={handleChange}
                      placeholder="Enter examination findings and clinical observations..."
                      rows={4}
                      maxLength={5000}
                      disabled={saving || completing}
                    />

                    <span className="field-helper">
                      Document relevant findings from the examination.
                    </span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="medications">
                      Medications
                    </label>

                    <textarea
                      id="medications"
                      name="medications"
                      value={formData.medications}
                      onChange={handleChange}
                      placeholder="Enter prescribed medications..."
                      rows={4}
                      maxLength={3000}
                      disabled={saving || completing}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="prescription">
                      Prescription instructions
                    </label>

                    <textarea
                      id="prescription"
                      name="prescription"
                      value={formData.prescription}
                      onChange={handleChange}
                      placeholder="Enter dosage and instructions as prescribed..."
                      rows={4}
                      maxLength={5000}
                      disabled={saving || completing}
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label htmlFor="additionalNotes">
                      Additional clinical notes
                    </label>

                    <textarea
                      id="additionalNotes"
                      name="additionalNotes"
                      value={formData.additionalNotes}
                      onChange={handleChange}
                      placeholder="Add follow-up recommendations or other relevant clinical details..."
                      rows={3}
                      maxLength={5000}
                      disabled={saving || completing}
                    />
                  </div>
                </div>

                <div className="record-form-footer">
                  <p>
                    <span>*</span> Required fields
                  </p>

                  <div className="medical-record-actions">
                    <button
                      type="submit"
                      className="save-record-button"
                      disabled={saving || completing}
                    >
                      {saving ? (
                        <>
                          <span className="button-spinner" />
                          Saving record...
                        </>
                      ) : (
                        "Save medical record"
                      )}
                    </button>

                    <button
                      type="button"
                      className="print-prescription-button"
                      onClick={printPrescription}
                      disabled={
                        !savedRecord ||
                        hasUnsavedChanges ||
                        saving ||
                        completing
                      }
                    >
                      Print prescription
                    </button>

                    <button
                      type="button"
                      className="complete-consultation-button"
                      onClick={completeConsultation}
                      disabled={
                        completing ||
                        saving ||
                        !savedRecord ||
                        hasUnsavedChanges
                      }
                      title={
                        hasUnsavedChanges
                          ? "Save the latest changes before completing"
                          : !savedRecord
                            ? "Save the medical record before completing"
                            : "Complete this consultation"
                      }
                    >
                      {completing
                        ? "Completing..."
                        : "Complete consultation"}
                    </button>
                  </div>
                </div>

                {hasUnsavedChanges && (
                  <p
                    className="unsaved-record-note"
                    role="status"
                  >
                    Your latest edits have not been saved. Save
                    them before printing or completing this
                    consultation.
                  </p>
                )}

                {!savedRecord && !hasUnsavedChanges && (
                  <p className="unsaved-record-note">
                    Save the medical record before completing
                    the consultation or printing the prescription.
                  </p>
                )}
              </form>
            </section>
          </>
        ) : (
          <section className="empty-doctor-state">
            <div
              className="empty-monitor-icon"
              aria-hidden="true"
            >
              <span>+</span>
            </div>

            <span className="doctor-section-eyebrow">
              CLINICAL QUEUE
            </span>

            <h2>No active consultation</h2>

            <p>
              When a patient is called and their consultation
              begins, their token and appointment details will
              appear here.
            </p>

            <button
              type="button"
              className="save-record-button"
              onClick={fetchCurrentPatient}
              disabled={refreshDisabled}
            >
              Refresh monitor
            </button>
          </section>
        )}

        <footer className="doctor-monitor-footer">
          <div>
            <span className="footer-brand-mark">O</span>

            <div>
              <strong>ORAVIA</strong>
              <span>Clinical workspace</span>
            </div>
          </div>

          <span>
            {lastUpdated
              ? `Last synchronized at ${lastUpdated.toLocaleTimeString(
                  "en-IN"
                )}`
              : "Waiting for synchronization"}
          </span>
        </footer>
      </div>
    </main>
  );
}

export default DoctorMonitor;