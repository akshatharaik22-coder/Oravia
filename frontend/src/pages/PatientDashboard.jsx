import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function PatientDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("oraviaToken");

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const [profileResponse, appointmentsResponse, medicalRecordsResponse] =
          await Promise.all([
            axios.get(
              "http://localhost:5000/api/auth/me",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            ),

            axios.get(
              "http://localhost:5000/api/appointments/mine",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            ),

            axios.get(
              "http://localhost:5000/api/medical-records/mine",
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            ),
          ]);

        setUser(profileResponse.data.user);

        setAppointments(
          appointmentsResponse.data
        );

        setMedicalRecords(
          medicalRecordsResponse.data
        );

        localStorage.setItem(
          "oraviaUser",
          JSON.stringify(profileResponse.data.user)
        );
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("oraviaToken");
          localStorage.removeItem("oraviaUser");

          navigate("/login");
          return;
        }

        setError(
          error.response?.data?.message ||
            "Unable to load your dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleCancel = async (appointmentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(appointmentId);
      setError("");
      setSuccess("");

      const token =
        localStorage.getItem("oraviaToken");

      const response = await axios.patch(
        `http://localhost:5000/api/appointments/${appointmentId}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAppointments((previousAppointments) =>
        previousAppointments.map((appointment) =>
          appointment._id === appointmentId
            ? response.data.appointment
            : appointment
        )
      );

      setSuccess(
        "Your appointment has been cancelled."
      );
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Failed to cancel appointment."
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("oraviaToken");
    localStorage.removeItem("oraviaUser");

    navigate("/login");
  };

  const upcomingAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status !== "Completed" &&
        appointment.status !== "Cancelled"
    );

  const appointmentHistory =
    appointments.filter(
      (appointment) =>
        appointment.status === "Completed" ||
        (
          appointment.status === "Cancelled" &&
          appointment.cancelledBy === "admin"
        )
    );

  const formatDate = (date) => {
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
      <main className="dashboard-page">
        <section className="dashboard-header">
          <p>
            Loading your ORAVIA dashboard...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">

      <section className="dashboard-header">

        <div>
          <p className="section-label">
            PATIENT DASHBOARD
          </p>

          <h1>
            Welcome, {user?.name}.
          </h1>

          <p>
            Manage your appointments and keep track of
            your ORAVIA dental care journey.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={handleLogout}
        >
          Sign out
        </button>

      </section>

      {error && (
        <p className="form-error">
          {error}
        </p>
      )}

      {success && (
        <p className="form-success-message">
          {success}
        </p>
      )}

      <section className="dashboard-grid">

        <article className="dashboard-card">

          <span className="dashboard-card-label">
            UPCOMING
          </span>

          <h2>
            {upcomingAppointments.length}
          </h2>

          <p>
            Upcoming appointment
            {upcomingAppointments.length !== 1
              ? "s"
              : ""}
          </p>

        </article>

        <article className="dashboard-card">

          <span className="dashboard-card-label">
            HISTORY
          </span>

          <h2>
            {appointmentHistory.length}
          </h2>

          <p>
            Previous appointment
            {appointmentHistory.length !== 1
              ? "s"
              : ""}
          </p>

        </article>

        <article className="dashboard-card">

          <span className="dashboard-card-label">
            MEDICAL RECORDS
          </span>

          <h2>
            {medicalRecords.length}
          </h2>

          <p>
            Clinical record
            {medicalRecords.length !== 1
              ? "s"
              : ""}
          </p>

        </article>

      </section>

      <section className="dashboard-section">

        <div className="dashboard-section-header">

          <div>
            <p className="section-label">
              YOUR CARE
            </p>

            <h2>
              Upcoming appointments
            </h2>
          </div>

          <button
            className="primary-button"
            onClick={() => navigate("/booking")}
          >
            Book appointment →
          </button>

        </div>

        {upcomingAppointments.length === 0 ? (

          <div className="dashboard-empty">

            <h3>
              No upcoming appointments
            </h3>

            <p>
              When you book your next dental visit,
              it will appear here.
            </p>

            <button
              className="secondary-button"
              onClick={() => navigate("/booking")}
            >
              Schedule a visit
            </button>

          </div>

        ) : (

          <div className="appointment-list">

            {upcomingAppointments.map(
              (appointment) => (

                <article
                  className="appointment-card"
                  key={appointment._id}
                >

                  <div className="appointment-main">

                    <span className="appointment-treatment">
                      {appointment.treatment}
                    </span>

                    <h3>
                      {formatDate(
                        appointment.appointmentDate
                      )}
                    </h3>

                    <p>
                      {appointment.appointmentTime}
                    </p>

                    {appointment.symptoms && (
                      <p>
                        {appointment.symptoms}
                      </p>
                    )}

                  </div>

                  <div className="appointment-side">

                    <span
                      className={`appointment-status status-${appointment.status.toLowerCase()}`}
                    >
                      {appointment.status}
                    </span>

                    <button
                      className="cancel-button"
                      onClick={() =>
                        handleCancel(
                          appointment._id
                        )
                      }
                      disabled={
                        cancellingId ===
                        appointment._id
                      }
                    >
                      {cancellingId ===
                      appointment._id
                        ? "Cancelling..."
                        : "Cancel appointment"}
                    </button>

                  </div>

                </article>

              )
            )}

          </div>

        )}

      </section>

      <section className="dashboard-section">

        <div className="dashboard-section-header">

          <div>
            <p className="section-label">
              APPOINTMENT HISTORY
            </p>

            <h2>
              Previous appointments
            </h2>
          </div>

        </div>

        {appointmentHistory.length === 0 ? (

          <div className="dashboard-empty">

            <h3>
              No appointment history yet
            </h3>

            <p>
              Completed visits and appointments
              cancelled by the clinic will appear here.
            </p>

          </div>

        ) : (

          <div className="appointment-list">

            {appointmentHistory.map(
              (appointment) => (

                <article
                  className="appointment-card"
                  key={appointment._id}
                >

                  <div className="appointment-main">

                    <span className="appointment-treatment">
                      {appointment.treatment}
                    </span>

                    <h3>
                      {formatDate(
                        appointment.appointmentDate
                      )}
                    </h3>

                    <p>
                      {appointment.appointmentTime}
                    </p>

                  </div>

                  <div className="appointment-side">

                    <span
                      className={`appointment-status status-${appointment.status.toLowerCase()}`}
                    >
                      {appointment.status}
                    </span>

                  </div>

                </article>

              )
            )}

          </div>

        )}

      </section>

      <section className="dashboard-section">

        <div className="dashboard-section-header">

          <div>
            <p className="section-label">
              CLINICAL CARE
            </p>

            <h2>
              Medical history
            </h2>

            <p>
              View treatment details and clinical information
              recorded by the ORAVIA care team.
            </p>
          </div>

        </div>

        {medicalRecords.length === 0 ? (

          <div className="dashboard-empty">

            <h3>
              No medical records yet
            </h3>

            <p>
              Your clinical records will appear here after
              your care team records a completed visit.
            </p>

          </div>

        ) : (

          <div className="medical-record-list">

            {medicalRecords.map(
              (record) => (

                <article
                  className="medical-record-card"
                  key={record._id}
                >

                  <div className="medical-record-header">

                    <div>
                      <p className="section-label">
                        TREATMENT
                      </p>

                      <h3>
                        {record.treatment}
                      </h3>
                    </div>

                    <div className="medical-record-date">

                      <span>
                        Visit date
                      </span>

                      <strong>
                        {formatDate(
                          record.visitDate
                        )}
                      </strong>

                    </div>

                  </div>

                  {record.dentalNotes && (
                    <div className="medical-record-detail">

                      <span>
                        Dental notes
                      </span>

                      <p>
                        {record.dentalNotes}
                      </p>

                    </div>
                  )}

                  {record.medications && (
                    <div className="medical-record-detail">

                      <span>
                        Medications
                      </span>

                      <p>
                        {record.medications}
                      </p>

                    </div>
                  )}

                  {record.prescription && (
                    <div className="medical-record-detail">

                      <span>
                        Prescription
                      </span>

                      <p>
                        {record.prescription}
                      </p>

                    </div>
                  )}

                  {record.additionalNotes && (
                    <div className="medical-record-detail">

                      <span>
                        Additional notes
                      </span>

                      <p>
                        {record.additionalNotes}
                      </p>

                    </div>
                  )}

                </article>

              )
            )}

          </div>

        )}

      </section>

      <section className="dashboard-profile">

        <div>
          <p className="section-label">
            PATIENT INFORMATION
          </p>

          <h2>
            Your account
          </h2>
        </div>

        <div className="profile-details">

          <div>
            <span>Name</span>
            <strong>{user?.name}</strong>
          </div>

          <div>
            <span>Email</span>
            <strong>{user?.email}</strong>
          </div>

          <div>
            <span>Phone</span>
            <strong>{user?.phone}</strong>
          </div>

        </div>

      </section>

    </main>
  );
}

export default PatientDashboard;