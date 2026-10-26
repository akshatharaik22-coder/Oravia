
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import "./AdminBilling.css";

const API = "http://localhost:5000/api";

const EMPTY_ITEM = {
  description: "",
  quantity: 1,
  unitPrice: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value || 0));

export default function AdminBilling() {
  const [invoices, setInvoices] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState("");
  const [downloadingReceipt, setDownloadingReceipt] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [selectedAppointment, setSelectedAppointment] = useState("");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");

  const [paymentInvoice, setPaymentInvoice] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [transactionReference, setTransactionReference] = useState("");

  // ==========================================================
  // AUTHENTICATION
  // ==========================================================

  const getHeaders = () => {
    const token = localStorage.getItem("oraviaAdminToken");

    if (!token) {
      throw new Error(
        "Your admin session has expired. Please log in again."
      );
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  // ==========================================================
  // LOAD INVOICES AND COMPLETED APPOINTMENTS
  // ==========================================================

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const headers = getHeaders();

      const [invoiceResponse, appointmentResponse] =
        await Promise.all([
          axios.get(`${API}/invoices`, { headers }),
          axios.get(`${API}/appointments`, { headers }),
        ]);

      setInvoices(
        Array.isArray(invoiceResponse.data)
          ? invoiceResponse.data
          : []
      );

      const appointmentList = Array.isArray(
        appointmentResponse.data
      )
        ? appointmentResponse.data
        : [];

      setAppointments(
        appointmentList.filter(
          (appointment) =>
            appointment.status === "Completed" &&
            appointment.queueStatus === "Completed" &&
            appointment.patient?._id
        )
      );
    } catch (err) {
      console.error("Loading billing data failed:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load billing information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBillingData();
  }, [loadBillingData]);

  // ==========================================================
  // SELECTED APPOINTMENT
  // ==========================================================

  const selectedAppointmentData = appointments.find(
    (appointment) =>
      appointment._id === selectedAppointment
  );

  // ==========================================================
  // INVOICE CALCULATIONS
  // ==========================================================

  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const price = Number(item.unitPrice);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return sum;
    }

    return sum + quantity * price;
  }, 0);

  const discountValue = Number(discount);
  const taxValue = Number(tax);

  const estimatedTotal =
    subtotal -
    (Number.isFinite(discountValue) &&
    discountValue >= 0
      ? discountValue
      : 0) +
    (Number.isFinite(taxValue) && taxValue >= 0
      ? taxValue
      : 0);

  // ==========================================================
  // DOWNLOAD INVOICE PDF
  // GET /api/invoices/:id/pdf
  // ==========================================================

  const downloadInvoicePDF = async (invoice) => {
    if (!invoice?._id) {
      setError("Invalid invoice selected.");
      return;
    }

    setError("");
    setMessage("");
    setDownloadingInvoice(invoice._id);

    try {
      const response = await axios.get(
        `${API}/invoices/${invoice._id}/pdf`,
        {
          headers: getHeaders(),
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;

      const safeInvoiceNumber = String(
        invoice.invoiceNumber || "ORAVIA-invoice"
      ).replace(/[^a-zA-Z0-9_-]/g, "_");

      link.download = `${safeInvoiceNumber}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Release the temporary browser URL.
      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      setMessage(
        `Invoice ${invoice.invoiceNumber} downloaded successfully.`
      );
    } catch (err) {
      console.error("Downloading invoice PDF failed:", err);

      let errorMessage =
        "Failed to download the invoice PDF.";

      // Axios receives JSON error responses as a Blob when
      // responseType is "blob", so extract the server message.
      if (err.response?.data instanceof Blob) {
        try {
          const errorText = await err.response.data.text();
          const errorData = JSON.parse(errorText);

          errorMessage =
            errorData.message || errorMessage;
        } catch {
          // Keep the default message if the response is not JSON.
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setDownloadingInvoice("");
    }
  };
  // ==========================================================
// DOWNLOAD PAYMENT RECEIPT PDF
// GET /api/invoices/:id/payments/:paymentId/receipt
// ==========================================================

const downloadPaymentReceipt = async (invoice, payment) => {
  if (!invoice?._id || !payment?._id) {
    setError("Invalid invoice or payment selected.");
    return;
  }

  const downloadKey = `${invoice._id}:${payment._id}`;

  setError("");
  setMessage("");
  setDownloadingReceipt(downloadKey);

  try {
    const response = await axios.get(
      `${API}/invoices/${invoice._id}/payments/${payment._id}/receipt`,
      {
        headers: getHeaders(),
        responseType: "blob",
      }
    );

    const blob = new Blob([response.data], {
      type: "application/pdf",
    });

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;

    const invoiceNumber = String(
      invoice.invoiceNumber || "ORAVIA-invoice"
    ).replace(/[^a-zA-Z0-9_-]/g, "_");

    const paymentReference = String(payment._id).slice(-6);

    link.download =
      `Receipt-${invoiceNumber}-${paymentReference}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
    }, 1000);

    setMessage(
      `Payment receipt for ${invoice.invoiceNumber} downloaded successfully.`
    );
  } catch (err) {
    console.error("Downloading payment receipt failed:", err);

    let errorMessage =
      "Failed to download the payment receipt.";

    if (err.response?.data instanceof Blob) {
      try {
        const errorText = await err.response.data.text();
        const errorData = JSON.parse(errorText);

        errorMessage =
          errorData.message || errorMessage;
      } catch {
        // Keep the default message if the response is not JSON.
      }
    } else if (err.response?.data?.message) {
      errorMessage = err.response.data.message;
    } else if (err.message) {
      errorMessage = err.message;
    }

    setError(errorMessage);
  } finally {
    setDownloadingReceipt("");
  }
};

  // ==========================================================
  // INVOICE ITEM HANDLERS
  // ==========================================================

  const updateItem = (index, field, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { ...EMPTY_ITEM },
    ]);
  };

  const removeItem = (index) => {
    setItems((current) =>
      current.length === 1
        ? current
        : current.filter(
            (_, itemIndex) => itemIndex !== index
          )
    );
  };

  // ==========================================================
  // CREATE INVOICE
  // ==========================================================

  const createInvoice = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!selectedAppointmentData) {
      setError("Select a completed appointment.");
      return;
    }

    if (
      items.some(
        (item) =>
          !item.description.trim() ||
          !Number.isSafeInteger(Number(item.quantity)) ||
          Number(item.quantity) < 1 ||
          item.unitPrice === "" ||
          !Number.isFinite(Number(item.unitPrice)) ||
          Number(item.unitPrice) < 0
      )
    ) {
      setError(
        "Enter a valid description, quantity, and price for every item."
      );
      return;
    }

    if (
      discount === "" ||
      tax === "" ||
      !Number.isFinite(discountValue) ||
      !Number.isFinite(taxValue) ||
      discountValue < 0 ||
      taxValue < 0
    ) {
      setError(
        "Enter valid non-negative discount and tax amounts."
      );
      return;
    }

    if (discountValue > subtotal) {
      setError("Discount cannot exceed the subtotal.");
      return;
    }

    setSaving(true);

    try {
      const response = await axios.post(
        `${API}/invoices`,
        {
          patient: selectedAppointmentData.patient._id,
          appointment: selectedAppointmentData._id,
          items: items.map((item) => ({
            description: item.description.trim(),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
          discount: discountValue,
          tax: taxValue,
          notes,
        },
        {
          headers: getHeaders(),
        }
      );

      setMessage(
        `Invoice ${response.data.invoice.invoiceNumber} created successfully.`
      );

      setSelectedAppointment("");
      setItems([{ ...EMPTY_ITEM }]);
      setDiscount("0");
      setTax("0");
      setNotes("");

      await loadBillingData();
    } catch (err) {
      console.error("Creating invoice failed:", err);

      setError(
        err.response?.data?.message ||
          "Failed to create the invoice."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // RECORD PAYMENT
  // ==========================================================

  const recordPayment = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const amount = Number(paymentAmount);

    if (
      !paymentInvoice ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Select an invoice and enter a valid payment amount."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await axios.post(
        `${API}/invoices/${paymentInvoice}/payments`,
        {
          amount,
          method: paymentMethod,
          transactionReference:
            transactionReference.trim(),
        },
        {
          headers: getHeaders(),
        }
      );

      setMessage(response.data.message);

      setPaymentInvoice("");
      setPaymentAmount("");
      setPaymentMethod("UPI");
      setTransactionReference("");

      await loadBillingData();
    } catch (err) {
      console.error("Recording payment failed:", err);

      setError(
        err.response?.data?.message ||
          "Failed to record the payment."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // BILLING SUMMARY
  // ==========================================================

  const outstandingInvoices = invoices.filter(
    (invoice) => Number(invoice.balanceDue) > 0
  );

  const totalOutstanding = outstandingInvoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.balanceDue || 0),
    0
  );

  const totalCollected = invoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.amountPaid || 0),
    0
  );

  // ==========================================================
  // USER INTERFACE
  // ==========================================================

  return (
    <main className="billing-page">
      <header className="billing-header">
        <div>
          <span className="billing-eyebrow">
            ORAVIA · ADMINISTRATION
          </span>

          <h1>Billing & Payments</h1>

          <p>
            Manage dental invoices, patient payments, and
            outstanding balances.
          </p>
        </div>

        <button
          type="button"
          className="billing-refresh"
          onClick={loadBillingData}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div
          className="billing-alert error"
          role="alert"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          className="billing-alert success"
          role="status"
        >
          {message}
        </div>
      )}

      {/* SUMMARY CARDS */}

      <section className="billing-summary">
        <article className="billing-stat">
          <span>Total Invoices</span>
          <strong>{invoices.length}</strong>
        </article>

        <article className="billing-stat">
          <span>Payments Recorded</span>
          <strong>{money(totalCollected)}</strong>
        </article>

        <article className="billing-stat">
          <span>Outstanding Balance</span>
          <strong>{money(totalOutstanding)}</strong>
        </article>

        <article className="billing-stat">
          <span>Awaiting Billing</span>
          <strong>{appointments.length}</strong>
        </article>
      </section>

      {/* CREATE INVOICE */}

      <section className="billing-panel">
        <div className="billing-section-heading">
          <h2>Create Invoice</h2>
          <p>
            Choose a completed consultation and add its charges.
          </p>
        </div>

        <form onSubmit={createInvoice}>
          <label className="billing-field">
            Completed Appointment

            <select
              value={selectedAppointment}
              onChange={(event) =>
                setSelectedAppointment(event.target.value)
              }
              required
            >
              <option value="">
                Select patient and appointment
              </option>

              {appointments.map((appointment) => (
                <option
                  key={appointment._id}
                  value={appointment._id}
                >
                  {appointment.patientName} —{" "}
                  {appointment.treatment} —{" "}
                  {new Date(
                    appointment.appointmentDate
                  ).toLocaleDateString("en-IN")}
                </option>
              ))}
            </select>
          </label>

          {selectedAppointmentData && (
            <div className="billing-patient-info">
              <strong>
                {selectedAppointmentData.patientName}
              </strong>

              <span>
                {selectedAppointmentData.email}
              </span>

              <span>
                {selectedAppointmentData.treatment}
              </span>
            </div>
          )}

          <div className="billing-section-heading">
            <h3>Invoice Items</h3>
          </div>

          {items.map((item, index) => (
            <div
              className="billing-item-row"
              key={index}
            >
              <label className="billing-field item-description">
                Description

                <input
                  value={item.description}
                  onChange={(event) =>
                    updateItem(
                      index,
                      "description",
                      event.target.value
                    )
                  }
                  placeholder="e.g. Dental cleaning"
                  required
                />
              </label>

              <label className="billing-field">
                Quantity

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(
                      index,
                      "quantity",
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <label className="billing-field">
                Unit Price (₹)

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(event) =>
                    updateItem(
                      index,
                      "unitPrice",
                      event.target.value
                    )
                  }
                  required
                />
              </label>

              <button
                type="button"
                className="billing-remove"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
              >
                Remove
              </button>
            </div>
          ))}

          <button
            type="button"
            className="billing-secondary"
            onClick={addItem}
          >
            + Add Charge
          </button>

          <div className="billing-calculation">
            <label className="billing-field">
              Discount (₹)

              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(event) =>
                  setDiscount(event.target.value)
                }
                required
              />
            </label>

            <label className="billing-field">
              Tax (₹)

              <input
                type="number"
                min="0"
                step="0.01"
                value={tax}
                onChange={(event) =>
                  setTax(event.target.value)
                }
                required
              />
            </label>

            <div className="billing-total">
              <span>Estimated Total</span>
              <strong>{money(estimatedTotal)}</strong>
            </div>
          </div>

          <label className="billing-field">
            Billing Notes

            <textarea
              rows="3"
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Optional notes for this invoice"
            />
          </label>

          <button
            type="submit"
            className="billing-primary"
            disabled={saving || loading}
          >
            {saving ? "Processing..." : "Generate Invoice"}
          </button>
        </form>
      </section>

      {/* RECORD PAYMENT */}

      <section className="billing-panel">
        <div className="billing-section-heading">
          <h2>Record Payment</h2>
          <p>
            Record a payment against an existing invoice.
          </p>
        </div>

        <form onSubmit={recordPayment}>
          <label className="billing-field">
            Invoice

            <select
              value={paymentInvoice}
              onChange={(event) =>
                setPaymentInvoice(event.target.value)
              }
              required
            >
              <option value="">Select invoice</option>

              {outstandingInvoices.map((invoice) => (
                <option
                  key={invoice._id}
                  value={invoice._id}
                >
                  {invoice.invoiceNumber} —{" "}
                  {invoice.patient?.name || "Patient"} — Due{" "}
                  {money(invoice.balanceDue)}
                </option>
              ))}
            </select>
          </label>

          <div className="billing-calculation">
            <label className="billing-field">
              Amount Received (₹)

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(event) =>
                  setPaymentAmount(event.target.value)
                }
                required
              />
            </label>

            <label className="billing-field">
              Payment Method

              <select
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value)
                }
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">
                  Bank Transfer
                </option>
              </select>
            </label>
          </div>

          <label className="billing-field">
            Transaction Reference (optional)

            <input
              value={transactionReference}
              onChange={(event) =>
                setTransactionReference(event.target.value)
              }
              placeholder="Reference or receipt number"
              maxLength="200"
            />
          </label>

          <button
            type="submit"
            className="billing-primary"
            disabled={saving || loading}
          >
            {saving ? "Processing..." : "Record Payment"}
          </button>
        </form>
      </section>

      {/* INVOICE HISTORY AND PDF DOWNLOADS */}

      <section className="billing-panel">
        <div className="billing-section-heading">
          <h2>Invoice History</h2>

          <p>
            Review invoices, payment status, balances, and
            download invoice documents.
          </p>
        </div>

        {loading ? (
          <p className="billing-empty">
            Loading invoices...
          </p>
        ) : invoices.length === 0 ? (
          <p className="billing-empty">
            No invoices have been created yet.
          </p>
        ) : (
          <div className="billing-table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Patient</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td>
                      <strong>
                        {invoice.invoiceNumber}
                      </strong>
                    </td>

                    <td>
                      {invoice.patient?.name || "Patient"}
                    </td>

                    <td>{money(invoice.totalAmount)}</td>

                    <td>{money(invoice.amountPaid)}</td>

                    <td>{money(invoice.balanceDue)}</td>

                    <td>
                      <span
                        className={`billing-status ${String(
                          invoice.status || "unpaid"
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {invoice.status || "Unpaid"}
                      </span>
                    </td>

                    <td>
  <div className="billing-actions">
    {/* DOWNLOAD COMPLETE INVOICE */}

    <button
      type="button"
      className="billing-download"
      onClick={() => downloadInvoicePDF(invoice)}
      disabled={downloadingInvoice === invoice._id}
      aria-label={`Download invoice ${invoice.invoiceNumber} as PDF`}
    >
      {downloadingInvoice === invoice._id
        ? "Generating PDF..."
        : "Invoice PDF"}
    </button>

    {/* DOWNLOAD RECEIPT FOR EACH PAYMENT */}

    {Array.isArray(invoice.payments) &&
      invoice.payments.map((payment, index) => {
        const downloadKey =
          `${invoice._id}:${payment._id}`;

        return (
          <button
            key={payment._id || index}
            type="button"
            className="billing-receipt-download"
            onClick={() =>
              downloadPaymentReceipt(invoice, payment)
            }
            disabled={
              !payment._id ||
              downloadingReceipt === downloadKey
            }
            aria-label={`Download payment receipt ${index + 1} for ${invoice.invoiceNumber}`}
          >
            {downloadingReceipt === downloadKey
              ? "Generating..."
              : `Receipt ${index + 1}`}
          </button>
        );
      })}
  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
