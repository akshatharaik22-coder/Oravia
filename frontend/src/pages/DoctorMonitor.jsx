
import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = "http://localhost:5000/api";

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

function DoctorMonitor() {
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    ...EMPTY_FORM,
    visitDate: getLocalDate(),
  });

  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);

  const requestInProgress = useRef(false);
  const activeAppointmentId = useRef(null);
  const isMounted = useRef(true);

  const getAdminToken = () => {
    const token = localStorage.getItem("oraviaAdminToken");

    if (!token) {
      throw new Error(
        "Your admin session is missing. Please sign in again."
      );
    }

    return token;
  };

  const fetchCurrentPatient = useCallback(async () => {
    if (requestInProgress.current) return;

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

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            "Your admin session has expired or is not authorized. Please sign in again."
          );
        }

        throw new Error(
          data.message || "Failed to fetch the current patient."
        );
      }

      if (!isMounted.current) return;

      const nextAppointment = data.appointment || null;
      const nextId = nextAppointment?._id || null;

      setAppointment(nextAppointment);
      activeAppointmentId.current = nextId;
      setLastUpdated(new Date());
      setConnectionError("");
    } catch (fetchError) {
      if (!isMounted.current) return;

      console.error("Doctor monitor fetch error:", fetchError);

      setConnectionError(
        fetchError.message || "Unable to connect to the clinic queue."
      );
    } finally {
      requestInProgress.current = false;

      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    fetchCurrentPatient();

    const interval = setInterval(() => {
      fetchCurrentPatient();
    }, 3000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchCurrentPatient]);

  useEffect(() => {
    if (!appointment) {
      setFormData({
        ...EMPTY_FORM,
        visitDate: getLocalDate(),
      });
      return;
    }

    setFormData({
      ...EMPTY_FORM,
      treatment: appointment.treatment || "",
      visitDate: getLocalDate(),
    });

    setMessage("");
    setError("");
  }, [appointment?._id]);

  const handleChange = (event) => {
  const { name, value } = event.target;

  setFormData((previous) => ({
    ...previous,
    [name]: value,
  }));

  // Any subsequent edits must be saved before printing.
  setSavedRecord(null);
};

  const saveMedicalRecord = async () => {
    if (!appointment?.patient?._id) {
      setError(
        "This appointment is not linked to a patient account. Please check the appointment's patient record."
      );
      return;
    }

    if (!formData.treatment.trim()) {
      setError("Please enter the treatment performed.");
      return;
    }

    if (!formData.visitDate) {
      setError("Please select the visit date.");
      return;
    }

    if (saving || completing) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const token = getAdminToken();

      const response = await fetch(`${API_BASE}/medical-records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patient: appointment.patient._id,
          appointment: appointment._id,
          treatment: formData.treatment.trim(),
          visitDate: formData.visitDate,
          dentalNotes: formData.dentalNotes.trim(),
          medications: formData.medications.trim(),
          prescription: formData.prescription.trim(),
          additionalNotes: formData.additionalNotes.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save the medical record."
        );
      }

      setSavedRecord(data.record || null);

setMessage(
  data.prescriptionEmailSent
    ? "Medical record saved. Prescription email sent successfully."
    : data.prescriptionEmailWarning
      ? `Medical record saved. ${data.prescriptionEmailWarning}`
      : "Medical record saved successfully."
);

setError("");
    } catch (saveError) {
      console.error("Medical record save error:", saveError);

      setError(
        saveError.message || "Failed to save the medical record."
      );
    } finally {
      setSaving(false);
    }
  };
  const printPrescription = () => {
  if (!savedRecord) {
    setError("Save the medical record before printing.");
    return;
  }

  const escapeHtml = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const patientName =
    appointment?.patient?.name ||
    appointment?.patientName ||
    "Patient";

  const visitDate = savedRecord.visitDate
    ? formatDate(savedRecord.visitDate)
    : "—";

  const medications = savedRecord.medications || "None recorded";
  const prescription =
    savedRecord.prescription || "No prescription instructions recorded";

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

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>ORAVIA Dental Prescription</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 760px;
            margin: 40px auto;
            padding: 24px;
            color: #263238;
            line-height: 1.6;
          }

          header {
            border-bottom: 3px solid #0f766e;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }

          h1 { margin: 0; color: #0f766e; }
          h2 { margin-top: 28px; }
          .muted { color: #5b6770; }
          .field { margin: 12px 0; }
          .content { white-space: pre-wrap; }
          footer {
            margin-top: 48px;
            border-top: 1px solid #ccc;
            padding-top: 12px;
            font-size: 12px;
          }

          @media print {
            body {
              margin: 0;
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
            Document generated from the saved clinical record
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
        <div class="content">
          ${escapeHtml(savedRecord.dentalNotes || "None recorded")}
        </div>

        <h2>Additional Clinical Notes</h2>
        <div class="content">
          ${escapeHtml(savedRecord.additionalNotes || "None recorded")}
        </div>

        <footer>
          ORAVIA Dental Clinic — Please follow the instructions
          provided by your treating dentist.
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
    if (!appointment?._id || completing || saving) return;

    const confirmed = window.confirm(
      "Are you sure you want to complete this consultation?"
    );

    if (!confirmed) return;

    setCompleting(true);
    setMessage("");
    setError("");

    try {
      const token = getAdminToken();

      const response = await fetch(
        `${API_BASE}/queue/${appointment._id}/complete`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to complete the consultation."
        );
      }

      // Clear the displayed patient immediately after successful completion.
      activeAppointmentId.current = null;
      setAppointment(null);
      setFormData({
        ...EMPTY_FORM,
        visitDate: getLocalDate(),
      });
      setMessage(
        "Consultation completed successfully. The patient has been removed from the active monitor."
      );

      // Refresh from the server so the page reflects the actual queue state.
      await fetchCurrentPatient();
    } catch (completeError) {
      console.error("Consultation completion error:", completeError);

      setError(
        completeError.message || "Failed to complete the consultation."
      );
    } finally {
      setCompleting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <main className="doctor-monitor-page">
        <div className="doctor-monitor-container">
          <div className="doctor-loading">
            Loading Doctor Monitor...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="doctor-monitor-page">
      <div className="doctor-monitor-container">
        <header className="doctor-monitor-header">
          <div>
            <p className="doctor-monitor-label">
              ORAVIA • CLINICAL MONITOR
            </p>

            <h1>Doctor Monitor</h1>

            <p>
              View the patient currently in consultation and record
              clinical details.
            </p>
          </div>

          <div className="monitor-status">
            <span className="status-dot" />
            {connectionError ? "Connection Issue" : "Queue Monitoring"}
          </div>
        </header>

        {connectionError && (
          <div className="doctor-message doctor-error" role="alert">
            {connectionError}

            <button
              type="button"
              onClick={fetchCurrentPatient}
              style={{ marginLeft: "12px" }}
            >
              Retry
            </button>
          </div>
        )}

        {error && (
          <div className="doctor-message doctor-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div
            className="doctor-message doctor-success"
            role="status"
          >
            {message}
          </div>
        )}

        {appointment ? (
          <section className="current-patient-card">
            <div className="patient-token-section">
              <span>NOW SERVING</span>

              <strong>#{appointment.tokenNumber ?? "—"}</strong>

              <p>In Consultation</p>
            </div>

            <div className="patient-information">
              <div className="patient-heading">
                <div>
                  <span className="info-label">CURRENT PATIENT</span>

                  <h2>
                    {appointment.patient?.name ||
                      appointment.patientName ||
                      "Patient"}
                  </h2>
                </div>
              </div>

              <div className="patient-details-grid">
                <div className="detail-box">
                  <span className="info-label">
                    TREATMENT REQUESTED
                  </span>

                  <strong>{appointment.treatment || "—"}</strong>
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

                  <strong>{appointment.appointmentTime || "—"}</strong>
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
                <span className="info-label">
                  PATIENT COMPLAINT / SYMPTOMS
                </span>

                <div className="symptoms-box">
                  {appointment.symptoms?.trim() ||
                    "No symptoms or complaint provided."}
                </div>
              </div>

              <section className="medical-record-section">
                <div className="medical-record-heading">
                  <div>
                    <span className="info-label">
                      CONSULTATION RECORD
                    </span>

                    <h2>Add Patient Medical Record</h2>

                    <p>
                      Enter the clinical details for this visit.
                      Confirm the information before saving.
                    </p>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="treatment">
                    Treatment performed *
                  </label>

                  <input
                    id="treatment"
                    name="treatment"
                    type="text"
                    value={formData.treatment}
                    onChange={handleChange}
                    placeholder="Enter treatment performed"
                    disabled={saving || completing}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="visitDate">Visit date *</label>

                  <input
                    id="visitDate"
                    name="visitDate"
                    type="date"
                    value={formData.visitDate}
                    onChange={handleChange}
                    disabled={saving || completing}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dentalNotes">Dental notes</label>

                  <textarea
                    id="dentalNotes"
                    name="dentalNotes"
                    value={formData.dentalNotes}
                    onChange={handleChange}
                    placeholder="Enter examination findings and dental notes"
                    rows={4}
                    disabled={saving || completing}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="medications">Medications</label>

                  <textarea
                    id="medications"
                    name="medications"
                    value={formData.medications}
                    onChange={handleChange}
                    placeholder="Enter medications, if applicable"
                    rows={3}
                    disabled={saving || completing}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prescription">Prescription</label>

                  <textarea
                    id="prescription"
                    name="prescription"
                    value={formData.prescription}
                    onChange={handleChange}
                    placeholder="Enter prescription instructions, if applicable"
                    rows={3}
                    disabled={saving || completing}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="additionalNotes">
                    Additional clinical notes
                  </label>

                  <textarea
                    id="additionalNotes"
                    name="additionalNotes"
                    value={formData.additionalNotes}
                    onChange={handleChange}
                    placeholder="Enter additional clinical notes"
                    rows={4}
                    disabled={saving || completing}
                  />
                </div>

                <div className="medical-record-actions">
                  <button
                    type="button"
                    className="save-record-button"
                    onClick={saveMedicalRecord}
                    disabled={saving || completing}
                  >
                    {saving ? "Saving Record..." : "Save Medical Record"}
                  </button>

                  <button
                    type="button"
                    className="complete-consultation-button"
                    onClick={completeConsultation}
                    disabled={completing || saving}
                  >
                    {completing
                      ? "Completing..."
                      : "Complete Consultation"}
                  </button>
                  <button
  type="button"
  className="save-record-button"
  onClick={printPrescription}
  disabled={!savedRecord || saving || completing}
>
  Print / Save Prescription PDF
</button>
                </div>
              </section>
            </div>
          </section>
        ) : (
          <section className="empty-doctor-state">
            <div className="empty-monitor-icon">+</div>

            <h2>No patient in consultation</h2>

            <p>
              When reception calls a patient and starts their
              consultation, the patient's token and appointment
              information will appear here automatically.
            </p>

            <button
              type="button"
              onClick={fetchCurrentPatient}
            >
              Refresh Monitor
            </button>
          </section>
        )}

        <footer className="doctor-monitor-footer">
          <span>ORAVIA Clinical Queue</span>

          {lastUpdated && (
            <span>
              Last updated{" "}
              {lastUpdated.toLocaleTimeString("en-IN")}
            </span>
          )}
        </footer>
      </div>
    </main>
  );
}

export default DoctorMonitor;
