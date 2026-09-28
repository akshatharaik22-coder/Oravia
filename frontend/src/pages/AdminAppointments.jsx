import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AdminAppointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);

  const [error, setError] = useState("");
  const [recordError, setRecordError] = useState("");
  const [recordSuccess, setRecordSuccess] = useState("");

  const [updatingId, setUpdatingId] = useState(null);
  const [checkingInId, setCheckingInId] = useState(null);
  const [savingRecord, setSavingRecord] = useState(false);

  const [recordForm, setRecordForm] = useState({
    patient: "",
    appointment: "",
    treatment: "",
    visitDate: "",
    dentalNotes: "",
    medications: "",
    prescription: "",
    additionalNotes: "",
  });

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("oraviaAdminToken");

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.get(
        "http://localhost:5000/api/appointments",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAppointments(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching appointments:", err);

      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        localStorage.removeItem("oraviaAdminToken");
        localStorage.removeItem("oraviaAdminUser");
        navigate("/admin/login");
        return;
      }

      setError(
        err.response?.data?.message ||
          "Failed to load appointments."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      setRecordsLoading(true);

      const token = localStorage.getItem("oraviaAdminToken");

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.get(
        "http://localhost:5000/api/medical-records",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMedicalRecords(response.data);
      setRecordError("");
    } catch (err) {
      console.error(
        "Error fetching medical records:",
        err
      );

      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        localStorage.removeItem("oraviaAdminToken");
        localStorage.removeItem("oraviaAdminUser");
        navigate("/admin/login");
        return;
      }

      setRecordError(
        err.response?.data?.message ||
          "Failed to load medical records."
      );
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("oraviaAdminToken");

    if (!token) {
      navigate("/admin/login");
      return;
    }

    fetchAppointments();
    fetchMedicalRecords();
  }, [navigate]);

  const updateStatus = async (
    appointmentId,
    newStatus
  ) => {
    try {
      setUpdatingId(appointmentId);
      setError("");

      const token =
        localStorage.getItem("oraviaAdminToken");

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.patch(
        `http://localhost:5000/api/appointments/${appointmentId}/status`,
        {
          status: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment._id === appointmentId
            ? response.data.appointment
            : appointment
        )
      );
    } catch (err) {
      console.error(
        "Error updating appointment status:",
        err
      );

      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        localStorage.removeItem("oraviaAdminToken");
        localStorage.removeItem("oraviaAdminUser");
        navigate("/admin/login");
        return;
      }

      setError(
        err.response?.data?.message ||
          "Failed to update appointment status."
      );
    } finally {
      setUpdatingId(null);
    }
  };
  const handleCheckIn = async (appointmentId) => {
  try {
    setCheckingInId(appointmentId);
    setError("");

    const token =
      localStorage.getItem("oraviaAdminToken");

    if (!token) {
      navigate("/admin/login");
      return;
    }

    const response = await axios.patch(
      `http://localhost:5000/api/queue/${appointmentId}/check-in`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setAppointments((currentAppointments) =>
      currentAppointments.map((appointment) =>
        appointment._id === appointmentId
          ? response.data.appointment
          : appointment
      )
    );
  } catch (err) {
    console.error(
      "Error checking in patient:",
      err
    );

    if (
      err.response?.status === 401 ||
      err.response?.status === 403
    ) {
      localStorage.removeItem("oraviaAdminToken");
      localStorage.removeItem("oraviaAdminUser");
      navigate("/admin/login");
      return;
    }

    setError(
      err.response?.data?.message ||
        "Failed to check in patient."
    );
  } finally {
    setCheckingInId(null);
  }
};

  const handleLogout = () => {
    localStorage.removeItem("oraviaAdminToken");
    localStorage.removeItem("oraviaAdminUser");

    navigate("/admin/login");
  };

  const handleRecordChange = (event) => {
    const { name, value } = event.target;

    setRecordForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    setRecordError("");
    setRecordSuccess("");
  };

  const handlePatientChange = (event) => {
    const patientId = event.target.value;

    const selectedAppointment =
      appointments.find(
        (appointment) =>
          appointment.patient?._id === patientId
      );

    setRecordForm((previousForm) => ({
      ...previousForm,
      patient: patientId,
      appointment:
        selectedAppointment?._id || "",
    }));

    setRecordError("");
    setRecordSuccess("");
  };

  const handleAppointmentChange = (event) => {
    const appointmentId = event.target.value;

    const selectedAppointment =
      appointments.find(
        (appointment) =>
          appointment._id === appointmentId
      );

    setRecordForm((previousForm) => ({
      ...previousForm,
      appointment: appointmentId,
      patient:
        selectedAppointment?.patient?._id || "",
      treatment:
        selectedAppointment?.treatment || "",
      visitDate: selectedAppointment?.appointmentDate
        ? new Date(
            selectedAppointment.appointmentDate
          )
            .toISOString()
            .split("T")[0]
        : "",
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
      !recordForm.treatment ||
      !recordForm.visitDate
    ) {
      setRecordError(
        "Patient, treatment, and visit date are required."
      );
      return;
    }

    try {
      setSavingRecord(true);

      const token =
        localStorage.getItem("oraviaAdminToken");

      if (!token) {
        navigate("/admin/login");
        return;
      }

      const response = await axios.post(
        "http://localhost:5000/api/medical-records",
        recordForm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMedicalRecords((previousRecords) => [
        response.data.record,
        ...previousRecords,
      ]);

      setRecordSuccess(
        "Medical record created successfully."
      );

      setRecordForm({
        patient: "",
        appointment: "",
        treatment: "",
        visitDate: "",
        dentalNotes: "",
        medications: "",
        prescription: "",
        additionalNotes: "",
      });
    } catch (err) {
      console.error(
        "Error creating medical record:",
        err
      );

      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        localStorage.removeItem("oraviaAdminToken");
        localStorage.removeItem("oraviaAdminUser");
        navigate("/admin/login");
        return;
      }

      setRecordError(
        err.response?.data?.message ||
          "Failed to create medical record."
      );
    } finally {
      setSavingRecord(false);
    }
  };

  const pendingCount = appointments.filter(
    (appointment) =>
      appointment.status === "Pending"
  ).length;

  const confirmedCount = appointments.filter(
    (appointment) =>
      appointment.status === "Confirmed"
  ).length;

  const completedCount = appointments.filter(
    (appointment) =>
      appointment.status === "Completed"
  ).length;

  const cancelledCount = appointments.filter(
    (appointment) =>
      appointment.status === "Cancelled"
  ).length;

  const getStatusClass = (status) => {
    switch (status) {
      case "Confirmed":
        return "status confirmed";

      case "Cancelled":
        return "status cancelled";

      case "Completed":
        return "status completed";

      default:
        return "status pending";
    }
  };

  const uniquePatients = appointments.filter(
    (appointment, index, array) =>
      appointment.patient?._id &&
      array.findIndex(
        (item) =>
          item.patient?._id ===
          appointment.patient?._id
      ) === index
  );

  const completedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status === "Completed"
    );

  return (
    <div className="admin-page">

      <header className="admin-header">
        <div>
          <h1>ORAVIA</h1>
          <p>Dental Clinic Management</p>
        </div>

        <div>
          <button
            onClick={() => {
              fetchAppointments();
              fetchMedicalRecords();
            }}
            className="refresh-button"
          >
            ↻ Refresh
          </button>

          <button
            onClick={handleLogout}
            className="secondary-button"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="admin-content">

        <div className="dashboard-title">
          <div>
            <p className="section-label">
              CLINIC MANAGEMENT
            </p>

            <h2>Appointments</h2>

            <p className="dashboard-subtitle">
              Manage and track patient appointments.
            </p>
          </div>

          <div className="appointment-count">
            {appointments.length} Total
          </div>
        </div>

        <div className="summary-cards">

          <div className="summary-card total-card">
            <div className="summary-icon">📋</div>

            <div>
              <p>Total Appointments</p>
              <h3>{appointments.length}</h3>
            </div>
          </div>

          <div className="summary-card pending-card">
            <div className="summary-icon">⏳</div>

            <div>
              <p>Pending</p>
              <h3>{pendingCount}</h3>
            </div>
          </div>

          <div className="summary-card confirmed-card">
            <div className="summary-icon">✓</div>

            <div>
              <p>Confirmed</p>
              <h3>{confirmedCount}</h3>
            </div>
          </div>

          <div className="summary-card completed-card">
            <div className="summary-icon">✓</div>

            <div>
              <p>Completed</p>
              <h3>{completedCount}</h3>
            </div>
          </div>

          <div className="summary-card cancelled-card">
            <div className="summary-icon">×</div>

            <div>
              <p>Cancelled</p>
              <h3>{cancelledCount}</h3>
            </div>
          </div>

        </div>

        {loading && (
          <p className="admin-message">
            Loading appointments...
          </p>
        )}

        {error && (
          <p className="admin-error">
            {error}
          </p>
        )}

        {!loading &&
          !error &&
          appointments.length === 0 && (
            <div className="empty-state">
              <h3>No appointments yet</h3>

              <p>
                Patient appointments will appear here
                after they are booked.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          appointments.length > 0 && (
            <div className="appointments-section">

              <div className="table-header">
                <div>
                  <h3>All Appointments</h3>

                  <p>
                    View and manage patient bookings
                  </p>
                </div>
              </div>

              <div className="appointments-table-container">

                <table className="appointments-table">

                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Contact</th>
                      <th>Treatment</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>

                    {appointments.map(
                      (appointment) => (

                        <tr
                          key={appointment._id}
                        >

                          <td>
                            <strong>
                              {
                                appointment.patientName
                              }
                            </strong>
                          </td>

                          <td>
                            <div>
                              {
                                appointment.phone
                              }
                            </div>

                            <small>
                              {
                                appointment.email
                              }
                            </small>
                          </td>

                          <td>
                            {
                              appointment.treatment
                            }
                          </td>

                          <td>
                            {new Date(
                              appointment.appointmentDate
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          </td>

                          <td>
                            {
                              appointment.appointmentTime
                            }
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                appointment.status
                              )}
                            >
                              {
                                appointment.status
                              }
                            </span>
                          </td>

                          <td>

                            <div className="action-buttons">
                            <button
                            className="primary-button"
                            onClick={() =>
                            handleCheckIn(appointment._id)
                            }
                            disabled={
                              checkingInId === appointment._id ||
                              appointment.status !== "Confirmed" ||
                              appointment.tokenNumber
                              }
                              >
                              {checkingInId === appointment._id
                              ? "Checking in..."
                              : appointment.tokenNumber
                              ? `Token ${appointment.tokenNumber}`
                              : "Check In"}
                              </button>

                              <button
                                className="confirm-button"
                                onClick={() =>
                                  updateStatus(
                                    appointment._id,
                                    "Confirmed"
                                  )
                                }
                                disabled={
                                  updatingId ===
                                  appointment._id
                                }
                              >
                                Confirm
                              </button>

                              <button
                                className="complete-button"
                                onClick={() =>
                                  updateStatus(
                                    appointment._id,
                                    "Completed"
                                  )
                                }
                                disabled={
                                  updatingId ===
                                  appointment._id
                                }
                              >
                                Complete
                              </button>

                              <button
                                className="cancel-button"
                                onClick={() =>
                                  updateStatus(
                                    appointment._id,
                                    "Cancelled"
                                  )
                                }
                                disabled={
                                  updatingId ===
                                  appointment._id
                                }
                              >
                                Cancel
                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          )}

        {/* MEDICAL RECORDS */}

        <section className="dashboard-section">

          <div className="dashboard-section-header">

            <div>
              <p className="section-label">
                CLINICAL CARE
              </p>

              <h2>
                Medical records
              </h2>

              <p>
                Record clinical information after
                patient visits.
              </p>
            </div>

            <div className="appointment-count">
              {medicalRecords.length} Records
            </div>

          </div>

          <div className="booking-form-card">

            <div className="booking-form-header">

              <div>
                <p className="section-label">
                  NEW RECORD
                </p>

                <h2>
                  Add patient medical record
                </h2>

                <p>
                  Clinical records can only be created
                  by authorized clinic staff.
                </p>
              </div>

            </div>

            <form
              onSubmit={handleCreateRecord}
            >

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="recordPatient">
                    Patient
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

                    {uniquePatients.map(
                      (appointment) => (

                        <option
                          key={
                            appointment.patient._id
                          }
                          value={
                            appointment.patient._id
                          }
                        >
                          {
                            appointment.patient.name
                          } — {
                            appointment.patient.email
                          }
                        </option>

                      )
                    )}

                  </select>

                </div>

                <div className="form-group">

                  <label htmlFor="recordAppointment">
                    Completed appointment
                  </label>

                  <select
                    id="recordAppointment"
                    name="appointment"
                    value={
                      recordForm.appointment
                    }
                    onChange={
                      handleAppointmentChange
                    }
                  >

                    <option value="">
                      Select appointment
                    </option>

                    {completedAppointments.map(
                      (appointment) => (

                        <option
                          key={appointment._id}
                          value={appointment._id}
                        >
                          {
                            appointment.patientName
                          } — {
                            appointment.treatment
                          } — {
                            new Date(
                              appointment.appointmentDate
                            ).toLocaleDateString(
                              "en-IN"
                            )
                          }
                        </option>

                      )
                    )}

                  </select>

                </div>

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="recordTreatment">
                    Treatment performed
                  </label>

                  <input
                    id="recordTreatment"
                    name="treatment"
                    type="text"
                    value={
                      recordForm.treatment
                    }
                    onChange={
                      handleRecordChange
                    }
                    placeholder="Example: Dental cleaning"
                    required
                  />

                </div>

                <div className="form-group">

                  <label htmlFor="recordVisitDate">
                    Visit date
                  </label>

                  <input
                    id="recordVisitDate"
                    name="visitDate"
                    type="date"
                    value={
                      recordForm.visitDate
                    }
                    onChange={
                      handleRecordChange
                    }
                    required
                  />

                </div>

              </div>

              <div className="form-group">

                <label htmlFor="dentalNotes">
                  Dental notes
                </label>

                <textarea
                  id="dentalNotes"
                  name="dentalNotes"
                  rows="4"
                  value={
                    recordForm.dentalNotes
                  }
                  onChange={
                    handleRecordChange
                  }
                  placeholder="Record relevant clinical observations and treatment details."
                />

              </div>

              <div className="form-group">

                <label htmlFor="medications">
                  Medications
                </label>

                <textarea
                  id="medications"
                  name="medications"
                  rows="3"
                  value={
                    recordForm.medications
                  }
                  onChange={
                    handleRecordChange
                  }
                  placeholder="Record medications provided or prescribed."
                />

              </div>

              <div className="form-group">

                <label htmlFor="prescription">
                  Prescription
                </label>

                <textarea
                  id="prescription"
                  name="prescription"
                  rows="3"
                  value={
                    recordForm.prescription
                  }
                  onChange={
                    handleRecordChange
                  }
                  placeholder="Record prescription instructions."
                />

              </div>

              <div className="form-group">

                <label htmlFor="additionalNotes">
                  Additional clinical notes
                </label>

                <textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  rows="3"
                  value={
                    recordForm.additionalNotes
                  }
                  onChange={
                    handleRecordChange
                  }
                  placeholder="Add any other relevant clinical information."
                />

              </div>

              {recordError && (
                <p className="form-error">
                  {recordError}
                </p>
              )}

              {recordSuccess && (
                <p className="form-success-message">
                  {recordSuccess}
                </p>
              )}

              <button
                type="submit"
                className="primary-button"
                disabled={savingRecord}
              >
                {savingRecord
                  ? "Saving record..."
                  : "Save medical record →"}
              </button>

            </form>

          </div>

          <div className="appointments-section">

            <div className="table-header">

              <div>
                <h3>
                  Recorded clinical history
                </h3>

                <p>
                  Existing patient medical records
                </p>
              </div>

            </div>

            {recordsLoading ? (

              <p className="admin-message">
                Loading medical records...
              </p>

            ) : recordError &&
              medicalRecords.length === 0 ? (

              <p className="admin-error">
                {recordError}
              </p>

            ) : medicalRecords.length === 0 ? (

              <div className="empty-state">

                <h3>
                  No medical records yet
                </h3>

                <p>
                  Medical records created by the
                  clinic will appear here.
                </p>

              </div>

            ) : (

              <div className="appointment-list">

                {medicalRecords.map(
                  (record) => (

                    <article
                      className="appointment-card"
                      key={record._id}
                    >

                      <div className="appointment-main">

                        <span className="appointment-treatment">
                          {record.treatment}
                        </span>

                        <h3>
                          {
                            record.patient?.name ||
                            "Patient"
                          }
                        </h3>

                        <p>
                          Visit date:{" "}
                          {new Date(
                            record.visitDate
                          ).toLocaleDateString(
                            "en-IN"
                          )}
                        </p>

                        {record.dentalNotes && (
                          <p>
                            <strong>
                              Dental notes:
                            </strong>{" "}
                            {
                              record.dentalNotes
                            }
                          </p>
                        )}

                        {record.medications && (
                          <p>
                            <strong>
                              Medications:
                            </strong>{" "}
                            {
                              record.medications
                            }
                          </p>
                        )}

                        {record.prescription && (
                          <p>
                            <strong>
                              Prescription:
                            </strong>{" "}
                            {
                              record.prescription
                            }
                          </p>
                        )}

                        {record.additionalNotes && (
                          <p>
                            <strong>
                              Additional notes:
                            </strong>{" "}
                            {
                              record.additionalNotes
                            }
                          </p>
                        )}

                      </div>

                    </article>

                  )
                )}

              </div>

            )}

          </div>

        </section>

      </main>
    </div>
  );
}

export default AdminAppointments;