const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 1. Email sent when a patient initially books an appointment.
const sendAppointmentEmail = async (appointment) => {
  const {
    patientName,
    email,
    treatment,
    appointmentDate,
    appointmentTime,
  } = appointment;

  if (!email) {
    throw new Error("Appointment has no patient email address");
  }

  const formattedDate = appointmentDate
    ? new Date(appointmentDate).toLocaleDateString("en-IN")
    : "Not specified";

  await transporter.sendMail({
    from: `"ORAVIA Dental Clinic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "ORAVIA - Appointment Request Received",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>ORAVIA Dental Clinic</h2>

        <p>Dear ${patientName || "Patient"},</p>

        <p>Your appointment request has been received successfully.</p>

        <h3>Appointment Details</h3>

        <p><strong>Treatment:</strong> ${treatment || "Not specified"}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${appointmentTime || "Not specified"}</p>
        <p><strong>Status:</strong> Pending</p>

        <p>Our clinic will review your appointment and update its status.</p>

        <p>Thank you for choosing <strong>ORAVIA Dental Clinic</strong>.</p>
      </div>
    `,
  });
};

// 2. Email sent when the clinic confirms, cancels, or completes an appointment.
const sendStatusUpdateEmail = async (appointment) => {
  const {
    patientName,
    email,
    treatment,
    appointmentDate,
    appointmentTime,
    status,
  } = appointment;

  if (!email) {
    throw new Error("Appointment has no patient email address");
  }

  let message = "";

  switch (status) {
    case "Confirmed":
      message = "Your dental appointment has been confirmed.";
      break;

    case "Cancelled":
      message = "Your dental appointment has been cancelled.";
      break;

    case "Completed":
      message = "Your dental appointment has been marked as completed.";
      break;

    default:
      return;
  }

  const formattedDate = appointmentDate
    ? new Date(appointmentDate).toLocaleDateString("en-IN")
    : "Not specified";

  await transporter.sendMail({
    from: `"ORAVIA Dental Clinic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `ORAVIA - Appointment ${status}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>ORAVIA Dental Clinic</h2>

        <p>Dear ${patientName || "Patient"},</p>

        <p>${message}</p>

        <h3>Appointment Details</h3>

        <p><strong>Treatment:</strong> ${treatment || "Not specified"}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${appointmentTime || "Not specified"}</p>
        <p><strong>Status:</strong> ${status}</p>

        <p>Thank you for choosing ORAVIA Dental Clinic.</p>
      </div>
    `,
  });
};

// 3. Email sent when the clinic assigns a queue token.
const sendTokenEmail = async (appointment) => {
  const {
    patientName,
    email,
    treatment,
    appointmentDate,
    appointmentTime,
    tokenNumber,
  } = appointment;

  if (!email) {
    throw new Error("Appointment has no patient email address");
  }

  if (tokenNumber == null) {
    throw new Error("Appointment has no queue token number");
  }

  const formattedDate = appointmentDate
    ? new Date(appointmentDate).toLocaleDateString("en-IN")
    : "Not specified";

  await transporter.sendMail({
    from: `"ORAVIA Dental Clinic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "ORAVIA - Your Queue Token",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>ORAVIA Dental Clinic</h2>

        <p>Dear ${patientName || "Patient"},</p>

        <p>Your queue token has been assigned successfully.</p>

        <h2>Your Token Number: ${tokenNumber}</h2>

        <p><strong>Treatment:</strong> ${treatment || "Not specified"}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Appointment time:</strong> ${appointmentTime || "Not specified"}</p>

        <p>Please follow the clinic's instructions for your visit.</p>

        <p>Thank you for choosing ORAVIA Dental Clinic.</p>
      </div>
    `,
  });
};

// 4. Email sent when the clinic calls the patient's queue token.
const sendTokenCalledEmail = async (appointment) => {
  const {
    patientName,
    email,
    treatment,
    tokenNumber,
  } = appointment;

  if (!email) {
    throw new Error("Appointment has no patient email address");
  }

  if (tokenNumber == null) {
    throw new Error("Appointment has no queue token number");
  }

  await transporter.sendMail({
    from: `"ORAVIA Dental Clinic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `ORAVIA - Token ${tokenNumber} Called`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>ORAVIA Dental Clinic</h2>

        <p>Dear ${patientName || "Patient"},</p>

        <p>Your queue token has been called.</p>

        <h2>Token Number: ${tokenNumber}</h2>

        <p><strong>Treatment:</strong> ${treatment || "Not specified"}</p>

        <p>
          Please proceed to the reception or designated treatment area
          and follow the clinic's instructions.
        </p>

        <p>Thank you for choosing ORAVIA Dental Clinic.</p>
      </div>
    `,
  });
};
// 5. Email the saved prescription to the patient.
const sendPrescriptionEmail = async (record, patient, appointment) => {
  const email = patient?.email;

  if (!email) {
    throw new Error("Patient has no registered email address");
  }

  const escapeHtml = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const patientName = escapeHtml(patient?.name || "Patient");
  const treatment = escapeHtml(record.treatment || "Not specified");
  const visitDate = record.visitDate
    ? new Date(record.visitDate).toLocaleDateString("en-IN")
    : "Not specified";

  const medications = escapeHtml(
    record.medications || "No medication details recorded"
  );

  const prescription = escapeHtml(
    record.prescription || "No prescription instructions recorded"
  );

  const dentalNotes = escapeHtml(
    record.dentalNotes || "No additional dental notes recorded"
  );

  const additionalNotes = escapeHtml(
    record.additionalNotes || "None"
  );

  await transporter.sendMail({
    from: `"ORAVIA Dental Clinic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "ORAVIA - Your Dental Prescription",
    text: `
ORAVIA Dental Clinic

Dear ${patient?.name || "Patient"},

Your dental prescription has been recorded by the clinic.

Treatment: ${record.treatment || "Not specified"}
Visit date: ${visitDate}

Medications:
${record.medications || "No medication details recorded"}

Prescription:
${record.prescription || "No prescription instructions recorded"}

Dental notes:
${record.dentalNotes || "No additional dental notes recorded"}

Additional notes:
${record.additionalNotes || "None"}

Please follow the instructions provided by your treating dentist.
Contact the clinic if you need clarification.
    `,
    html: `
      <div style="max-width:650px;margin:auto;font-family:Arial,sans-serif;color:#263238;line-height:1.7">
        <div style="background:#0f766e;color:white;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="margin:0">ORAVIA</h1>
          <p style="margin:4px 0 0">Dental Clinic</p>
        </div>

        <div style="padding:24px;border:1px solid #dce5e5;border-top:none">
          <h2>Dental Prescription</h2>

          <p>Dear ${patientName},</p>
          <p>Your dental prescription has been recorded by the clinic.</p>

          <p><strong>Treatment:</strong> ${treatment}</p>
          <p><strong>Visit date:</strong> ${escapeHtml(visitDate)}</p>

          <hr />

          <h3>Medications</h3>
          <p style="white-space:pre-wrap">${medications}</p>

          <h3>Prescription Instructions</h3>
          <p style="white-space:pre-wrap">${prescription}</p>

          <h3>Dental Notes</h3>
          <p style="white-space:pre-wrap">${dentalNotes}</p>

          <h3>Additional Clinical Notes</h3>
          <p style="white-space:pre-wrap">${additionalNotes}</p>

          <p style="margin-top:24px">
            Please follow the instructions provided by your treating dentist.
            Contact the clinic if you need clarification.
          </p>

          <p><strong>ORAVIA Dental Clinic</strong></p>
        </div>
      </div>
    `,
  });
};
// 6. Email a payment confirmation to the patient.
const sendPaymentConfirmationEmail = async (
  invoice,
  payment,
  previousAmountPaid = 0
) => {
  const patient = invoice?.patient;

  if (!patient?.email) {
    throw new Error(
      "Patient has no registered email address for payment confirmation."
    );
  }

  if (!payment) {
    throw new Error("Payment details are missing.");
  }

  const escapeHtml = (value = "") =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(Number(amount) || 0);

  const patientName = escapeHtml(patient.name || "Patient");
  const invoiceNumber = escapeHtml(
    invoice.invoiceNumber || "Not available"
  );

  const paymentMethod = escapeHtml(
    payment.method || "Not specified"
  );

  const transactionReference = String(
    payment.transactionReference || ""
  ).trim();

  const paidAt = payment.paidAt
    ? new Date(payment.paidAt)
    : new Date();

  const formattedDate = Number.isNaN(paidAt.getTime())
    ? "Not available"
    : paidAt.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  const paymentAmount = Number(payment.amount) || 0;
  const totalAmount = Number(invoice.totalAmount) || 0;
  const amountPaid = Number(invoice.amountPaid) || 0;
  const balanceDue = Number(invoice.balanceDue) || 0;

  const previousPaid = Math.max(
    0,
    Number(previousAmountPaid) || 0
  );

  const fullyPaid = invoice.status === "Paid";

  const paymentStatus = fullyPaid
    ? "Fully Paid"
    : balanceDue > 0
      ? "Partially Paid"
      : invoice.status || "Payment Recorded";

  const subject = `ORAVIA - Payment Confirmation - ${invoice.invoiceNumber}`;

  const text = `
ORAVIA Dental Clinic
Payment Confirmation

Dear ${patient.name || "Patient"},

Your payment has been recorded successfully by ORAVIA Dental Clinic.

Payment Details
----------------
Invoice Number: ${invoice.invoiceNumber || "Not available"}
Payment Date: ${formattedDate}
Payment Method: ${payment.method || "Not specified"}
${transactionReference ? `Transaction Reference: ${transactionReference}` : ""}

Amount Received: ${money(paymentAmount)}
Previously Paid: ${money(previousPaid)}
Total Invoice Amount: ${money(totalAmount)}
Total Paid After This Payment: ${money(amountPaid)}
Outstanding Balance: ${money(balanceDue)}

Invoice Status: ${paymentStatus}

${fullyPaid
    ? "Your invoice has been fully paid. Thank you!"
    : `Your remaining outstanding balance is ${money(balanceDue)}.`}

Please retain this email for your records.

Thank you for choosing ORAVIA Dental Clinic.
  `.trim();

  const html = `
    <div style="
      max-width: 650px;
      margin: 20px auto;
      font-family: Arial, sans-serif;
      color: #263238;
      line-height: 1.7;
      border: 1px solid #dce5e5;
      border-radius: 12px;
      overflow: hidden;
    ">
      <div style="
        background: #0f766e;
        color: #ffffff;
        padding: 25px;
      ">
        <h1 style="margin: 0;">ORAVIA</h1>
        <p style="margin: 4px 0 0;">Dental Clinic</p>
      </div>

      <div style="padding: 25px;">
        <h2 style="margin-top: 0;">
          Payment Confirmation
        </h2>

        <p>Dear ${patientName},</p>

        <p>
          Your payment has been recorded successfully by
          ORAVIA Dental Clinic.
        </p>

        <div style="
          background: #e5f6f3;
          border-radius: 10px;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        ">
          <p style="margin: 0; color: #126b64;">
            Amount Received
          </p>

          <h1 style="
            margin: 8px 0;
            color: #126b64;
          ">
            ${money(paymentAmount)}
          </h1>

          <p style="margin: 0;">
            ${escapeHtml(formattedDate)}
          </p>
        </div>

        <h3>Payment Details</h3>

        <table style="
          width: 100%;
          border-collapse: collapse;
        ">
          <tbody>
            <tr>
              <td style="padding: 9px; border-bottom: 1px solid #eee;">
                Invoice Number
              </td>
              <td style="
                padding: 9px;
                border-bottom: 1px solid #eee;
                text-align: right;
                font-weight: bold;
              ">
                ${invoiceNumber}
              </td>
            </tr>

            <tr>
              <td style="padding: 9px; border-bottom: 1px solid #eee;">
                Payment Method
              </td>
              <td style="
                padding: 9px;
                border-bottom: 1px solid #eee;
                text-align: right;
              ">
                ${paymentMethod}
              </td>
            </tr>

            ${
              transactionReference
                ? `
                  <tr>
                    <td style="padding: 9px; border-bottom: 1px solid #eee;">
                      Transaction Reference
                    </td>
                    <td style="
                      padding: 9px;
                      border-bottom: 1px solid #eee;
                      text-align: right;
                      overflow-wrap: anywhere;
                    ">
                      ${escapeHtml(transactionReference)}
                    </td>
                  </tr>
                `
                : ""
            }

            <tr>
              <td style="padding: 9px; border-bottom: 1px solid #eee;">
                Previously Paid
              </td>
              <td style="
                padding: 9px;
                border-bottom: 1px solid #eee;
                text-align: right;
              ">
                ${money(previousPaid)}
              </td>
            </tr>

            <tr>
              <td style="padding: 9px; border-bottom: 1px solid #eee;">
                Total Invoice Amount
              </td>
              <td style="
                padding: 9px;
                border-bottom: 1px solid #eee;
                text-align: right;
              ">
                ${money(totalAmount)}
              </td>
            </tr>

            <tr>
              <td style="padding: 9px; border-bottom: 1px solid #eee;">
                Total Paid
              </td>
              <td style="
                padding: 9px;
                border-bottom: 1px solid #eee;
                text-align: right;
              ">
                ${money(amountPaid)}
              </td>
            </tr>

            <tr>
              <td style="padding: 12px 9px; font-weight: bold;">
                Outstanding Balance
              </td>
              <td style="
                padding: 12px 9px;
                text-align: right;
                font-weight: bold;
                color: ${balanceDue > 0 ? "#b45309" : "#0f766e"};
              ">
                ${money(balanceDue)}
              </td>
            </tr>
          </tbody>
        </table>

        <p style="
          margin-top: 20px;
          padding: 12px;
          background: #f4f7f7;
          border-radius: 8px;
        ">
          <strong>Invoice Status:</strong>
          ${escapeHtml(paymentStatus)}
        </p>

        <p>
          ${
            fullyPaid
              ? "Your invoice has been fully paid. Thank you for choosing ORAVIA!"
              : `Your remaining outstanding balance is <strong>${money(balanceDue)}</strong>.`
          }
        </p>

        <p>
          Please retain this email for your records.
        </p>

        <p>
          Thank you for choosing
          <strong>ORAVIA Dental Clinic</strong>.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"ORAVIA Dental Clinic" <${process.env.EMAIL_USER}>`,
    to: patient.email,
    subject,
    text,
    html,
  });
};
// Export all four email functions.
module.exports = {
  sendAppointmentEmail,
  sendStatusUpdateEmail,
  sendTokenEmail,
  sendTokenCalledEmail,
  sendPrescriptionEmail,
  sendPaymentConfirmationEmail,
};
