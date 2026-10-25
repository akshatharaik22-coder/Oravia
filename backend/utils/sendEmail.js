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

// Export all four email functions.
module.exports = {
  sendAppointmentEmail,
  sendStatusUpdateEmail,
  sendTokenEmail,
  sendTokenCalledEmail,
  sendPrescriptionEmail,
};
