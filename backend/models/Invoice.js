const mongoose = require("mongoose");

// ============================================================
// MONEY HELPERS
// ============================================================

const roundMoney = (value) =>
  Math.round(
    (Number(value) + Number.EPSILON) * 100
  ) / 100;

const isFiniteNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

// ============================================================
// INVOICE ITEM
// ============================================================

const invoiceItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: "Quantity must be a positive whole number.",
      },
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isFiniteNumber,
        message: "Unit price must be a valid number.",
      },
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isFiniteNumber,
        message: "Amount must be a valid number.",
      },
    },
  },
  {
    _id: true,
  }
);

// ============================================================
// PAYMENT
// ============================================================

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0.01,
      validate: {
        validator: isFiniteNumber,
        message: "Payment amount must be a valid number.",
      },
    },

    method: {
      type: String,
      enum: [
        "Cash",
        "UPI",
        "Card",
        "Bank Transfer",
      ],
      required: true,
    },

    transactionReference: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    paidAt: {
      type: Date,
      default: Date.now,
    },

    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    _id: true,
  }
);

// ============================================================
// INVOICE
// ============================================================

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      maxlength: 100,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },

    items: {
      type: [invoiceItemSchema],
      required: true,
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,
        message: "An invoice must contain at least one item.",
      },
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isFiniteNumber,
        message: "Subtotal must be a valid number.",
      },
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: isFiniteNumber,
        message: "Discount must be a valid number.",
      },
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: isFiniteNumber,
        message: "Tax must be a valid number.",
      },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isFiniteNumber,
        message: "Total amount must be a valid number.",
      },
    },

    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: isFiniteNumber,
        message: "Amount paid must be a valid number.",
      },
    },

    balanceDue: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isFiniteNumber,
        message: "Balance due must be a valid number.",
      },
    },

    status: {
      type: String,
      enum: [
        "Unpaid",
        "Partially Paid",
        "Paid",
      ],
      default: "Unpaid",
    },

    payments: {
      type: [paymentSchema],
      default: [],
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

// Fast patient invoice lookup.
invoiceSchema.index({
  patient: 1,
  createdAt: -1,
});

// Fast appointment lookup.
invoiceSchema.index({
  appointment: 1,
});

// Fast invoice status queries.
invoiceSchema.index({
  status: 1,
  createdAt: -1,
});

// ============================================================
// FINANCIAL CONSISTENCY VALIDATION
// ============================================================

invoiceSchema.pre("validate", function (next) {
  try {
    const subtotal = roundMoney(this.subtotal);
    const discount = roundMoney(this.discount);
    const tax = roundMoney(this.tax);
    const totalAmount = roundMoney(this.totalAmount);
    const amountPaid = roundMoney(this.amountPaid);
    const balanceDue = roundMoney(this.balanceDue);

    const financialValues = [
      subtotal,
      discount,
      tax,
      totalAmount,
      amountPaid,
      balanceDue,
    ];

    if (!financialValues.every(Number.isFinite)) {
      return next(
        new Error(
          "Invoice financial values must be finite numbers."
        )
      );
    }

    if (
      financialValues.some((value) => value < 0)
    ) {
      return next(
        new Error(
          "Invoice financial values cannot be negative."
        )
      );
    }

    if (discount > subtotal) {
      return next(
        new Error(
          "Invoice discount cannot exceed subtotal."
        )
      );
    }

    // Verify each item's amount.
    for (const item of this.items || []) {
      if (
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1
      ) {
        return next(
          new Error(
            "Invoice item quantity must be a positive whole number."
          )
        );
      }

      if (
        !isFiniteNumber(item.unitPrice) ||
        item.unitPrice < 0 ||
        !isFiniteNumber(item.amount) ||
        item.amount < 0
      ) {
        return next(
          new Error(
            "Invoice item prices and amounts must be valid non-negative numbers."
          )
        );
      }

      const expectedItemAmount = roundMoney(
        item.quantity * item.unitPrice
      );

      if (
        Math.abs(expectedItemAmount - item.amount) > 0.001
      ) {
        return next(
          new Error(
            "Invoice item amount does not match quantity multiplied by unit price."
          )
        );
      }
    }

    // Verify subtotal matches item amounts.
    const expectedSubtotal = roundMoney(
      (this.items || []).reduce(
        (sum, item) => sum + item.amount,
        0
      )
    );

    if (
      Math.abs(expectedSubtotal - subtotal) > 0.001
    ) {
      return next(
        new Error(
          "Invoice subtotal does not match its item amounts."
        )
      );
    }

    // Verify invoice total.
    const expectedTotal = roundMoney(
      subtotal - discount + tax
    );

    if (
      Math.abs(expectedTotal - totalAmount) > 0.001
    ) {
      return next(
        new Error(
          "Invoice total does not match subtotal, discount, and tax."
        )
      );
    }

    if (amountPaid > totalAmount + 0.001) {
      return next(
        new Error(
          "Amount paid cannot exceed the invoice total."
        )
      );
    }

    // Verify payment history matches the recorded amount paid.
    const payments = this.payments || [];

    const paymentTotal = roundMoney(
      payments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      )
    );

    if (
      payments.some(
        (payment) =>
          !isFiniteNumber(payment.amount) ||
          payment.amount <= 0
      )
    ) {
      return next(
        new Error(
          "Every recorded payment must have a positive valid amount."
        )
      );
    }

    if (
      Math.abs(paymentTotal - amountPaid) > 0.001
    ) {
      return next(
        new Error(
          "Amount paid does not match the payment history."
        )
      );
    }

    // Verify outstanding balance.
    const expectedBalance = roundMoney(
      totalAmount - amountPaid
    );

    if (
      Math.abs(expectedBalance - balanceDue) > 0.001
    ) {
      return next(
        new Error(
          "Invoice balance does not match total amount and amount paid."
        )
      );
    }

    // Verify status.
    if (balanceDue === 0) {
      if (this.status !== "Paid") {
        return next(
          new Error(
            "A fully paid invoice must have Paid status."
          )
        );
      }
    } else if (amountPaid > 0) {
      if (this.status !== "Partially Paid") {
        return next(
          new Error(
            "An invoice with a partial payment must have Partially Paid status."
          )
        );
      }
    } else if (this.status !== "Unpaid") {
      return next(
        new Error(
          "An unpaid invoice must have Unpaid status."
        )
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model(
  "Invoice",
  invoiceSchema
);