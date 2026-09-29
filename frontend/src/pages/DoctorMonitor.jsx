
import { useEffect, useState } from "react";

function DoctorMonitor() {
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [formData, setFormData] = useState({
    treatment: "",
    visitDate: "",
    dentalNotes: "",
    medications: "",
    prescription: "",
    additionalNotes: "",
  });

  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchCurrentPatient = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/queue/doctor/current"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch current patient"
        );
      }

      setAppointment(data.appointment || null);
      setLastUpdated(new Date());
      setError("");
    } catch (error) {
      console.error("Doctor monitor error:", error);
      setError("Unable to connect to the clinic queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentPatient();

    const interval = setInterval(() => {
      fetchCurrentPatient();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!appointment) {
      return;
    }

    const today = new Date();

    const localDate = new Date(
      today.getTime() -
        today.getTimezoneOffset() * 60000
    )
      .toISOString()
      .split("T")[0];

    setFormData({
      treatment: appointment.treatment || "",
      visitDate: localDate,
      dentalNotes: "",
      medications: "",
      prescription: "",
      additionalNotes: "",
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
  };

  const saveMedicalRecord = async () => {
    if (!appointment?.patient?._id) {
      setError(
        "This appointment is not linked to a patient account."
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

    setSaving(true);
    setMessage("");
    setError("");

    try {
      // IMPORTANT:
      // AdminLogin.jsx stores the admin JWT using
      // "oraviaAdminToken", so we must use the same key.
      const token = localStorage.getItem(
        "oraviaAdminToken"
      );

      if (!token) {
        throw new Error(
          "Admin session not found. Please sign in again through Admin Login."
        );
      }

      const response = await fetch(
        "http://localhost:5000/api/medical-records",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            patient: appointment.patient._id,
            appointment: appointment._id,
            treatment: formData.treatment,
            visitDate: formData.visitDate,
            dentalNotes: formData.dentalNotes,
            medications: formData.medications,
            prescription: formData.prescription,
            additionalNotes: formData.additionalNotes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save medical record"
        );
      }

      setMessage(
        "Medical record saved successfully."
      );
    } catch (error) {
      console.error(
        "Saving medical record error:",
        error
      );

      setError(
        error.message ||
          "Failed to save medical record."
      );
    } finally {
      setSaving(false);
    }
  };

  const completeConsultation = async () => {
    if (!appointment?._id) {
      return;
    }

    setCompleting(true);
    setMessage("");
    setError("");

    try {
      // IMPORTANT:
      // Use the admin token because this backend route
      // requires adminMiddleware.
      const token = localStorage.getItem(
        "oraviaAdminToken"
      );

      if (!token) {
        throw new Error(
          "Admin session not found. Please sign in again through Admin Login."
        );
      }

      const response = await fetch(
        `http://localhost:5000/api/queue/${appointment._id}/complete`,
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
          data.message ||
            "Failed to complete consultation"
        );
      }

      setMessage(
        "Consultation completed successfully."
      );

      setAppointment(null);

      setFormData({
        treatment: "",
        visitDate: "",
        dentalNotes: "",
        medications: "",
        prescription: "",
        additionalNotes: "",
      });
    } catch (error) {
      console.error(
        "Completing consultation error:",
        error
      );

      setError(
        error.message ||
          "Failed to complete consultation."
      );
    } finally {
      setCompleting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  if (loading) {
    return (
      <main className="doctor-monitor-page">
        <div className="doctor-monitor-container">
          <div className="doctor-loading">
            Loading doctor monitor...
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
              Patients checked in by reception will
              appear here automatically.
            </p>
          </div>

          <div className="monitor-status">
            <span className="status-dot"></span>
            Queue Active
          </div>
        </header>

        {error && (
          <div className="doctor-message doctor-error">
            {error}
          </div>
        )}

        {message && (
          <div className="doctor-message doctor-success">
            {message}
          </div>
        )}

        {appointment ? (
          <section className="current-patient-card">

            <div className="patient-token-section">
              <span>NOW SERVING</span>

              <strong>
                #{appointment.tokenNumber}
              </strong>

              <p>In Consultation</p>
            </div>

            <div className="patient-information">

              <div className="patient-heading">
                <div>
                  <span className="info-label">
                    PATIENT
                  </span>

                  <h2>
                    {appointment.patient?.name ||
                      appointment.patientName}
                  </h2>
                </div>
              </div>

              <div className="patient-details-grid">

                <div className="detail-box">
                  <span className="info-label">
                    TREATMENT REQUESTED
                  </span>

                  <strong>
                    {appointment.treatment}
                  </strong>
                </div>

                <div className="detail-box">
                  <span className="info-label">
                    APPOINTMENT DATE
                  </span>

                  <strong>
                    {formatDate(
                      appointment.appointmentDate
                    )}
                  </strong>
                </div>

                <div className="detail-box">
                  <span className="info-label">
                    APPOINTMENT TIME
                  </span>

                  <strong>
                    {appointment.appointmentTime}
                  </strong>
                </div>

                <div className="detail-box">
                  <span className="info-label">
                    CONTACT
                  </span>

                  <strong>
                    {appointment.phone}
                  </strong>
                </div>

              </div>

              <div className="symptoms-section">
                <span className="info-label">
                  PATIENT COMPLAINT / SYMPTOMS
                </span>

                <div className="symptoms-box">
                  {appointment.symptoms?.trim()
                    ? appointment.symptoms
                    : "No symptoms or complaint provided."}
                </div>
              </div>

              <section className="medical-record-section">

                <div className="medical-record-heading">
                  <div>
                    <span className="info-label">
                      CONSULTATION RECORD
                    </span>

                    <h2>
                      Add Patient Medical Record
                    </h2>

                    <p>
                      Record the clinical details from
                      this consultation. The patient is
                      automatically linked to this record.
                    </p>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="treatment">
                    Treatment performed
                  </label>

                  <input
                    id="treatment"
                    name="treatment"
                    type="text"
                    value={formData.treatment}
                    onChange={handleChange}
                    placeholder="Enter treatment performed"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="visitDate">
                    Visit date
                  </label>

                  <input
                    id="visitDate"
                    name="visitDate"
                    type="date"
                    value={formData.visitDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dentalNotes">
                    Dental notes
                  </label>

                  <textarea
                    id="dentalNotes"
                    name="dentalNotes"
                    value={formData.dentalNotes}
                    onChange={handleChange}
                    placeholder="Enter examination findings and dental notes"
                    rows="4"
                  />
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
                    placeholder="Enter prescribed medications"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prescription">
                    Prescription
                  </label>

                  <textarea
                    id="prescription"
                    name="prescription"
                    value={formData.prescription}
                    onChange={handleChange}
                    placeholder="Enter prescription instructions"
                    rows="3"
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
                    placeholder="Enter any additional clinical notes"
                    rows="4"
                  />
                </div>

                <div className="medical-record-actions">

                  <button
                    type="button"
                    className="save-record-button"
                    onClick={saveMedicalRecord}
                    disabled={saving}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Medical Record"}
                  </button>

                  <button
                    type="button"
                    className="complete-consultation-button"
                    onClick={completeConsultation}
                    disabled={completing}
                  >
                    {completing
                      ? "Completing..."
                      : "Complete Consultation"}
                  </button>

                </div>

              </section>

            </div>
          </section>
        ) : (
          <section className="empty-doctor-state">

            <div className="empty-monitor-icon">
              +
            </div>

            <h2>
              No patient in consultation
            </h2>

            <p>
              When reception checks in the next patient,
              their token and appointment information
              will appear here automatically.
            </p>

          </section>
        )}

        <footer className="doctor-monitor-footer">
          <span>
            ORAVIA Clinical Queue
          </span>

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
