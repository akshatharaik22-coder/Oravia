const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email sent when a patient initially books an appointment
const sendAppointmentEmail = async (appointment) => {
  const {
    patientName,
    email,
    treatment,
    appointmentDate,
    appointmentTime,
  } = appointment;

  const formattedDate = new Date(
    appointmentDate
  ).toLocaleDateString("en-IN");

  const mailOptions = {
    from: `"ORAVIA Dental Clinic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "ORAVIA - Appointment Request Received",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>ORAVIA Dental Clinic</h2>

        <p>Dear ${patientName},</p>

        <p>
          Your appointment request has been received successfully.
        </p>

        <h3>Appointment Details</h3>

        <p><strong>Treatment:</strong> ${treatment}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
        <p><strong>Status:</strong> Pending</p>

        <p>
          Our clinic will review your appointment and update the status.
        </p>

        <p>
          Thank you for choosing <strong>ORAVIA Dental Clinic</strong>.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};


// Email sent when admin changes appointment status
const sendStatusUpdateEmail = async (appointment) => {
  const {
    patientName,
    email,
    treatment,
    appointmentDate,
    appointmentTime,
    status,
  } = appointment;

  const formattedDate = new Date(
    appointmentDate
  ).toLocaleDateString("en-IN");

  let subject = "";
  let message = "";

  if (status === "Confirmed") {
    subject = "ORAVIA - Appointment Confirmed";
    message = `
      <p>
        Your appointment has been <strong>confirmed</strong>.
      </p>
    `;
  } else if (status === "Cancelled") {
    subject = "ORAVIA - Appointment Cancelled";
    message = `
      <p>
        Your appointment has been <strong>cancelled</strong>.
      </p>
      <p>
        Please contact the clinic if you would like to book another
        appointment.
      </p>
    `;
  } else if (status === "Completed") {
    subject = "ORAVIA - Appointment Completed";
    message = `
      <p>
        Your appointment has been marked as <strong>completed</strong>.
      </p>
      <p>
        Thank you for visiting ORAVIA Dental Clinic.
      </p>
    `;
  } else {
    return;
  }

  const mailOptions = {
    from: `"ORAVIA Dental Clinic" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>ORAVIA Dental Clinic</h2>

        <p>Dear ${patientName},</p>

        ${message}

        <h3>Appointment Details</h3>

        <p><strong>Treatment:</strong> ${treatment}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Time:</strong> ${appointmentTime}</p>
        <p><strong>Status:</strong> ${status}</p>

        <p>
          Thank you for choosing <strong>ORAVIA Dental Clinic</strong>.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};


module.exports = {
  sendAppointmentEmail,
  sendStatusUpdateEmail,
};