const express = require("express");
const mongoose = require("mongoose");

const {
  generateInvoicePDF,
  generatePaymentReceiptPDF,
} = require("../utils/pdfGenerator");

const Invoice = require("../models/Invoice");
const Appointment = require("../models/Appointment");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  sendPaymentConfirmationEmail,
} = require("../utils/sendEmail");

const router = express.Router();

const PAYMENT_METHODS = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
];

const MAX_ITEMS = 100;
const MAX_ITEM_DESCRIPTION_LENGTH = 500;
const MAX_NOTES_LENGTH = 5000;
const MAX_TRANSACTION_REFERENCE_LENGTH = 200;

const isValidId = (id) => mongoose.isValidObjectId(id);

const money = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    throw new Error("Invalid monetary value.");
  }

  const rounded =
    Math.round((amount + Number.EPSILON) * 100) / 100;

  if (!Number.isFinite(rounded)) {
    throw new Error("Monetary value is outside the supported range.");
  }

  return rounded;
};

const isNonNegativeNumber = (value) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 0;

const generateInvoiceNumber = () => {
  const date = new Date();

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart = Math.random()
    .toString(36)
    .slice(2, 10)
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

const sendPdfError = (res, error, message) => {
  console.error(message, error);

  if (!res.headersSent) {
    return res.status(500).json({
      message,
    });
  }

  return res.destroy(error);
};

const getInvoiceStatus = (totalAmount, amountPaid) => {
  const balance = money(totalAmount - amountPaid);

  if (balance <= 0) {
    return "Paid";
  }

  if (amountPaid > 0) {
    return "Partially Paid";
  }

  return "Unpaid";
};

const normalizeInvoiceItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      "At least one invoice item is required."
    );
  }

  if (items.length > MAX_ITEMS) {
    throw new Error(
      `An invoice cannot contain more than ${MAX_ITEMS} items.`
    );
  }

  return items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Invalid invoice item.");
    }

    const description =
      typeof item.description === "string"
        ? item.description.trim()
        : "";

    const { quantity, unitPrice } = item;

    if (
      !description ||
      description.length > MAX_ITEM_DESCRIPTION_LENGTH
    ) {
      throw new Error(
        "Each item must have a valid description of at most 500 characters."
      );
    }

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      throw new Error(
        "Each item must have a positive whole-number quantity."
      );
    }

    if (
      typeof unitPrice !== "number" ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      throw new Error(
        "Each item must have a valid non-negative unit price."
      );
    }

    const normalizedUnitPrice = money(unitPrice);
    const amount = money(quantity * normalizedUnitPrice);

    if (!Number.isFinite(amount)) {
      throw new Error("Invalid invoice item amount.");
    }

    return {
      description,
      quantity,
      unitPrice: normalizedUnitPrice,
      amount,
    };
  });
};

const calculateInvoiceTotals = ({
  items,
  discount,
  tax,
}) => {
  if (!isNonNegativeNumber(discount)) {
    throw new Error(
      "Discount must be a valid non-negative number."
    );
  }

  if (!isNonNegativeNumber(tax)) {
    throw new Error(
      "Tax must be a valid non-negative number."
    );
  }

  const subtotal = money(
    items.reduce((sum, item) => sum + item.amount, 0)
  );

  const normalizedDiscount = money(discount);
  const normalizedTax = money(tax);

  if (normalizedDiscount > subtotal) {
    throw new Error(
      "Discount cannot exceed the subtotal."
    );
  }

  const totalAmount = money(
    subtotal - normalizedDiscount + normalizedTax
  );

  if (totalAmount < 0) {
    throw new Error(
      "Invoice total cannot be negative."
    );
  }

  return {
    subtotal,
    discount: normalizedDiscount,
    tax: normalizedTax,
    totalAmount,
  };
};

const getRequestError = (error) => ({
  message: error.message,
});

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

router.get(
  "/mine/:id/pdf",
  authMiddleware,
  async (req, res) => {
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

      // Ownership is enforced in the database query.
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

      return await generateInvoicePDF(invoice, res);
    } catch (error) {
      return sendPdfError(
        res,
        error,
        "Failed to generate invoice PDF."
      );
    }
  }
);

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

      return await generatePaymentReceiptPDF(
        invoice,
        payment,
        res
      );
    } catch (error) {
      return sendPdfError(
        res,
        error,
        "Failed to generate payment receipt."
      );
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

    if (!patient || !appointment) {
      return res.status(400).json({
        message: "Patient and appointment are required.",
      });
    }

    if (!isValidId(patient) || !isValidId(appointment)) {
      return res.status(400).json({
        message: "Invalid patient or appointment ID.",
      });
    }

    if (typeof notes !== "string") {
      return res.status(400).json({
        message: "Notes must be text.",
      });
    }

    if (notes.length > MAX_NOTES_LENGTH) {
      return res.status(400).json({
        message: "Notes cannot exceed 5000 characters.",
      });
    }

    const patientUser = await User.findOne({
      _id: patient,
      role: "patient",
    }).select("_id");

    if (!patientUser) {
      return res.status(404).json({
        message: "Patient account not found.",
      });
    }

    const appointmentRecord = await Appointment.findOne({
      _id: appointment,
      patient,
    });

    if (!appointmentRecord) {
      return res.status(404).json({
        message: "Appointment not found for the selected patient.",
      });
    }

    if (
      appointmentRecord.status !== "Completed" ||
      appointmentRecord.queueStatus !== "Completed"
    ) {
      return res.status(400).json({
        message:
          "The appointment must be completed before generating an invoice.",
      });
    }

    // This check improves feedback but is not concurrency-safe by itself.
    // A unique database index is required to enforce one invoice per appointment.
    const existingInvoice = await Invoice.findOne({
      appointment,
    }).select("_id invoiceNumber");

    if (existingInvoice) {
      return res.status(409).json({
        message:
          "An invoice already exists for this appointment.",
        invoiceId: existingInvoice._id,
        invoiceNumber: existingInvoice.invoiceNumber,
      });
    }

    const validatedItems = normalizeInvoiceItems(items);

    const totals = calculateInvoiceTotals({
      items: validatedItems,
      discount,
      tax,
    });

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
          ...totals,
          amountPaid: 0,
          balanceDue: totals.totalAmount,
          status: totals.totalAmount === 0 ? "Paid" : "Unpaid",
          payments: [],
          notes: notes.trim(),
          createdBy: req.user.id,
        });
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate invoice number or appointment index.
          const existing = await Invoice.findOne({
            appointment,
          }).select("_id invoiceNumber");

          if (existing) {
            return res.status(409).json({
              message:
                "An invoice already exists for this appointment.",
              invoiceId: existing._id,
              invoiceNumber: existing.invoiceNumber,
            });
          }

          if (attempts < 5) {
            continue;
          }
        }

        throw error;
      }
    }

    if (!invoice) {
      return res.status(500).json({
        message: "Failed to generate a unique invoice number.",
      });
    }

    return res.status(201).json({
      message: "Invoice created successfully.",
      invoice,
    });
  } catch (error) {
    if (
      error.message &&
      (
        error.message.includes("invoice item") ||
        error.message.includes("Discount") ||
        error.message.includes("Tax") ||
        error.message.includes("subtotal") ||
        error.message.includes("quantity") ||
        error.message.includes("description") ||
        error.message.includes("unit price") ||
        error.message.includes("Monetary value") ||
        error.message.includes("monetary value")
      )
    ) {
      return res.status(400).json(getRequestError(error));
    }

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
// ADMIN: RECORD PAYMENT
// POST /api/invoices/:id/payments
// ============================================================

router.post(
  "/:id/payments",
  adminMiddleware,
  async (req, res) => {
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

      if (
        typeof amount !== "number" ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !PAYMENT_METHODS.includes(method)
      ) {
        return res.status(400).json({
          message:
            "Enter a valid payment amount and payment method.",
        });
      }

      if (
        typeof transactionReference !== "string" ||
        transactionReference.trim().length >
          MAX_TRANSACTION_REFERENCE_LENGTH
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

      /*
       * Use a conditional atomic update to ensure the payment
       * cannot exceed the latest outstanding balance.
       *
       * The filter compares the current amountPaid with the
       * amountPaid value used to calculate the proposed payment.
       * If another payment updates the invoice first, this
       * operation fails and can be retried by the client.
       */

      let updatedInvoice = null;
      let previousAmountPaid = 0;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const currentInvoice = await Invoice.findById(id);

        if (!currentInvoice) {
          return res.status(404).json({
            message: "Invoice not found.",
          });
        }

        const totalAmount = money(currentInvoice.totalAmount);
        previousAmountPaid = money(currentInvoice.amountPaid);

        const calculatedBalance = money(
          totalAmount - previousAmountPaid
        );

        if (calculatedBalance <= 0) {
          return res.status(400).json({
            message: "This invoice has no outstanding balance.",
          });
        }

        if (normalizedAmount > calculatedBalance) {
          return res.status(400).json({
            message: `Payment exceeds the outstanding balance of ₹${calculatedBalance.toFixed(2)}.`,
          });
        }

        const nextAmountPaid = money(
          previousAmountPaid + normalizedAmount
        );

        const nextBalance = money(
          totalAmount - nextAmountPaid
        );

        const nextStatus = getInvoiceStatus(
          totalAmount,
          nextAmountPaid
        );

        updatedInvoice = await Invoice.findOneAndUpdate(
          {
            _id: id,
            amountPaid: currentInvoice.amountPaid,
            balanceDue: currentInvoice.balanceDue,
          },
          {
            $set: {
              amountPaid: nextAmountPaid,
              balanceDue: nextBalance,
              status: nextStatus,
            },
            $push: {
              payments: {
                amount: normalizedAmount,
                method,
                transactionReference:
                  transactionReference.trim(),
                paidAt: new Date(),
                receivedBy: req.user.id,
              },
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

        if (updatedInvoice) {
          break;
        }
      }

      if (!updatedInvoice) {
        return res.status(409).json({
          message:
            "The invoice was updated by another request. Refresh the invoice and try again.",
        });
      }

      const savedPayment =
        updatedInvoice.payments[
          updatedInvoice.payments.length - 1
        ];

      let populatedInvoice = await populateInvoice(
        Invoice.findById(updatedInvoice._id)
      )
        .populate("payments.receivedBy", "name email")
        .populate("createdBy", "name email");

      if (!populatedInvoice) {
        return res.status(200).json({
          message:
            "Payment recorded successfully, but invoice details could not be reloaded.",
          invoice: updatedInvoice.toObject(),
          payment: savedPayment,
          emailSent: false,
        });
      }

      let emailSent = false;

      try {
        await sendPaymentConfirmationEmail(
          populatedInvoice,
          savedPayment,
          previousAmountPaid
        );

        emailSent = true;
      } catch (emailError) {
        console.error(
          `Payment saved, but confirmation email failed for invoice ${updatedInvoice.invoiceNumber}:`,
          emailError.message
        );
      }

      const responseMessage =
        updatedInvoice.status === "Paid"
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

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "The payment failed validation.",
        });
      }

      return res.status(500).json({
        message: "Failed to record payment.",
      });
    }
  }
);

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
      )
        .populate("payments.receivedBy", "name email")
        .populate("createdBy", "name email")
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

      return await generatePaymentReceiptPDF(
        invoice,
        payment,
        res
      );
    } catch (error) {
      return sendPdfError(
        res,
        error,
        "Failed to generate payment receipt."
      );
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

    return await generateInvoicePDF(invoice, res);
  } catch (error) {
    return sendPdfError(
      res,
      error,
      "Failed to generate invoice PDF."
    );
  }
});

module.exports = router;