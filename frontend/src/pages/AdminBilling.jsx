import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE_URL from "../config/api.js";
import "./AdminBilling.css";

const API = `${API_BASE_URL}/api`;

const EMPTY_ITEM = {
  description: "",
  quantity: 1,
  unitPrice: "",
};

const EMPTY_INVOICE_FORM = {
  appointment: "",
  items: [{ ...EMPTY_ITEM }],
  discount: "0",
  tax: "0",
  notes: "",
};

const EMPTY_PAYMENT_FORM = {
  invoice: "",
  amount: "",
  method: "UPI",
  transactionReference: "",
};

const CURRENCY = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatCurrency = (amount) =>
  CURRENCY.format(Number(amount) || 0);

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

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
};

const getPatient = (appointment) => {
  if (!appointment) return null;

  if (
    appointment.patient &&
    typeof appointment.patient === "object"
  ) {
    return appointment.patient;
  }

  return null;
};

const getPatientId = (appointment) => {
  return (
    getId(appointment?.patient) ||
    appointment?.patientId ||
    ""
  );
};

const getPatientName = (appointment) => {
  const patient = getPatient(appointment);

  return (
    patient?.name ||
    appointment?.patientName ||
    appointment?.name ||
    "Unknown patient"
  );
};

const getPatientEmail = (appointment) => {
  const patient = getPatient(appointment);

  return (
    patient?.email ||
    appointment?.email ||
    ""
  );
};

const getAppointmentDate = (appointment) => {
  return (
    appointment?.appointmentDate ||
    appointment?.date ||
    appointment?.createdAt
  );
};

const getAppointmentTreatment = (appointment) => {
  return (
    appointment?.treatment ||
    appointment?.service ||
    appointment?.reason ||
    "Dental consultation"
  );
};

const getInvoicePatientName = (invoice) => {
  return (
    invoice?.patient?.name ||
    invoice?.patientName ||
    "Unknown patient"
  );
};

const getInvoicePatientEmail = (invoice) => {
  return invoice?.patient?.email || "";
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    return "The server returned an unexpected file response. Please try again.";
  }

  return (
    data?.message ||
    data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const normalizeList = (responseData, keys = []) => {
  if (Array.isArray(responseData)) return responseData;

  for (const key of keys) {
    if (Array.isArray(responseData?.[key])) {
      return responseData[key];
    }
  }

  return [];
};

const getStatusClass = (status) => {
  const normalized = String(status || "Unpaid")
    .toLowerCase()
    .replace(/\s+/g, "-");

  return `billing-status billing-status--${normalized}`;
};

const getInvoiceId = (invoice) => getId(invoice);

function AdminBilling() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState("");
  const [downloadingReceipt, setDownloadingReceipt] = useState("");

  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [invoiceForm, setInvoiceForm] = useState({
    ...EMPTY_INVOICE_FORM,
  });

  const [paymentForm, setPaymentForm] = useState({
    ...EMPTY_PAYMENT_FORM,
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("oraviaAdminToken");

  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  const handleUnauthorized = useCallback(
    (requestError) => {
      const status = requestError?.response?.status;

      if (status === 401 || status === 403) {
        localStorage.removeItem("oraviaAdminToken");
        localStorage.removeItem("oraviaAdminUser");
        navigate("/admin/login", { replace: true });
        return true;
      }

      return false;
    },
    [navigate]
  );

  const fetchBillingData = useCallback(
    async (showLoader = true) => {
      if (!token) {
        navigate("/admin/login", { replace: true });
        return;
      }

      if (showLoader) setLoading(true);

      setError("");

      try {
        const [invoiceResponse, appointmentResponse] =
          await Promise.all([
            axios.get(`${API}/invoices`, authConfig),
            axios.get(`${API}/appointments`, authConfig),
          ]);

        setInvoices(
          normalizeList(invoiceResponse.data, [
            "invoices",
            "data",
            "results",
          ])
        );

        setAppointments(
          normalizeList(appointmentResponse.data, [
            "appointments",
            "data",
            "results",
          ])
        );
      } catch (requestError) {
        if (!handleUnauthorized(requestError)) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [authConfig, handleUnauthorized, navigate, token]
  );

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const completedAppointments = useMemo(() => {
    const invoicedAppointmentIds = new Set(
      invoices
        .map((invoice) => getId(invoice.appointment))
        .filter(Boolean)
    );

    return appointments.filter((appointment) => {
      const isCompleted =
        appointment.status === "Completed" &&
        appointment.queueStatus === "Completed";

      const patientId = getPatientId(appointment);
      const appointmentId = getId(appointment);

      return (
        isCompleted &&
        patientId &&
        appointmentId &&
        !invoicedAppointmentIds.has(appointmentId)
      );
    });
  }, [appointments, invoices]);

  const payableInvoices = useMemo(() => {
    return invoices.filter(
      (invoice) => Number(invoice.balanceDue) > 0
    );
  }, [invoices]);

  const totals = useMemo(() => {
    const totalInvoiced = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount || 0),
      0
    );

    const totalCollected = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.amountPaid || 0),
      0
    );

    const totalOutstanding = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.balanceDue || 0),
      0
    );

    return {
      totalInvoices: invoices.length,
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      awaitingBilling: completedAppointments.length,
    };
  }, [invoices, completedAppointments]);

  const selectedAppointment = useMemo(
    () =>
      appointments.find(
        (appointment) =>
          getId(appointment) === invoiceForm.appointment
      ),
    [appointments, invoiceForm.appointment]
  );

  const invoiceSubtotal = useMemo(() => {
    return invoiceForm.items.reduce((sum, item) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const price = Math.max(0, Number(item.unitPrice) || 0);

      return sum + quantity * price;
    }, 0);
  }, [invoiceForm.items]);

  const invoiceDiscount = Math.max(
    0,
    Number(invoiceForm.discount) || 0
  );

  const invoiceTax = Math.max(0, Number(invoiceForm.tax) || 0);

  const invoiceTotal = Math.max(
    0,
    invoiceSubtotal -
      Math.min(invoiceDiscount, invoiceSubtotal) +
      invoiceTax
  );

  const selectedPaymentInvoice = useMemo(
    () =>
      invoices.find(
        (invoice) =>
          getInvoiceId(invoice) === paymentForm.invoice
      ),
    [invoices, paymentForm.invoice]
  );

  const filteredInvoices = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const patientName = getInvoicePatientName(invoice).toLowerCase();
      const patientEmail = getInvoicePatientEmail(invoice).toLowerCase();
      const invoiceNumber = String(
        invoice.invoiceNumber || ""
      ).toLowerCase();

      const matchesSearch =
        !search ||
        patientName.includes(search) ||
        patientEmail.includes(search) ||
        invoiceNumber.includes(search);

      const matchesStatus =
        statusFilter === "All" ||
        invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const updateInvoiceField = (field, value) => {
    setInvoiceForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateInvoiceItem = (index, field, value) => {
    setInvoiceForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      ),
    }));
  };

  const addInvoiceItem = () => {
    setInvoiceForm((previous) => ({
      ...previous,
      items: [...previous.items, { ...EMPTY_ITEM }],
    }));
  };

  const removeInvoiceItem = (index) => {
    setInvoiceForm((previous) => ({
      ...previous,
      items:
        previous.items.length === 1
          ? previous.items
          : previous.items.filter(
              (_, itemIndex) => itemIndex !== index
            ),
    }));
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      ...EMPTY_INVOICE_FORM,
      items: [{ ...EMPTY_ITEM }],
    });
  };

  const resetPaymentForm = () => {
    setPaymentForm({ ...EMPTY_PAYMENT_FORM });
  };

  const createInvoice = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!invoiceForm.appointment) {
      setError("Please select a completed appointment.");
      return;
    }

    if (!selectedAppointment) {
      setError("The selected appointment could not be found.");
      return;
    }

    const items = invoiceForm.items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));

    const invalidItem = items.find(
      (item) =>
        !item.description ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        !Number.isFinite(item.unitPrice) ||
        item.unitPrice < 0
    );

    if (invalidItem) {
      setError(
        "Enter a description, a whole-number quantity of at least 1, and a valid non-negative price for every item."
      );
      return;
    }

    const discount = Number(invoiceForm.discount) || 0;
    const tax = Number(invoiceForm.tax) || 0;

    if (
      !Number.isFinite(discount) ||
      !Number.isFinite(tax) ||
      discount < 0 ||
      tax < 0
    ) {
      setError("Discount and tax must be valid non-negative amounts.");
      return;
    }

    if (discount > invoiceSubtotal) {
      setError("Discount cannot exceed the invoice subtotal.");
      return;
    }

    setSavingInvoice(true);

    try {
      const response = await axios.post(
        `${API}/invoices`,
        {
          patient: getPatientId(selectedAppointment),
          appointment: getId(selectedAppointment),
          items,
          discount,
          tax,
          notes: invoiceForm.notes.trim(),
        },
        authConfig
      );

      setMessage(
        response.data?.message || "Invoice created successfully."
      );

      resetInvoiceForm();
      setActiveTab("history");

      await fetchBillingData(false);
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      setSavingInvoice(false);
    }
  };

  const recordPayment = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!paymentForm.invoice) {
      setError("Please select an invoice.");
      return;
    }

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a payment amount greater than zero.");
      return;
    }

    if (!selectedPaymentInvoice) {
      setError("The selected invoice could not be found.");
      return;
    }

    const balanceDue = Number(
      selectedPaymentInvoice.balanceDue || 0
    );

    if (amount > balanceDue) {
      setError(
        `Payment cannot exceed the outstanding balance of ${formatCurrency(
          balanceDue
        )}.`
      );
      return;
    }

    setSavingPayment(true);

    try {
      const response = await axios.post(
        `${API}/invoices/${getInvoiceId(
          selectedPaymentInvoice
        )}/payments`,
        {
          amount,
          method: paymentForm.method,
          transactionReference:
            paymentForm.transactionReference.trim(),
        },
        authConfig
      );

      const emailNote =
        response.data?.emailSent === true
          ? " Payment confirmation email sent."
          : response.data?.emailSent === false
            ? " Payment was recorded, but the confirmation email could not be sent."
            : "";

      setMessage(
        (response.data?.message ||
          "Payment recorded successfully.") + emailNote
      );

      resetPaymentForm();
      await fetchBillingData(false);
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      setSavingPayment(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const fileURL = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = fileURL;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.URL.revokeObjectURL(fileURL);
  };

  const downloadInvoicePDF = async (invoice) => {
    const invoiceId = getInvoiceId(invoice);

    setError("");
    setDownloadingInvoice(invoiceId);

    try {
      const response = await axios.get(
        `${API}/invoices/${invoiceId}/pdf`,
        {
          ...authConfig,
          responseType: "blob",
        }
      );

      const filename = `${
        invoice.invoiceNumber || "ORAVIA-Invoice"
      }.pdf`;

      downloadBlob(response.data, filename);
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      setDownloadingInvoice("");
    }
  };

  const downloadPaymentReceipt = async (invoice, payment) => {
    const invoiceId = getInvoiceId(invoice);
    const paymentId = getId(payment);

    if (!paymentId) {
      setError("The payment receipt identifier is missing.");
      return;
    }

    const loadingKey = `${invoiceId}-${paymentId}`;

    setError("");
    setDownloadingReceipt(loadingKey);

    try {
      const response = await axios.get(
        `${API}/invoices/${invoiceId}/payments/${paymentId}/receipt`,
        {
          ...authConfig,
          responseType: "blob",
        }
      );

      downloadBlob(
        response.data,
        `ORAVIA-Receipt-${invoice.invoiceNumber || invoiceId}.pdf`
      );
    } catch (requestError) {
      if (!handleUnauthorized(requestError)) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      setDownloadingReceipt("");
    }
  };

  const openCreateInvoice = () => {
    setError("");
    setMessage("");
    setActiveTab("create");
  };

  const openRecordPayment = () => {
    setError("");
    setMessage("");
    setActiveTab("payment");
  };

  if (loading) {
    return (
      <div className="billing-page">
        <div className="billing-loading">
          <div className="billing-spinner" />
          <p>Loading billing records...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="billing-page">
      <div className="billing-container">
        <header className="billing-header">
          <div>
            <div className="billing-eyebrow">
              ORAVIA · FINANCE MANAGEMENT
            </div>
            <h1>Billing & Payments</h1>
            <p>
              Manage treatment invoices, track collections, and
              record patient payments in one place.
            </p>
          </div>

          <button
            type="button"
            className="billing-button billing-button--primary"
            onClick={openCreateInvoice}
          >
            <span aria-hidden="true">＋</span>
            Create invoice
          </button>
        </header>

        {error && (
          <div className="billing-alert billing-alert--error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div
            className="billing-alert billing-alert--success"
            role="status"
          >
            <span>{message}</span>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}

        <section
          className="billing-summary"
          aria-label="Billing summary"
        >
          <article className="billing-stat billing-stat--dark">
            <div className="billing-stat-top">
              <span>Total invoiced</span>
              <span className="billing-stat-icon">₹</span>
            </div>
            <strong>{formatCurrency(totals.totalInvoiced)}</strong>
            <small>{totals.totalInvoices} invoices generated</small>
          </article>

          <article className="billing-stat">
            <div className="billing-stat-top">
              <span>Amount collected</span>
              <span className="billing-stat-icon">↗</span>
            </div>
            <strong>{formatCurrency(totals.totalCollected)}</strong>
            <small>Payments received to date</small>
          </article>

          <article className="billing-stat">
            <div className="billing-stat-top">
              <span>Outstanding balance</span>
              <span className="billing-stat-icon">◷</span>
            </div>
            <strong>{formatCurrency(totals.totalOutstanding)}</strong>
            <small>Amount yet to be collected</small>
          </article>

          <article className="billing-stat">
            <div className="billing-stat-top">
              <span>Awaiting billing</span>
              <span className="billing-stat-icon">＋</span>
            </div>
            <strong>{totals.awaitingBilling}</strong>
            <small>Completed appointments without invoices</small>
          </article>
        </section>

        <nav className="billing-tabs" aria-label="Billing sections">
          <button
            type="button"
            className={
              activeTab === "overview"
                ? "billing-tab billing-tab--active"
                : "billing-tab"
            }
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>

          <button
            type="button"
            className={
              activeTab === "create"
                ? "billing-tab billing-tab--active"
                : "billing-tab"
            }
            onClick={openCreateInvoice}
          >
            Create invoice
          </button>

          <button
            type="button"
            className={
              activeTab === "payment"
                ? "billing-tab billing-tab--active"
                : "billing-tab"
            }
            onClick={openRecordPayment}
          >
            Record payment
          </button>

          <button
            type="button"
            className={
              activeTab === "history"
                ? "billing-tab billing-tab--active"
                : "billing-tab"
            }
            onClick={() => setActiveTab("history")}
          >
            Invoice history
          </button>
        </nav>

        {activeTab === "overview" && (
          <section className="billing-overview">
            <div className="billing-section-heading">
              <div>
                <span className="billing-eyebrow">WORKSPACE</span>
                <h2>Billing overview</h2>
                <p>
                  Choose an action to manage invoices and patient
                  payments.
                </p>
              </div>

              <button
                type="button"
                className="billing-button billing-button--outline"
                onClick={() => fetchBillingData()}
              >
                ↻ Refresh
              </button>
            </div>

            <div className="billing-action-grid">
              <button
                type="button"
                className="billing-action-card"
                onClick={openCreateInvoice}
              >
                <span className="billing-action-icon">＋</span>
                <span>
                  <strong>Create an invoice</strong>
                  <small>
                    Bill a patient for a completed appointment.
                  </small>
                </span>
                <span className="billing-action-arrow">→</span>
              </button>

              <button
                type="button"
                className="billing-action-card"
                onClick={openRecordPayment}
              >
                <span className="billing-action-icon">₹</span>
                <span>
                  <strong>Record a payment</strong>
                  <small>
                    Update an outstanding invoice with a payment.
                  </small>
                </span>
                <span className="billing-action-arrow">→</span>
              </button>

              <button
                type="button"
                className="billing-action-card"
                onClick={() => setActiveTab("history")}
              >
                <span className="billing-action-icon">▤</span>
                <span>
                  <strong>View invoice history</strong>
                  <small>
                    Search invoices and download PDF documents.
                  </small>
                </span>
                <span className="billing-action-arrow">→</span>
              </button>
            </div>

            <div className="billing-panel">
              <div className="billing-section-heading billing-section-heading--compact">
                <div>
                  <h2>Recent invoices</h2>
                  <p>Your latest billing activity.</p>
                </div>

                <button
                  type="button"
                  className="billing-text-button"
                  onClick={() => setActiveTab("history")}
                >
                  View all →
                </button>
              </div>

              {invoices.length === 0 ? (
                <div className="billing-empty">
                  <span className="billing-empty-icon">▤</span>
                  <h3>No invoices yet</h3>
                  <p>
                    Create an invoice after a patient’s appointment
                    has been completed.
                  </p>
                  <button
                    type="button"
                    className="billing-button billing-button--primary"
                    onClick={openCreateInvoice}
                  >
                    Create first invoice
                  </button>
                </div>
              ) : (
                <div className="billing-table-wrap">
                  <table className="billing-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Patient</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Balance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...invoices]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt || 0) -
                            new Date(a.createdAt || 0)
                        )
                        .slice(0, 5)
                        .map((invoice) => (
                          <tr key={getInvoiceId(invoice)}>
                            <td>
                              <span className="billing-invoice-number">
                                {invoice.invoiceNumber || "—"}
                              </span>
                            </td>
                            <td>
                              <div className="billing-patient-cell">
                                <strong>
                                  {getInvoicePatientName(invoice)}
                                </strong>
                                <small>
                                  {getInvoicePatientEmail(invoice) ||
                                    "Patient"}
                                </small>
                              </div>
                            </td>
                            <td>{formatDate(invoice.createdAt)}</td>
                            <td>
                              {formatCurrency(invoice.totalAmount)}
                            </td>
                            <td>
                              <strong>
                                {formatCurrency(invoice.balanceDue)}
                              </strong>
                            </td>
                            <td>
                              <span
                                className={getStatusClass(invoice.status)}
                              >
                                {invoice.status || "Unpaid"}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "create" && (
          <section className="billing-panel billing-form-panel">
            <div className="billing-section-heading">
              <div>
                <span className="billing-eyebrow">NEW DOCUMENT</span>
                <h2>Create patient invoice</h2>
                <p>
                  Select a completed appointment and add the applicable
                  treatment charges.
                </p>
              </div>
            </div>

            {completedAppointments.length === 0 ? (
              <div className="billing-empty">
                <span className="billing-empty-icon">✓</span>
                <h3>No appointments awaiting billing</h3>
                <p>
                  Only appointments marked both Completed and queue
                  Completed are available for invoicing. An appointment
                  can only be invoiced once.
                </p>
                <button
                  type="button"
                  className="billing-button billing-button--outline"
                  onClick={() => fetchBillingData()}
                >
                  Refresh appointments
                </button>
              </div>
            ) : (
              <form onSubmit={createInvoice}>
                <div className="billing-form-section">
                  <div className="billing-form-section-title">
                    <span className="billing-step-number">01</span>
                    <div>
                      <h3>Appointment details</h3>
                      <p>Choose the patient visit being billed.</p>
                    </div>
                  </div>

                  <label
                    className="billing-field"
                    htmlFor="billing-appointment"
                  >
                    <span>Completed appointment *</span>
                    <select
                      id="billing-appointment"
                      value={invoiceForm.appointment}
                      onChange={(event) =>
                        updateInvoiceField(
                          "appointment",
                          event.target.value
                        )
                      }
                      required
                    >
                      <option value="">Select an appointment</option>
                      {completedAppointments.map((appointment) => {
                        const appointmentId = getId(appointment);

                        return (
                          <option
                            key={appointmentId}
                            value={appointmentId}
                          >
                            {getPatientName(appointment)} ·{" "}
                            {getAppointmentTreatment(appointment)} ·{" "}
                            {formatDate(
                              getAppointmentDate(appointment)
                            )}
                          </option>
                        );
                      })}
                    </select>
                  </label>

                  {selectedAppointment && (
                    <div className="billing-selected-patient">
                      <div className="billing-avatar">
                        {getPatientName(selectedAppointment)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <strong>
                          {getPatientName(selectedAppointment)}
                        </strong>
                        <span>
                          {getPatientEmail(selectedAppointment) ||
                            "Patient email unavailable"}
                        </span>
                      </div>
                      <span className="billing-status billing-status--paid">
                        Completed
                      </span>
                    </div>
                  )}
                </div>

                <div className="billing-form-section">
                  <div className="billing-form-section-title">
                    <span className="billing-step-number">02</span>
                    <div>
                      <h3>Invoice line items</h3>
                      <p>
                        Add each treatment or service with its quantity
                        and price.
                      </p>
                    </div>
                  </div>

                  <div className="billing-line-items">
                    {invoiceForm.items.map((item, index) => (
                      <div
                        className="billing-line-item"
                        key={index}
                      >
                        <label className="billing-field billing-field--description">
                          <span>
                            Description {index + 1} *
                          </span>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(event) =>
                              updateInvoiceItem(
                                index,
                                "description",
                                event.target.value
                              )
                            }
                            placeholder="e.g. Dental cleaning"
                            maxLength={200}
                            required
                          />
                        </label>

                        <label className="billing-field billing-field--quantity">
                          <span>Qty *</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) =>
                              updateInvoiceItem(
                                index,
                                "quantity",
                                event.target.value
                              )
                            }
                            required
                          />
                        </label>

                        <label className="billing-field billing-field--price">
                          <span>Unit price (₹) *</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) =>
                              updateInvoiceItem(
                                index,
                                "unitPrice",
                                event.target.value
                              )
                            }
                            placeholder="0.00"
                            required
                          />
                        </label>

                        <div className="billing-line-total">
                          <span>Amount</span>
                          <strong>
                            {formatCurrency(
                              (Number(item.quantity) || 0) *
                                (Number(item.unitPrice) || 0)
                            )}
                          </strong>
                        </div>

                        <button
                          type="button"
                          className="billing-remove-item"
                          aria-label={`Remove item ${index + 1}`}
                          title="Remove item"
                          onClick={() => removeInvoiceItem(index)}
                          disabled={invoiceForm.items.length === 1}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="billing-button billing-button--outline billing-add-item"
                    onClick={addInvoiceItem}
                  >
                    ＋ Add another charge
                  </button>
                </div>

                <div className="billing-form-bottom">
                  <div className="billing-form-section billing-notes-section">
                    <div className="billing-form-section-title">
                      <span className="billing-step-number">03</span>
                      <div>
                        <h3>Additional notes</h3>
                        <p>
                          Optional information to include with the
                          invoice.
                        </p>
                      </div>
                    </div>

                    <label className="billing-field">
                      <span>Notes</span>
                      <textarea
                        value={invoiceForm.notes}
                        onChange={(event) =>
                          updateInvoiceField(
                            "notes",
                            event.target.value
                          )
                        }
                        placeholder="Add invoice notes..."
                        rows={4}
                        maxLength={2000}
                      />
                    </label>
                  </div>

                  <div className="billing-total-card">
                    <h3>Invoice summary</h3>

                    <div className="billing-total-row">
                      <span>Subtotal</span>
                      <span>{formatCurrency(invoiceSubtotal)}</span>
                    </div>

                    <label className="billing-inline-amount">
                      <span>Discount (₹)</span>
                      <input
                        type="number"
                        min="0"
                        max={invoiceSubtotal}
                        step="0.01"
                        value={invoiceForm.discount}
                        onChange={(event) =>
                          updateInvoiceField(
                            "discount",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <label className="billing-inline-amount">
                      <span>Tax (₹)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={invoiceForm.tax}
                        onChange={(event) =>
                          updateInvoiceField(
                            "tax",
                            event.target.value
                          )
                        }
                      />
                    </label>

                    <div className="billing-total-divider" />

                    <div className="billing-grand-total">
                      <span>Total amount</span>
                      <strong>{formatCurrency(invoiceTotal)}</strong>
                    </div>

                    <p className="billing-total-note">
                      The server recalculates the final invoice amounts
                      before saving.
                    </p>

                    <button
                      type="submit"
                      className="billing-button billing-button--primary billing-submit"
                      disabled={savingInvoice}
                    >
                      {savingInvoice
                        ? "Creating invoice..."
                        : "Create invoice →"}
                    </button>

                    <button
                      type="button"
                      className="billing-cancel-button"
                      onClick={resetInvoiceForm}
                      disabled={savingInvoice}
                    >
                      Clear form
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>
        )}

        {activeTab === "payment" && (
          <section className="billing-panel billing-form-panel">
            <div className="billing-section-heading">
              <div>
                <span className="billing-eyebrow">PAYMENT ENTRY</span>
                <h2>Record a patient payment</h2>
                <p>
                  Record a received payment against an outstanding
                  invoice.
                </p>
              </div>
            </div>

            {payableInvoices.length === 0 ? (
              <div className="billing-empty">
                <span className="billing-empty-icon">✓</span>
                <h3>No outstanding payments</h3>
                <p>
                  There are no invoices with a remaining balance to
                  collect.
                </p>
                <button
                  type="button"
                  className="billing-button billing-button--outline"
                  onClick={() => setActiveTab("history")}
                >
                  View invoice history
                </button>
              </div>
            ) : (
              <form
                className="billing-payment-form"
                onSubmit={recordPayment}
              >
                <div className="billing-form-section">
                  <div className="billing-form-section-title">
                    <span className="billing-step-number">01</span>
                    <div>
                      <h3>Select invoice</h3>
                      <p>
                        Choose the invoice against which the payment was
                        received.
                      </p>
                    </div>
                  </div>

                  <label
                    className="billing-field"
                    htmlFor="payment-invoice"
                  >
                    <span>Invoice *</span>
                    <select
                      id="payment-invoice"
                      value={paymentForm.invoice}
                      onChange={(event) =>
                        setPaymentForm((previous) => ({
                          ...previous,
                          invoice: event.target.value,
                          amount: "",
                        }))
                      }
                      required
                    >
                      <option value="">Select an invoice</option>
                      {payableInvoices.map((invoice) => (
                        <option
                          key={getInvoiceId(invoice)}
                          value={getInvoiceId(invoice)}
                        >
                          {invoice.invoiceNumber || "Invoice"} ·{" "}
                          {getInvoicePatientName(invoice)} · Balance{" "}
                          {formatCurrency(invoice.balanceDue)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedPaymentInvoice && (
                    <div className="billing-payment-summary">
                      <div>
                        <span>Invoice total</span>
                        <strong>
                          {formatCurrency(
                            selectedPaymentInvoice.totalAmount
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Already paid</span>
                        <strong>
                          {formatCurrency(
                            selectedPaymentInvoice.amountPaid
                          )}
                        </strong>
                      </div>
                      <div className="billing-payment-summary--balance">
                        <span>Remaining balance</span>
                        <strong>
                          {formatCurrency(
                            selectedPaymentInvoice.balanceDue
                          )}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                <div className="billing-form-section">
                  <div className="billing-form-section-title">
                    <span className="billing-step-number">02</span>
                    <div>
                      <h3>Payment details</h3>
                      <p>
                        Enter the amount received and payment method.
                      </p>
                    </div>
                  </div>

                  <div className="billing-form-grid">
                    <label
                      className="billing-field"
                      htmlFor="payment-amount"
                    >
                      <span>Amount received (₹) *</span>
                      <input
                        id="payment-amount"
                        type="number"
                        min="0.01"
                        max={
                          selectedPaymentInvoice
                            ? Number(
                                selectedPaymentInvoice.balanceDue
                              )
                            : undefined
                        }
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(event) =>
                          setPaymentForm((previous) => ({
                            ...previous,
                            amount: event.target.value,
                          }))
                        }
                        placeholder="Enter amount"
                        required
                      />
                    </label>

                    <label
                      className="billing-field"
                      htmlFor="payment-method"
                    >
                      <span>Payment method *</span>
                      <select
                        id="payment-method"
                        value={paymentForm.method}
                        onChange={(event) =>
                          setPaymentForm((previous) => ({
                            ...previous,
                            method: event.target.value,
                          }))
                        }
                        required
                      >
                        <option value="UPI">UPI</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="Bank Transfer">
                          Bank Transfer
                        </option>
                      </select>
                    </label>

                    <label className="billing-field billing-field--full">
                      <span>Transaction reference</span>
                      <input
                        type="text"
                        value={paymentForm.transactionReference}
                        onChange={(event) =>
                          setPaymentForm((previous) => ({
                            ...previous,
                            transactionReference: event.target.value,
                          }))
                        }
                        placeholder="Optional transaction or reference ID"
                        maxLength={200}
                      />
                      <small>
                        Optional for cash payments; useful for digital
                        transactions.
                      </small>
                    </label>
                  </div>
                </div>

                <div className="billing-payment-footer">
                  <div>
                    <span>Payment to record</span>
                    <strong>
                      {formatCurrency(paymentForm.amount)}
                    </strong>
                  </div>

                  <button
                    type="submit"
                    className="billing-button billing-button--primary"
                    disabled={savingPayment}
                  >
                    {savingPayment
                      ? "Recording payment..."
                      : "Confirm payment"}
                  </button>
                </div>

                <p className="billing-security-note">
                  Payments are recorded against the selected invoice.
                  Confirm the received amount and payment method before
                  submitting.
                </p>
              </form>
            )}
          </section>
        )}

        {activeTab === "history" && (
          <section className="billing-panel">
            <div className="billing-section-heading">
              <div>
                <span className="billing-eyebrow">RECORDS</span>
                <h2>Invoice history</h2>
                <p>
                  Search invoices, review balances, and download
                  invoices or payment receipts.
                </p>
              </div>

              <button
                type="button"
                className="billing-button billing-button--outline"
                onClick={() => fetchBillingData()}
              >
                ↻ Refresh
              </button>
            </div>

            <div className="billing-history-toolbar">
              <label className="billing-search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search invoice, patient, or email..."
                  aria-label="Search invoices"
                />
              </label>

              <label className="billing-filter">
                <span>Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  aria-label="Filter invoices by status"
                >
                  <option value="All">All statuses</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partially Paid">Partially paid</option>
                  <option value="Paid">Paid</option>
                </select>
              </label>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="billing-empty">
                <span className="billing-empty-icon">⌕</span>
                <h3>
                  {invoices.length === 0
                    ? "No invoices found"
                    : "No matching invoices"}
                </h3>
                <p>
                  {invoices.length === 0
                    ? "Invoices you create will appear here."
                    : "Try changing your search or status filter."}
                </p>
                {invoices.length === 0 && (
                  <button
                    type="button"
                    className="billing-button billing-button--primary"
                    onClick={openCreateInvoice}
                  >
                    Create invoice
                  </button>
                )}
              </div>
            ) : (
              <div className="billing-table-wrap">
                <table className="billing-table billing-table--history">
                  <thead>
                    <tr>
                      <th>Invoice / Date</th>
                      <th>Patient</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Documents</th>
                    </tr>
                  </thead>

                  <tbody>
                    {[...filteredInvoices]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt || 0) -
                          new Date(a.createdAt || 0)
                      )
                      .map((invoice) => {
                        const invoiceId = getInvoiceId(invoice);
                        const payments = Array.isArray(invoice.payments)
                          ? invoice.payments
                          : [];

                        return (
                          <tr key={invoiceId}>
                            <td>
                              <div className="billing-patient-cell">
                                <span className="billing-invoice-number">
                                  {invoice.invoiceNumber || "—"}
                                </span>
                                <small>
                                  {formatDate(invoice.createdAt)}
                                </small>
                              </div>
                            </td>

                            <td>
                              <div className="billing-patient-cell">
                                <strong>
                                  {getInvoicePatientName(invoice)}
                                </strong>
                                <small>
                                  {getInvoicePatientEmail(invoice) ||
                                    "Patient"}
                                </small>
                              </div>
                            </td>

                            <td>
                              {formatCurrency(invoice.totalAmount)}
                            </td>

                            <td className="billing-paid-amount">
                              {formatCurrency(invoice.amountPaid)}
                            </td>

                            <td>
                              <strong>
                                {formatCurrency(invoice.balanceDue)}
                              </strong>
                            </td>

                            <td>
                              <span
                                className={getStatusClass(invoice.status)}
                              >
                                {invoice.status || "Unpaid"}
                              </span>
                            </td>

                            <td>
                              <div className="billing-document-actions">
                                <button
                                  type="button"
                                  className="billing-document-button"
                                  onClick={() =>
                                    downloadInvoicePDF(invoice)
                                  }
                                  disabled={
                                    downloadingInvoice === invoiceId
                                  }
                                >
                                  {downloadingInvoice === invoiceId
                                    ? "Downloading..."
                                    : "Invoice PDF"}
                                </button>

                                {payments.length > 0 && (
                                  <details className="billing-receipts">
                                    <summary>Receipts ({payments.length})</summary>
                                    <div className="billing-receipt-list">
                                      {payments.map((payment, index) => {
                                        const paymentId = getId(payment);
                                        const receiptKey = `${invoiceId}-${paymentId}`;

                                        return (
                                          <button
                                            key={paymentId || index}
                                            type="button"
                                            className="billing-receipt-button"
                                            disabled={
                                              !paymentId ||
                                              downloadingReceipt ===
                                                receiptKey
                                            }
                                            onClick={() =>
                                              downloadPaymentReceipt(
                                                invoice,
                                                payment
                                              )
                                            }
                                          >
                                            {downloadingReceipt ===
                                            receiptKey
                                              ? "Downloading..."
                                              : `${formatCurrency(
                                                  payment.amount
                                                )} · ${formatDate(
                                                  payment.paidAt
                                                )}`}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </details>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="billing-table-footer">
              <span>
                Showing {filteredInvoices.length} of {invoices.length}{" "}
                invoices
              </span>
              <span>
                Outstanding:{" "}
                <strong>
                  {formatCurrency(
                    filteredInvoices.reduce(
                      (sum, invoice) =>
                        sum + Number(invoice.balanceDue || 0),
                      0
                    )
                  )}
                </strong>
              </span>
            </div>
          </section>
        )}

        <footer className="billing-footer">
          <span>ORAVIA · Dental Care Management</span>
          <span>Billing records are managed securely by administrators.</span>
        </footer>
      </div>
    </main>
  );
}

export default AdminBilling;