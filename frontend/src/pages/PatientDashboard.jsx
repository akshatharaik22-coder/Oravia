
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";

function PatientDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] =
    useState(null);
  const [downloadingReceiptId, setDownloadingReceiptId] =
    useState(null);
  const [downloadingMedicalPDF, setDownloadingMedicalPDF] = useState("");  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("oraviaToken");

    if (!token) {
      navigate("/login");
      return;
    }

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const fetchDashboardData = async () => {
      try {
        const [
          profileResponse,
          appointmentsResponse,
          medicalRecordsResponse,
          invoicesResponse,
        ] = await Promise.all([
          axios.get(`${API}/auth/me`, { headers }),

          axios.get(`${API}/appointments/mine`, { headers }),

          axios.get(`${API}/medical-records/mine`, { headers }),

          axios.get(`${API}/invoices/mine`, { headers }),
        ]);

        setUser(profileResponse.data.user);
        setAppointments(appointmentsResponse.data);
        setMedicalRecords(medicalRecordsResponse.data);
        setInvoices(
          Array.isArray(invoicesResponse.data)
            ? invoicesResponse.data
            : invoicesResponse.data.invoices || []
        );

        localStorage.setItem(
          "oraviaUser",
          JSON.stringify(profileResponse.data.user)
        );
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("oraviaToken");
          localStorage.removeItem("oraviaUser");

          navigate("/login");
          return;
        }

        // Keep the dashboard usable if invoice loading fails.
        // Other dashboard sections should not disappear just
        // because the invoice endpoint has a problem.
        setError(
          err.response?.data?.message ||
            "Some dashboard information could not be loaded."
        );

        // Load each section independently if the combined request fails.
        try {
          const token = localStorage.getItem("oraviaToken");

          if (!token) {
            navigate("/login");
            return;
          }

          const headers = {
            Authorization: `Bearer ${token}`,
          };

          const [
            profileResult,
            appointmentsResult,
            recordsResult,
            invoicesResult,
          ] = await Promise.allSettled([
            axios.get(`${API}/auth/me`, { headers }),
            axios.get(`${API}/appointments/mine`, { headers }),
            axios.get(`${API}/medical-records/mine`, { headers }),
            axios.get(`${API}/invoices/mine`, { headers }),
          ]);

          if (profileResult.status === "fulfilled") {
            const profile = profileResult.value.data.user;

            setUser(profile);

            localStorage.setItem(
              "oraviaUser",
              JSON.stringify(profile)
            );
          }

          if (appointmentsResult.status === "fulfilled") {
            setAppointments(appointmentsResult.value.data);
          }

          if (recordsResult.status === "fulfilled") {
            setMedicalRecords(recordsResult.value.data);
          }

          if (invoicesResult.status === "fulfilled") {
            const data = invoicesResult.value.data;

            setInvoices(
              Array.isArray(data) ? data : data.invoices || []
            );
          }
        } catch {
          // The original error message is retained.
        }
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

    if (!confirmed) return;

    try {
      setCancellingId(appointmentId);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("oraviaToken");

      const response = await axios.patch(
        `${API}/appointments/${appointmentId}/cancel`,
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

      setSuccess("Your appointment has been cancelled.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to cancel appointment."
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleDownloadInvoice = async (invoice) => {
    try {
      setDownloadingInvoiceId(invoice._id);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("oraviaToken");

      const response = await axios.get(
        `${API}/invoices/mine/${invoice._id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const safeInvoiceNumber = String(
        invoice.invoiceNumber || invoice._id
      ).replace(/[^a-zA-Z0-9_-]/g, "_");

      link.href = downloadUrl;
      link.download = `${safeInvoiceNumber}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);

      setSuccess("Your invoice PDF has been downloaded.");
    } catch (err) {
      let message =
        err.response?.data?.message ||
        "Unable to download the invoice PDF. Please try again.";

      // Axios returns a Blob for error responses when responseType
      // is "blob", so read the response to extract its message.
      if (err.response?.data instanceof Blob) {
        try {
          const responseText = await err.response.data.text();
          const parsedError = JSON.parse(responseText);

          if (parsedError.message) {
            message = parsedError.message;
          }
        } catch {
          // Keep the fallback message.
        }
      }

      setError(message);
    } finally {
      setDownloadingInvoiceId(null);
    }
  };
  const handleDownloadReceipt = async (invoice, payment) => {
  if (!invoice?._id || !payment?._id) {
    setError("Unable to identify the selected payment.");
    return;
  }

  const receiptKey = `${invoice._id}:${payment._id}`;

  try {
    setDownloadingReceiptId(receiptKey);
    setError("");
    setSuccess("");

    const token = localStorage.getItem("oraviaToken");

    if (!token) {
      navigate("/login");
      return;
    }

    const response = await axios.get(
      `${API}/invoices/mine/${invoice._id}/payments/${payment._id}/receipt`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      }
    );

    const blob = new Blob([response.data], {
      type: "application/pdf",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeInvoiceNumber = String(
      invoice.invoiceNumber || invoice._id
    ).replace(/[^a-zA-Z0-9_-]/g, "_");

    const paymentReference = String(payment._id).slice(-6);

    link.href = downloadUrl;
    link.download = `Receipt-${safeInvoiceNumber}-${paymentReference}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1000);

    setSuccess("Your payment receipt has been downloaded.");
  } catch (err) {
    console.error("Payment receipt download failed:", err);

    let message =
      "Unable to download the payment receipt. Please try again.";

    if (err.response?.data instanceof Blob) {
      try {
        const responseText = await err.response.data.text();
        const parsedError = JSON.parse(responseText);

        message = parsedError.message || message;
      } catch {
        // Keep the fallback message.
      }
    } else if (err.response?.data?.message) {
      message = err.response.data.message;
    }

    setError(message);
  } finally {
    setDownloadingReceiptId(null);
  }
};
const handleDownloadMedicalPDF = async (record, documentType) => {
  if (!record?._id) {
    setError("Unable to identify the selected medical record.");
    return;
  }

  const downloadKey = `${record._id}:${documentType}`;

  try {
    setDownloadingMedicalPDF(downloadKey);
    setError("");
    setSuccess("");

    const token = localStorage.getItem("oraviaToken");

    if (!token) {
      navigate("/login");
      return;
    }

    const response = await axios.get(
      `${API}/medical-records/mine/${record._id}/pdf`,
      {
        params: {
          type: documentType,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      }
    );

    const blob = new Blob([response.data], {
      type: "application/pdf",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    const safeTreatment = String(record.treatment || "Dental-Care")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .slice(0, 60);

    link.href = downloadUrl;
    link.download =
      `ORAVIA-${documentType}-${safeTreatment}-${String(record._id).slice(-6)}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1000);

    setSuccess(
      documentType === "prescription"
        ? "Your prescription PDF has been downloaded."
        : "Your medical report PDF has been downloaded."
    );
  } catch (err) {
    console.error("Medical PDF download failed:", err);

    let message =
      "Unable to download the medical document. Please try again.";

    if (err.response?.data instanceof Blob) {
      try {
        const responseText = await err.response.data.text();
        const parsedError = JSON.parse(responseText);

        message = parsedError.message || message;
      } catch {
        // Retain the fallback message if the response is not JSON.
      }
    } else if (err.response?.data?.message) {
      message = err.response.data.message;
    }

    setError(message);
  } finally {
    setDownloadingMedicalPDF("");
  }
};
  const handleLogout = () => {
    localStorage.removeItem("oraviaToken");
    localStorage.removeItem("oraviaUser");

    navigate("/login");
  };

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      appointment.status !== "Completed" &&
      appointment.status !== "Cancelled"
  );

  const appointmentHistory = appointments.filter(
    (appointment) =>
      appointment.status === "Completed" ||
      appointment.status === "Cancelled"
  );

  const totalOutstanding = invoices.reduce(
    (sum, invoice) => sum + (Number(invoice.balanceDue) || 0),
    0
  );

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatMoney = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(Number(amount) || 0);

  if (loading) {
    return (
      <main className="dashboard-page">
        <section className="dashboard-header">
          <p>Loading your ORAVIA dashboard...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <section className="dashboard-header">
        <div>
          <p className="section-label">PATIENT DASHBOARD</p>

          <h1>Welcome, {user?.name}.</h1>

          <p>
            Manage your appointments and keep track of your ORAVIA
            dental care journey.
          </p>
        </div>

        <button className="secondary-button" onClick={handleLogout}>
          Sign out
        </button>
      </section>

      {error && <p className="form-error">{error}</p>}

      {success && (
        <p className="form-success-message">{success}</p>
      )}

      <section className="dashboard-grid">
        <article className="dashboard-card">
          <span className="dashboard-card-label">UPCOMING</span>

          <h2>{upcomingAppointments.length}</h2>

          <p>
            Upcoming appointment
            {upcomingAppointments.length !== 1 ? "s" : ""}
          </p>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-card-label">HISTORY</span>

          <h2>{appointmentHistory.length}</h2>

          <p>
            Previous appointment
            {appointmentHistory.length !== 1 ? "s" : ""}
          </p>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-card-label">
            MEDICAL RECORDS
          </span>

          <h2>{medicalRecords.length}</h2>

          <p>
            Clinical record
            {medicalRecords.length !== 1 ? "s" : ""}
          </p>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-card-label">INVOICES</span>

          <h2>{invoices.length}</h2>

          <p>
            Outstanding: {formatMoney(totalOutstanding)}
          </p>
        </article>
      </section>

      {/* UPCOMING APPOINTMENTS */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <p className="section-label">YOUR CARE</p>
            <h2>Upcoming appointments</h2>
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
            <h3>No upcoming appointments</h3>

            <p>
              When you book your next dental visit, it will appear
              here.
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
            {upcomingAppointments.map((appointment) => (
              <article
                className="appointment-card"
                key={appointment._id}
              >
                <div className="appointment-main">
                  <span className="appointment-treatment">
                    {appointment.treatment}
                  </span>

                  <h3>
                    {formatDate(appointment.appointmentDate)}
                  </h3>

                  <p>{appointment.appointmentTime}</p>

                  {appointment.symptoms && (
                    <p>{appointment.symptoms}</p>
                  )}
                </div>

                <div className="appointment-side">
                  <span
                    className={`appointment-status status-${(
                      appointment.status || "pending"
                    ).toLowerCase()}`}
                  >
                    {appointment.status}
                  </span>

                  {appointment.status !== "Completed" &&
                    appointment.status !== "Cancelled" && (
                      <button
                        className="cancel-button"
                        onClick={() =>
                          handleCancel(appointment._id)
                        }
                        disabled={cancellingId === appointment._id}
                      >
                        {cancellingId === appointment._id
                          ? "Cancelling..."
                          : "Cancel appointment"}
                      </button>
                    )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* APPOINTMENT HISTORY */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <p className="section-label">APPOINTMENT HISTORY</p>
            <h2>Previous appointments</h2>
          </div>
        </div>

        {appointmentHistory.length === 0 ? (
          <div className="dashboard-empty">
            <h3>No appointment history yet</h3>

            <p>
              Completed and cancelled appointments will appear here.
            </p>
          </div>
        ) : (
          <div className="appointment-list">
            {appointmentHistory.map((appointment) => (
              <article
                className="appointment-card"
                key={appointment._id}
              >
                <div className="appointment-main">
                  <span className="appointment-treatment">
                    {appointment.treatment}
                  </span>

                  <h3>
                    {formatDate(appointment.appointmentDate)}
                  </h3>

                  <p>{appointment.appointmentTime}</p>
                </div>

                <div className="appointment-side">
                  <span
                    className={`appointment-status status-${(
                      appointment.status || "pending"
                    ).toLowerCase()}`}
                  >
                    {appointment.status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* INVOICES AND PAYMENTS */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <p className="section-label">BILLING & PAYMENTS</p>

            <h2>My invoices</h2>

            <p>
              View your dental care bills, check payment balances,
              and download your invoice documents.
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="dashboard-empty">
            <h3>No invoices available yet</h3>

            <p>
              Your invoice will appear here when the ORAVIA clinic
              creates one for your visit.
            </p>
          </div>
        ) : (
          <div className="patient-invoice-list">
            {invoices.map((invoice) => (
              <article
                className="patient-invoice-card"
                key={invoice._id}
              >
                <div className="patient-invoice-header">
                  <div>
                    <p className="section-label">INVOICE NUMBER</p>

                    <h3>
                      {invoice.invoiceNumber || "Invoice"}
                    </h3>

                    <p className="patient-invoice-date">
                      Issued {formatDate(invoice.createdAt)}
                    </p>
                  </div>

                  <span
                    className={`patient-invoice-status patient-invoice-status-${(
                      invoice.status || "unpaid"
                    )
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {invoice.status || "Unpaid"}
                  </span>
                </div>

                <div className="patient-invoice-details">
                  <div>
                    <span>Treatment / Appointment</span>

                    <strong>
                      {invoice.appointment?.treatment ||
                        invoice.items?.[0]?.description ||
                        "Dental care"}
                    </strong>
                  </div>

                  <div>
                    <span>Total amount</span>

                    <strong>
                      {formatMoney(invoice.totalAmount)}
                    </strong>
                  </div>

                  <div>
                    <span>Amount paid</span>

                    <strong>
                      {formatMoney(invoice.amountPaid)}
                    </strong>
                  </div>

                  <div>
                    <span>Balance due</span>

                    <strong
                      className={
                        Number(invoice.balanceDue) > 0
                          ? "patient-invoice-balance-due"
                          : "patient-invoice-balance-clear"
                      }
                    >
                      {formatMoney(invoice.balanceDue)}
                    </strong>
                  </div>
                </div>

                {invoice.appointment?.appointmentDate && (
                  <p className="patient-invoice-appointment-date">
                    Appointment date:{" "}
                    {formatDate(invoice.appointment.appointmentDate)}
                  </p>
                )}

                <div className="patient-invoice-actions">
  {/* Download invoice */}
  <button
    type="button"
    className="patient-invoice-download"
    onClick={() => handleDownloadInvoice(invoice)}
    disabled={downloadingInvoiceId === invoice._id}
  >
    {downloadingInvoiceId === invoice._id
      ? "Preparing PDF..."
      : "↓ Download invoice PDF"}
  </button>

  {/* Download individual payment receipts */}
  {Array.isArray(invoice.payments) &&
    invoice.payments.map((payment, index) => {
      const receiptKey = `${invoice._id}:${payment._id}`;

      return (
        <button
          key={payment._id || index}
          type="button"
          className="patient-receipt-download"
          onClick={() => handleDownloadReceipt(invoice, payment)}
          disabled={
            !payment._id ||
            downloadingReceiptId === receiptKey
          }
        >
          {downloadingReceiptId === receiptKey
            ? "Preparing receipt..."
            : `↓ Download receipt ${index + 1}`}
        </button>
      );
    })}
</div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* MEDICAL HISTORY */}
      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <p className="section-label">CLINICAL CARE</p>

            <h2>Medical history</h2>

            <p>
              View treatment details and clinical information
              recorded by the ORAVIA care team.
            </p>
          </div>
        </div>

        {medicalRecords.length === 0 ? (
          <div className="dashboard-empty">
            <h3>No medical records yet</h3>

            <p>
              Your clinical records will appear here after your
              care team records a visit.
            </p>
          </div>
        ) : (
          <div className="medical-record-list">
            {medicalRecords.map((record) => (
              <article
                className="medical-record-card"
                key={record._id}
              >
                <div className="medical-record-header">
                  <div>
                    <p className="section-label">TREATMENT</p>

                    <h3>{record.treatment}</h3>
                  </div>

                  <div className="medical-record-date">
                    <span>Visit date</span>

                    <strong>{formatDate(record.visitDate)}</strong>
                  </div>
                </div>

                {record.dentalNotes && (
                  <div className="medical-record-detail">
                    <span>Dental notes</span>
                    <p>{record.dentalNotes}</p>
                  </div>
                )}

                {record.medications && (
                  <div className="medical-record-detail">
                    <span>Medications</span>
                    <p>{record.medications}</p>
                  </div>
                )}

                {record.prescription && (
                  <div className="medical-record-detail">
                    <span>Prescription</span>
                    <p>{record.prescription}</p>
                  </div>
                )}

                {record.additionalNotes && (
                  <div className="medical-record-detail">
                    <span>Additional notes</span>
                    <p>{record.additionalNotes}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* PATIENT PROFILE */}
      <section className="dashboard-profile">
        <div>
          <p className="section-label">PATIENT INFORMATION</p>
          <h2>Your account</h2>
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
            <strong>{user?.phone || "Not provided"}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PatientDashboard;
