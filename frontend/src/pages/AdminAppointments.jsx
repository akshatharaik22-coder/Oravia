import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function AdminAppointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

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

      if (err.response?.status === 401 || err.response?.status === 403) {
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

  useEffect(() => {
    const token = localStorage.getItem("oraviaAdminToken");

    if (!token) {
      navigate("/admin/login");
      return;
    }

    fetchAppointments();
  }, [navigate]);

  const updateStatus = async (appointmentId, newStatus) => {
    try {
      setUpdatingId(appointmentId);
      setError("");

      const token = localStorage.getItem("oraviaAdminToken");

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
      console.error("Error updating appointment status:", err);

      if (err.response?.status === 401 || err.response?.status === 403) {
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

  const handleLogout = () => {
    localStorage.removeItem("oraviaAdminToken");
    localStorage.removeItem("oraviaAdminUser");

    navigate("/admin/login");
  };

  const pendingCount = appointments.filter(
    (appointment) => appointment.status === "Pending"
  ).length;

  const confirmedCount = appointments.filter(
    (appointment) => appointment.status === "Confirmed"
  ).length;

  const completedCount = appointments.filter(
    (appointment) => appointment.status === "Completed"
  ).length;

  const cancelledCount = appointments.filter(
    (appointment) => appointment.status === "Cancelled"
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

  return (
    <div className="admin-page">

      {/* Header */}
      <header className="admin-header">
        <div>
          <h1>ORAVIA</h1>
          <p>Dental Clinic Management</p>
        </div>

        <div>
          <button
            onClick={fetchAppointments}
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


      {/* Main Content */}
      <main className="admin-content">

        {/* Page Heading */}
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


        {/* Summary Cards */}
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


        {/* Messages */}
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


        {/* Empty State */}
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


        {/* Appointment Table */}
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

                    {appointments.map((appointment) => (

                      <tr key={appointment._id}>

                        <td>
                          <strong>
                            {appointment.patientName}
                          </strong>
                        </td>


                        <td>
                          <div>
                            {appointment.phone}
                          </div>

                          <small>
                            {appointment.email}
                          </small>
                        </td>


                        <td>
                          {appointment.treatment}
                        </td>


                        <td>
                          {new Date(
                            appointment.appointmentDate
                          ).toLocaleDateString("en-IN")}
                        </td>


                        <td>
                          {appointment.appointmentTime}
                        </td>


                        <td>
                          <span
                            className={getStatusClass(
                              appointment.status
                            )}
                          >
                            {appointment.status}
                          </span>
                        </td>


                        <td>

                          <div className="action-buttons">

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

                    ))}

                  </tbody>

                </table>

              </div>

            </div>
          )}

      </main>
    </div>
  );
}

export default AdminAppointments;