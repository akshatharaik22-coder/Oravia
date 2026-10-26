
const express = require("express");
const mongoose = require("mongoose");

const {
  generateInvoicePDF,
  generatePaymentReceiptPDF,
} = require("../utils/pdfGenerator");

const Invoice = require("../models/Invoice");
const Appointment = require("../models/Appointment");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();
const {
  sendPaymentConfirmationEmail,
} = require("../utils/sendEmail");

// ============================================================
// HELPERS
// ============================================================

const isValidId = (id) => mongoose.isValidObjectId(id);

const money = (amount) =>
  Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

const generateInvoiceNumber = () => {
  const date = new Date();

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase();

  return `ORA-${datePart}-${randomPart}`;
};

const populateInvoice = (query) =>
  query
    .populate("patient", "name email phone")
    .populate(
      "appointment",
      "treatment appointmentDate appointmentTime"
    );

// ============================================================
// PATIENT: GET OWN INVOICES
// GET /api/invoices/mine
// ============================================================

router.get("/mine", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        message: "This endpoint is available to patients only.",
      });
    }

    const invoices = await Invoice.find({
      patient: req.user.id,
    })
      .populate(
        "appointment",
        "treatment appointmentDate appointmentTime"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(invoices);
  } catch (error) {
    console.error("Fetching patient invoices error:", error);

    return res.status(500).json({
      message: "Failed to fetch your invoices.",
    });
  }
});

// ============================================================
// PATIENT: DOWNLOAD OWN INVOICE PDF
// GET /api/invoices/mine/:id/pdf
// ============================================================

router.get("/mine/:id/pdf", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "patient") {
      return res.status(403).json({
        message: "This endpoint is available to patients only.",
      });
    }

    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID.",
      });
    }

    // A patient can only download their own invoice.
    const invoice = await Invoice.findOne({
      _id: id,
      patient: req.user.id,
    })
      .populate("patient", "name email phone")
      .populate(
        "appointment",
        "treatment appointmentDate appointmentTime"
      )
      .lean();

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found.",
      });
    }

    return generateInvoicePDF(invoice, res);
  } catch (error) {
    console.error("Patient invoice PDF error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to generate invoice PDF.",
      });
    }

    res.destroy(error);
  }
});

// ============================================================
// PATIENT: DOWNLOAD OWN PAYMENT RECEIPT
// GET /api/invoices/mine/:id/payments/:paymentId/receipt
// ============================================================

router.get(
  "/mine/:id/payments/:paymentId/receipt",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "patient") {
        return res.status(403).json({
          message: "This endpoint is available to patients only.",
        });
      }

      const { id, paymentId } = req.params;

      if (!isValidId(id) || !isValidId(paymentId)) {
        return res.status(400).json({
          message: "Invalid invoice or payment ID.",
        });
      }

      // Enforce invoice ownership in the database query.
      const invoice = await Invoice.findOne({
        _id: id,
        patient: req.user.id,
      })
        .populate("patient", "name email phone")
        .populate(
          "appointment",
          "treatment appointmentDate appointmentTime"
        )
        .lean();

      if (!invoice) {
        return res.status(404).json({
          message: "Invoice not found.",
        });
      }

      const payment = (invoice.payments || []).find(
        (entry) => String(entry._id) === String(paymentId)
      );

      if (!payment) {
        return res.status(404).json({
          message: "Payment receipt not found.",
        });
      }

      return generatePaymentReceiptPDF(invoice, payment, res);
    } catch (error) {
      console.error("Patient payment receipt error:", error);

      if (!res.headersSent) {
        return res.status(500).json({
          message: "Failed to generate payment receipt.",
        });
      }

      res.destroy(error);
    }
  }
);

// ============================================================
// ADMIN: CREATE INVOICE
// POST /api/invoices
// ============================================================

router.post("/", adminMiddleware, async (req, res) => {
  try {
    const {
      patient,
      appointment,
      items,
      discount = 0,
      tax = 0,
      notes = "",
    } = req.body;

    if (
      !patient ||
      !appointment ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "Patient, appointment, and at least one invoice item are required.",
      });
    }

    if (!isValidId(patient) || !isValidId(appointment)) {
      return res.status(400).json({
        message: "Invalid patient or appointment ID.",
      });
    }

    if (
      typeof discount !== "number" ||
      !Number.isFinite(discount) ||
      discount < 0 ||
      typeof tax !== "number" ||
      !Number.isFinite(tax) ||
      tax < 0
    ) {
      return res.status(400).json({
        message:
          "Discount and tax must be valid, non-negative numbers.",
      });
    }

    if (typeof notes !== "string") {
      return res.status(400).json({
        message: "Notes must be text.",
      });
    }

    // Confirm the appointment belongs to this patient.
    const appointmentRecord = await Appointment.findOne({
      _id: appointment,
      patient,
    });

    if (!appointmentRecord) {
      return res.status(404).json({
        message: "Appointment not found for the selected patient.",
      });
    }

    // Invoice generation is permitted only after completion.
    if (
      appointmentRecord.status !== "Completed" ||
      appointmentRecord.queueStatus !== "Completed"
    ) {
      return res.status(400).json({
        message:
          "The appointment must be completed before generating an invoice.",
      });
    }

    // Validate every invoice item on the server.
    const validatedItems = [];

    for (const item of items) {
      if (!item || typeof item !== "object") {
        return res.status(400).json({
          message: "Invalid invoice item.",
        });
      }

      const description =
        typeof item.description === "string"
          ? item.description.trim()
          : "";

      const quantity = item.quantity;
      const unitPrice = item.unitPrice;

      if (
        !description ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        typeof unitPrice !== "number" ||
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          message:
            "Each item needs a description, positive whole-number quantity, and valid unit price.",
        });
      }

      const normalizedUnitPrice = money(unitPrice);
      const amount = money(quantity * normalizedUnitPrice);

      validatedItems.push({
        description,
        quantity,
        unitPrice: normalizedUnitPrice,
        amount,
      });
    }

    const subtotal = money(
      validatedItems.reduce(
        (sum, item) => sum + item.amount,
        0
      )
    );

    const normalizedDiscount = money(discount);
    const normalizedTax = money(tax);

    if (normalizedDiscount > subtotal) {
      return res.status(400).json({
        message: "Discount cannot exceed the subtotal.",
      });
    }

    const totalAmount = money(
      subtotal - normalizedDiscount + normalizedTax
    );

    let invoice = null;
    let attempts = 0;

    // Retry if the generated invoice number conflicts with
    // a unique database index.
    while (!invoice && attempts < 5) {
      attempts += 1;

      try {
        invoice = await Invoice.create({
          invoiceNumber: generateInvoiceNumber(),
          patient,
          appointment,
          items: validatedItems,
          subtotal,
          discount: normalizedDiscount,
          tax: normalizedTax,
          totalAmount,
          amountPaid: 0,
          balanceDue: totalAmount,
          status: "Unpaid",
          payments: [],
          notes: notes.trim(),
          createdBy: req.user.id,
        });
      } catch (error) {
        if (error.code === 11000 && attempts < 5) {
          continue;
        }

        throw error;
      }
    }

    return res.status(201).json({
      message: "Invoice created successfully.",
      invoice,
    });
  } catch (error) {
    console.error("Creating invoice error:", error);

    return res.status(500).json({
      message: "Failed to create invoice.",
    });
  }
});

// ============================================================
// ADMIN: GET ALL INVOICES
// GET /api/invoices
// ============================================================

router.get("/", adminMiddleware, async (req, res) => {
  try {
    const invoices = await populateInvoice(
      Invoice.find()
    )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(invoices);
  } catch (error) {
    console.error("Fetching all invoices error:", error);

    return res.status(500).json({
      message: "Failed to fetch invoices.",
    });
  }
});

// ============================================================
// ADMIN: RECORD PAYMENT AND SEND CONFIRMATION EMAIL
// POST /api/invoices/:id/payments
// ============================================================

router.post("/:id/payments", adminMiddleware, async (req, res) => {
  try {
    const {
      amount,
      method,
      transactionReference = "",
    } = req.body;

    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID.",
      });
    }

    const allowedMethods = [
      "Cash",
      "UPI",
      "Card",
      "Bank Transfer",
    ];

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !allowedMethods.includes(method)
    ) {
      return res.status(400).json({
        message:
          "Enter a valid payment amount and payment method.",
      });
    }

    if (
      typeof transactionReference !== "string" ||
      transactionReference.trim().length > 200
    ) {
      return res.status(400).json({
        message: "Invalid transaction reference.",
      });
    }

    const normalizedAmount = money(amount);

    if (normalizedAmount <= 0) {
      return res.status(400).json({
        message: "Payment amount must be at least ₹0.01.",
      });
    }

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found.",
      });
    }

    const currentBalance = money(invoice.balanceDue);

    if (currentBalance <= 0) {
      return res.status(400).json({
        message: "This invoice has no outstanding balance.",
      });
    }

    if (normalizedAmount > currentBalance) {
      return res.status(400).json({
        message: `Payment exceeds the outstanding balance of ₹${currentBalance.toFixed(2)}.`,
      });
    }

    // Keep the previous paid amount for the email.
    const previousAmountPaid = money(
      Number(invoice.amountPaid || 0)
    );

    // Record the payment.
    invoice.payments.push({
      amount: normalizedAmount,
      method,
      transactionReference: transactionReference.trim(),
      paidAt: new Date(),
      receivedBy: req.user.id,
    });

    invoice.amountPaid = money(
      previousAmountPaid + normalizedAmount
    );

    invoice.balanceDue = money(
      Number(invoice.totalAmount) - invoice.amountPaid
    );

    if (invoice.balanceDue <= 0) {
      invoice.amountPaid = money(invoice.totalAmount);
      invoice.balanceDue = 0;
      invoice.status = "Paid";
    } else {
      invoice.status = "Partially Paid";
    }

    // Save the payment before attempting to send the email.
    await invoice.save();

    const savedPayment =
      invoice.payments[invoice.payments.length - 1];

    // Fetch the populated invoice for the response and email.
    const populatedInvoice = await populateInvoice(
      Invoice.findById(invoice._id)
    );

    if (!populatedInvoice) {
      console.error(
        "Payment saved, but invoice could not be reloaded:",
        String(invoice._id)
      );

      return res.status(200).json({
        message:
          "Payment recorded successfully, but invoice details could not be reloaded.",
        invoice: invoice.toObject(),
        payment: savedPayment,
        emailSent: false,
      });
    }

    // Email failure must not undo or misreport a saved payment.
    let emailSent = false;

    try {
      await sendPaymentConfirmationEmail(
        populatedInvoice,
        savedPayment,
        previousAmountPaid
      );

      emailSent = true;

      console.log(
        `Payment confirmation email sent for invoice ${invoice.invoiceNumber}.`
      );
    } catch (emailError) {
      console.error(
        `Payment was saved, but confirmation email failed for invoice ${invoice.invoiceNumber}:`,
        emailError.message
      );
    }

    const responseMessage =
      invoice.status === "Paid"
        ? "Payment recorded. Invoice is fully paid."
        : "Payment recorded successfully.";

    return res.status(200).json({
      message: emailSent
        ? `${responseMessage} Confirmation email sent.`
        : `${responseMessage} However, the confirmation email could not be sent.`,
      invoice: populatedInvoice,
      payment: savedPayment,
      emailSent,
    });
  } catch (error) {
    console.error("Recording payment error:", error);

    return res.status(500).json({
      message: "Failed to record payment.",
    });
  }
});

// ============================================================
// ADMIN: DOWNLOAD PAYMENT RECEIPT
// GET /api/invoices/:id/payments/:paymentId/receipt
// ============================================================

router.get(
  "/:id/payments/:paymentId/receipt",
  adminMiddleware,
  async (req, res) => {
    try {
      const { id, paymentId } = req.params;

      if (!isValidId(id) || !isValidId(paymentId)) {
        return res.status(400).json({
          message: "Invalid invoice or payment ID.",
        });
      }

      const invoice = await populateInvoice(
        Invoice.findById(id)
      ).lean();

      if (!invoice) {
        return res.status(404).json({
          message: "Invoice not found.",
        });
      }

      const payment = (invoice.payments || []).find(
        (entry) => String(entry._id) === String(paymentId)
      );

      if (!payment) {
        return res.status(404).json({
          message: "Payment receipt not found.",
        });
      }

      return generatePaymentReceiptPDF(invoice, payment, res);
    } catch (error) {
      console.error("Admin payment receipt error:", error);

      if (!res.headersSent) {
        return res.status(500).json({
          message: "Failed to generate payment receipt.",
        });
      }

      res.destroy(error);
    }
  }
);

// ============================================================
// ADMIN: GET SINGLE INVOICE AND PAYMENT HISTORY
// GET /api/invoices/:id
// ============================================================

router.get("/:id", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID.",
      });
    }

    const invoice = await Invoice.findById(id)
      .populate("patient", "name email phone")
      .populate(
        "appointment",
        "treatment appointmentDate appointmentTime"
      )
      .populate("payments.receivedBy", "name email")
      .populate("createdBy", "name email");

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found.",
      });
    }

    return res.status(200).json(invoice);
  } catch (error) {
    console.error("Fetching invoice error:", error);

    return res.status(500).json({
      message: "Failed to fetch invoice.",
    });
  }
});

// ============================================================
// ADMIN: DOWNLOAD INVOICE PDF
// GET /api/invoices/:id/pdf
// ============================================================

router.get("/:id/pdf", adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID.",
      });
    }

    const invoice = await Invoice.findById(id)
      .populate("patient", "name email phone")
      .populate(
        "appointment",
        "treatment appointmentDate appointmentTime"
      )
      .populate("payments.receivedBy", "name email")
      .populate("createdBy", "name email")
      .lean();

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found.",
      });
    }

    return generateInvoicePDF(invoice, res);
  } catch (error) {
    console.error("Admin invoice PDF error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to generate invoice PDF.",
      });
    }

    res.destroy(error);
  }
});

module.exports = router;
