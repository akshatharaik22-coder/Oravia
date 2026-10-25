const express = require("express");
const mongoose = require("mongoose");

const Invoice = require("../models/Invoice");
const Appointment = require("../models/Appointment");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

// ============================================================
// HELPER: VALIDATE MONGODB OBJECT IDS
// ============================================================

const isValidId = (id) => mongoose.isValidObjectId(id);

// ============================================================
// HELPER: CALCULATE MONEY TO TWO DECIMAL PLACES
// ============================================================

const money = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

// ============================================================
// HELPER: GENERATE INVOICE NUMBER
// ============================================================

const generateInvoiceNumber = () => {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `ORA-${datePart}-${randomPart}`;
};

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
      .populate("appointment", "treatment appointmentDate appointmentTime")
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
        message: "Patient, appointment, and at least one invoice item are required.",
      });
    }

    if (!isValidId(patient) || !isValidId(appointment)) {
      return res.status(400).json({
        message: "Invalid patient or appointment ID.",
      });
    }

    if (
      !Number.isFinite(discount) ||
      !Number.isFinite(tax) ||
      discount < 0 ||
      tax < 0
    ) {
      return res.status(400).json({
        message: "Discount and tax must be valid, non-negative numbers.",
      });
    }

    // Verify that the patient exists and the appointment belongs to them.
    const appointmentRecord = await Appointment.findOne({
      _id: appointment,
      patient,
    });

    if (!appointmentRecord) {
      return res.status(404).json({
        message: "Appointment not found for the selected patient.",
      });
    }

    // Only create bills for consultations that have been completed.
    if (
      appointmentRecord.status !== "Completed" ||
      appointmentRecord.queueStatus !== "Completed"
    ) {
      return res.status(400).json({
        message: "The appointment must be completed before generating an invoice.",
      });
    }

    // Calculate invoice amounts on the server.
    // Never trust item amounts or totals supplied by the frontend.
    const validatedItems = [];

    for (const item of items) {
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
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          message: "Each item needs a description, positive whole-number quantity, and valid unit price.",
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
      validatedItems.reduce((sum, item) => sum + item.amount, 0)
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

    // Retry if a randomly generated invoice number collides.
    let invoice;
    let attempts = 0;

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
          notes: typeof notes === "string" ? notes.trim() : "",
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
    const invoices = await Invoice.find()
      .populate("patient", "name email phone")
      .populate("appointment", "treatment appointmentDate appointmentTime")
      .sort({ createdAt: -1 });

    return res.status(200).json(invoices);
  } catch (error) {
    console.error("Fetching all invoices error:", error);

    return res.status(500).json({
      message: "Failed to fetch invoices.",
    });
  }
});

// ============================================================
// ADMIN: RECORD A PAYMENT
// POST /api/invoices/:id/payments
// ============================================================

router.post("/:id/payments", adminMiddleware, async (req, res) => {
  try {
    const { amount, method, transactionReference = "" } = req.body;

    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid invoice ID.",
      });
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !["Cash", "UPI", "Card", "Bank Transfer"].includes(method)
    ) {
      return res.status(400).json({
        message: "Enter a valid payment amount and payment method.",
      });
    }

    if (
      typeof transactionReference !== "string" ||
      transactionReference.length > 200
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

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found.",
      });
    }

    if (normalizedAmount > money(invoice.balanceDue)) {
      return res.status(400).json({
        message: `Payment exceeds the outstanding balance of ₹${money(invoice.balanceDue).toFixed(2)}.`,
      });
    }

    // Update payment history and balances.
    invoice.payments.push({
      amount: normalizedAmount,
      method,
      transactionReference: transactionReference.trim(),
      paidAt: new Date(),
      receivedBy: req.user.id,
    });

    invoice.amountPaid = money(invoice.amountPaid + normalizedAmount);
    invoice.balanceDue = money(invoice.totalAmount - invoice.amountPaid);

    if (invoice.balanceDue <= 0) {
      invoice.amountPaid = invoice.totalAmount;
      invoice.balanceDue = 0;
      invoice.status = "Paid";
    } else if (invoice.amountPaid > 0) {
      invoice.status = "Partially Paid";
    } else {
      invoice.status = "Unpaid";
    }

    await invoice.save();

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate("patient", "name email phone")
      .populate("appointment", "treatment appointmentDate appointmentTime");

    return res.status(200).json({
      message:
        invoice.status === "Paid"
          ? "Payment recorded. Invoice is fully paid."
          : "Payment recorded successfully.",
      invoice: populatedInvoice,
      payment: invoice.payments[invoice.payments.length - 1],
    });
  } catch (error) {
    console.error("Recording payment error:", error);

    return res.status(500).json({
      message: "Failed to record payment.",
    });
  }
});

// ============================================================
// ADMIN: GET SINGLE INVOICE AND PAYMENT HISTORY
// GET /api/invoices/:id
// ============================================================

router.get("/:id", adminMiddleware, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid invoice ID.",
      });
    }

    const invoice = await Invoice.findById(req.params.id)
      .populate("patient", "name email phone")
      .populate("appointment", "treatment appointmentDate appointmentTime")
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

module.exports = router;