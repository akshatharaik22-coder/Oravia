
const PDFDocument = require("pdfkit");

// ============================================================
// SHARED HELPERS
// ============================================================

const money = (amount) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "0.00";
  }

  return numericAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (date) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getPatientName = (documentData) =>
  documentData?.patientName ||
  documentData?.patient?.name ||
  documentData?.patient?.fullName ||
  "Patient";

const safeFilename = (value, fallback = "document") => {
  const cleaned = String(value || fallback)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned.slice(0, 120) || fallback;
};

const setPDFHeaders = (res, filename) => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeFilename(filename)}.pdf"`
  );

  // Patient invoices, payment receipts and medical documents
  // should not be cached by browsers or intermediate proxies.
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
};

const handlePDFError = (error, res, documentName) => {
  console.error(`${documentName} PDF generation error:`, error);

  if (!res.headersSent) {
    return res.status(500).json({
      message: `Failed to generate ${documentName} PDF.`,
    });
  }

  if (!res.destroyed) {
    res.destroy(error);
  }
};

// ============================================================
// INVOICE PDF
// ============================================================

function generateInvoicePDF(invoice, res) {
  try {
    if (!invoice || typeof invoice !== "object") {
      return res.status(400).json({
        message: "Invalid invoice data.",
      });
    }

    const invoiceIdentifier =
      invoice.invoiceNumber || invoice._id || "invoice";

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
      bufferPages: true,
    });

    const filename = safeFilename(invoiceIdentifier, "invoice");

    setPDFHeaders(res, filename);

    doc.on("error", (error) => {
      handlePDFError(error, res, "invoice");
    });

    doc.pipe(res);

    const left = 50;
    const right = doc.page.width - 50;
    const contentWidth = right - left;

    // ----------------------------------------------------------
    // HEADER
    // ----------------------------------------------------------

    doc
      .font("Helvetica-Bold")
      .fontSize(25)
      .fillColor("#174C5A")
      .text("ORAVIA", left, 45);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#555555")
      .text("SMART DENTAL CARE", left, 76);

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor("#222222")
      .text("INVOICE", 350, 48, {
        width: right - 350,
        align: "right",
      });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#555555")
      .text(
        `Invoice ID: ${invoiceIdentifier}`,
        300,
        80,
        {
          width: right - 300,
          align: "right",
        }
      );

    doc
      .moveTo(left, 110)
      .lineTo(right, 110)
      .strokeColor("#174C5A")
      .lineWidth(1.5)
      .stroke();

    // ----------------------------------------------------------
    // PATIENT + INVOICE DETAILS
    // ----------------------------------------------------------

    const detailsY = 130;

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#174C5A")
      .text("BILL TO", left, detailsY);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#333333")
      .text(getPatientName(invoice), left, detailsY + 22, {
        width: 220,
        ellipsis: true,
      });

    const patientEmail =
      invoice.patient?.email || invoice.email || "";

    if (patientEmail) {
      doc.text(String(patientEmail), left, detailsY + 38, {
        width: 220,
        ellipsis: true,
      });
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#174C5A")
      .text("INVOICE DETAILS", 330, detailsY);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#333333")
      .text(
        `Date: ${formatDate(invoice.createdAt)}`,
        330,
        detailsY + 22
      );

    doc.text(
      `Status: ${invoice.status || "Unpaid"}`,
      330,
      detailsY + 38
    );

    // ----------------------------------------------------------
    // INVOICE ITEMS
    // ----------------------------------------------------------

    let y = 220;

    const drawItemsHeader = () => {
      doc
        .rect(left, y, contentWidth, 30)
        .fill("#174C5A");

      doc
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("Description", left + 10, y + 10, {
          width: 240,
        })
        .text("Qty", 315, y + 10, {
          width: 35,
          align: "center",
        })
        .text("Unit Price", 355, y + 10, {
          width: 75,
          align: "right",
        })
        .text("Amount", 435, y + 10, {
          width: 75,
          align: "right",
        });

      y += 30;
    };

    drawItemsHeader();

    const items = Array.isArray(invoice.items)
      ? invoice.items
      : [];

    if (items.length === 0) {
      doc
        .fillColor("#555555")
        .font("Helvetica")
        .fontSize(10)
        .text(
          "No invoice items available.",
          left + 10,
          y + 12
        );

      y += 35;
    } else {
      items.forEach((item, index) => {
        const quantity = Number(item.quantity);

        const safeQuantity =
          Number.isFinite(quantity) && quantity >= 0
            ? quantity
            : 0;

        const unitPrice = Number(item.unitPrice);

        const safeUnitPrice =
          Number.isFinite(unitPrice) && unitPrice >= 0
            ? unitPrice
            : 0;

        const storedAmount = Number(
          item.amount ?? item.total
        );

        const calculatedAmount =
          safeQuantity * safeUnitPrice;

        const amount =
          Number.isFinite(storedAmount) &&
          storedAmount >= 0
            ? storedAmount
            : calculatedAmount;

        const rowHeight = 30;

        if (y + rowHeight > 680) {
          doc.addPage();
          y = 60;
          drawItemsHeader();
        }

        if (index % 2 === 0) {
          doc
            .rect(left, y, contentWidth, rowHeight)
            .fill("#F1F7F8");
        }

        doc
          .fillColor("#333333")
          .font("Helvetica")
          .fontSize(9)
          .text(
            item.description ||
              item.name ||
              "Dental service",
            left + 10,
            y + 10,
            {
              width: 235,
              ellipsis: true,
            }
          )
          .text(String(safeQuantity), 315, y + 10, {
            width: 35,
            align: "center",
          })
          .text(
            `Rs. ${money(safeUnitPrice)}`,
            355,
            y + 10,
            {
              width: 75,
              align: "right",
            }
          )
          .text(
            `Rs. ${money(amount)}`,
            435,
            y + 10,
            {
              width: 75,
              align: "right",
            }
          );

        y += rowHeight;
      });
    }

    // ----------------------------------------------------------
    // TOTALS
    // ----------------------------------------------------------

    if (y + 180 > 700) {
      doc.addPage();
      y = 70;
    } else {
      y += 20;
    }

    const subtotal = Number(invoice.subtotal);
    const discount = Number(invoice.discount);
    const tax = Number(invoice.tax);
    const total = Number(invoice.totalAmount);
    const paid = Number(invoice.amountPaid);
    const balance = Number(invoice.balanceDue);

    const safeSubtotal =
      Number.isFinite(subtotal) ? subtotal : 0;

    const safeDiscount =
      Number.isFinite(discount) ? discount : 0;

    const safeTax =
      Number.isFinite(tax) ? tax : 0;

    const safeTotal =
      Number.isFinite(total) ? total : 0;

    const safePaid =
      Number.isFinite(paid) ? paid : 0;

    const safeBalance =
      Number.isFinite(balance) ? balance : 0;

    const drawTotalRow = (
      label,
      value,
      bold = false
    ) => {
      doc
        .font(
          bold
            ? "Helvetica-Bold"
            : "Helvetica"
        )
        .fontSize(bold ? 11 : 10)
        .fillColor(
          bold ? "#174C5A" : "#333333"
        )
        .text(label, 320, y, {
          width: 100,
          align: "right",
        })
        .text(
          `Rs. ${money(value)}`,
          425,
          y,
          {
            width: 85,
            align: "right",
          }
        );

      y += 20;
    };

    drawTotalRow(
      "Subtotal:",
      safeSubtotal
    );

    drawTotalRow(
      "Discount:",
      safeDiscount
    );

    drawTotalRow(
      "Tax:",
      safeTax
    );

    drawTotalRow(
      "Total:",
      safeTotal,
      true
    );

    drawTotalRow(
      "Amount Paid:",
      safePaid
    );

    drawTotalRow(
      "Balance Due:",
      safeBalance,
      true
    );

    // ----------------------------------------------------------
    // NOTES
    // ----------------------------------------------------------

    if (
      invoice.notes &&
      String(invoice.notes).trim()
    ) {
      const notes = String(invoice.notes).trim();

      const notesHeight = doc.heightOfString(
        notes,
        {
          width: contentWidth,
          font: "Helvetica",
          fontSize: 9,
          lineGap: 2,
        }
      );

      if (
        y + notesHeight + 55 >
        doc.page.height - 80
      ) {
        doc.addPage();
        y = 70;
      } else {
        y += 12;
      }

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("#174C5A")
        .text("Notes", left, y);

      y += 16;

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#333333")
        .text(notes, left, y, {
          width: contentWidth,
          lineGap: 2,
        });

      y = doc.y;
    }

    // ----------------------------------------------------------
    // FOOTER
    // ----------------------------------------------------------

    const footerY = Math.min(
      Math.max(y + 25, 730),
      doc.page.height - 70
    );

    doc
      .moveTo(left, footerY)
      .lineTo(right, footerY)
      .strokeColor("#D5E1E3")
      .lineWidth(1)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#174C5A")
      .text(
        "Thank you for choosing ORAVIA!",
        left,
        footerY + 15,
        {
          width: contentWidth,
          align: "center",
        }
      );

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#777777")
      .text(
        "Please retain this invoice for your records.",
        left,
        footerY + 33,
        {
          width: contentWidth,
          align: "center",
        }
      );

    doc.end();
  } catch (error) {
    return handlePDFError(
      error,
      res,
      "invoice"
    );
  }
}

// ============================================================
// PAYMENT RECEIPT PDF
// ============================================================

function generatePaymentReceiptPDF(
  invoice,
  payment,
  res
) {
  try {
    if (
      !invoice ||
      typeof invoice !== "object" ||
      !payment ||
      typeof payment !== "object"
    ) {
      return res.status(400).json({
        message: "Invalid payment receipt data.",
      });
    }

    const invoiceNumber = safeFilename(
      invoice.invoiceNumber ||
        invoice._id ||
        "invoice",
      "invoice"
    );

    const paymentIndex =
      Array.isArray(invoice.payments)
        ? invoice.payments.findIndex(
            (entry) =>
              String(entry._id) ===
              String(payment._id)
          )
        : -1;

    const receiptNumber = payment._id
      ? `OR-${String(payment._id)
          .slice(-10)
          .toUpperCase()}`
      : `OR-${invoiceNumber}-${Math.max(
          paymentIndex + 1,
          1
        )}`;

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    });

    setPDFHeaders(res, receiptNumber);

    doc.on("error", (error) => {
      handlePDFError(
        error,
        res,
        "payment receipt"
      );
    });

    doc.pipe(res);

    const left = 50;
    const right = doc.page.width - 50;
    const pageWidth = right - left;

    // ----------------------------------------------------------
    // BRAND HEADER
    // ----------------------------------------------------------

    doc
      .font("Helvetica-Bold")
      .fontSize(28)
      .fillColor("#174C5A")
      .text("ORAVIA", left, 48);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64767E")
      .text(
        "SMART DENTAL CARE",
        left,
        82
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(19)
      .fillColor("#222222")
      .text(
        "PAYMENT RECEIPT",
        left,
        125,
        {
          width: pageWidth,
          align: "center",
        }
      );

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64767E")
      .text(
        "Payment acknowledgement",
        left,
        153,
        {
          width: pageWidth,
          align: "center",
        }
      );

    doc
      .moveTo(left, 185)
      .lineTo(right, 185)
      .strokeColor("#174C5A")
      .lineWidth(1.5)
      .stroke();

    // ----------------------------------------------------------
    // RECEIPT METADATA
    // ----------------------------------------------------------

    let y = 215;

    const drawDetail = (
      label,
      value,
      x,
      detailY,
      width = 220
    ) => {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#71818A")
        .text(label, x, detailY, {
          width,
        });

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#253E46")
        .text(
          String(value || "N/A"),
          x,
          detailY + 17,
          {
            width,
            lineBreak: false,
            ellipsis: true,
          }
        );
    };

    drawDetail(
      "RECEIPT NUMBER",
      receiptNumber,
      left,
      y
    );

    drawDetail(
      "PAYMENT DATE",
      formatDate(payment.paidAt),
      330,
      y
    );

    y += 65;

    drawDetail(
      "PATIENT NAME",
      getPatientName(invoice),
      left,
      y
    );

    drawDetail(
      "INVOICE NUMBER",
      invoice.invoiceNumber ||
        invoice._id ||
        "N/A",
      330,
      y
    );

    y += 65;

    drawDetail(
      "PAYMENT METHOD",
      payment.method || "N/A",
      left,
      y
    );

    drawDetail(
      "TRANSACTION REFERENCE",
      payment.transactionReference ||
        "Not provided",
      330,
      y
    );

    y += 80;

    // ----------------------------------------------------------
    // AMOUNT RECEIVED
    // ----------------------------------------------------------

    doc
      .roundedRect(
        left,
        y,
        pageWidth,
        100,
        12
      )
      .fill("#EAF4F5");

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("#526C74")
      .text(
        "AMOUNT RECEIVED",
        left + 20,
        y + 20,
        {
          width: pageWidth - 40,
          align: "center",
        }
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(27)
      .fillColor("#174C5A")
      .text(
        `Rs. ${money(payment.amount)}`,
        left + 20,
        y + 43,
        {
          width: pageWidth - 40,
          align: "center",
        }
      );

    y += 130;

    // ----------------------------------------------------------
    // PAYMENT SUMMARY
    // ----------------------------------------------------------

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#174C5A")
      .text(
        "INVOICE PAYMENT SUMMARY",
        left,
        y
      );

    y += 28;

    const drawSummaryRow = (
      label,
      amount,
      bold = false
    ) => {
      doc
        .font(
          bold
            ? "Helvetica-Bold"
            : "Helvetica"
        )
        .fontSize(11)
        .fillColor(
          bold ? "#174C5A" : "#333333"
        )
        .text(label, left + 5, y, {
          width: 250,
        })
        .text(
          `Rs. ${money(amount)}`,
          350,
          y,
          {
            width: 150,
            align: "right",
          }
        );

      y += 27;
    };

    drawSummaryRow(
      "Invoice total",
      invoice.totalAmount
    );

    drawSummaryRow(
      "Total paid to date",
      invoice.amountPaid
    );

    drawSummaryRow(
      "Remaining balance",
      invoice.balanceDue,
      true
    );

    y += 18;

    const status =
      invoice.status || "Unpaid";

    const isPaid = status === "Paid";

    doc
      .roundedRect(
        left,
        y,
        pageWidth,
        36,
        8
      )
      .fill(
        isPaid
          ? "#E2F7ED"
          : "#FFF3DC"
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(
        isPaid
          ? "#14734B"
          : "#865800"
      )
      .text(
        `Invoice status: ${status}`,
        left + 12,
        y + 12,
        {
          width: pageWidth - 24,
          align: "center",
        }
      );

    y += 65;

    // ----------------------------------------------------------
    // FOOTER
    // ----------------------------------------------------------

    doc
      .moveTo(left, y)
      .lineTo(right, y)
      .strokeColor("#D5E1E3")
      .lineWidth(1)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#174C5A")
      .text(
        "Thank you for choosing ORAVIA!",
        left,
        y + 18,
        {
          width: pageWidth,
          align: "center",
        }
      );

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#71818A")
      .text(
        "This receipt acknowledges the payment recorded against the invoice shown above.",
        left,
        y + 40,
        {
          width: pageWidth,
          align: "center",
        }
      );

    doc.end();
  } catch (error) {
    return handlePDFError(
      error,
      res,
      "payment receipt"
    );
  }
}

// ============================================================
// MEDICAL RECORD PDF
// Generates a prescription or dental treatment report
// ============================================================

function generateMedicalRecordPDF(
  record,
  res,
  documentType = "report"
) {
  try {
    if (
      !record ||
      typeof record !== "object"
    ) {
      return res.status(400).json({
        message: "Invalid medical record data.",
      });
    }

    const isPrescription =
      documentType === "prescription";

    const patientName =
      record.patient?.name ||
      record.patient?.fullName ||
      "Patient";

    const appointment =
      record.appointment || {};

    const safePatientName =
      safeFilename(
        patientName,
        "Patient"
      ).slice(0, 60);

    const documentTitle =
      isPrescription
        ? "PRESCRIPTION"
        : "DENTAL TREATMENT REPORT";

    const filename = `ORAVIA_${documentType}_${safePatientName}_${String(
      record._id || "record"
    ).slice(-8)}`;

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
      bufferPages: true,
    });

    setPDFHeaders(res, filename);

    doc.on("error", (error) => {
      handlePDFError(
        error,
        res,
        "medical record"
      );
    });

    doc.pipe(res);

    const left = 50;
    const right = doc.page.width - 50;
    const width = right - left;

    // ----------------------------------------------------------
    // HEADER
    // ----------------------------------------------------------

    doc
      .font("Helvetica-Bold")
      .fontSize(27)
      .fillColor("#174C5A")
      .text("ORAVIA", left, 45);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64767E")
      .text(
        "SMART DENTAL CARE",
        left,
        78
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(17)
      .fillColor("#222222")
      .text(
        documentTitle,
        left,
        112,
        {
          width,
          align: "right",
        }
      );

    doc
      .moveTo(left, 145)
      .lineTo(right, 145)
      .strokeColor("#174C5A")
      .lineWidth(1.5)
      .stroke();

    // ----------------------------------------------------------
    // PATIENT DETAILS
    // ----------------------------------------------------------

    let y = 170;

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#174C5A")
      .text(
        "PATIENT DETAILS",
        left,
        y
      );

    y += 25;

    const drawDetail = (
      label,
      value,
      x,
      detailY,
      detailWidth = 220
    ) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#64767E")
        .text(label, x, detailY, {
          width: detailWidth,
        });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#253E46")
        .text(
          String(
            value || "Not recorded"
          ),
          x,
          detailY + 14,
          {
            width: detailWidth,
          }
        );
    };

    drawDetail(
      "PATIENT NAME",
      patientName,
      left,
      y
    );

    drawDetail(
      "VISIT DATE",
      formatDate(record.visitDate),
      330,
      y
    );

    y += 48;

    drawDetail(
      "TREATMENT",
      record.treatment,
      left,
      y
    );

    drawDetail(
      "APPOINTMENT DATE",
      formatDate(
        appointment.appointmentDate
      ),
      330,
      y
    );

    y += 60;

    doc
      .moveTo(left, y)
      .lineTo(right, y)
      .strokeColor("#D5E1E3")
      .lineWidth(1)
      .stroke();

    y += 25;

    // ----------------------------------------------------------
    // PAGE MANAGEMENT
    // ----------------------------------------------------------

    const ensureSpace = (
      requiredHeight = 80
    ) => {
      const bottomLimit =
        doc.page.height - 80;

      if (
        y + requiredHeight >
        bottomLimit
      ) {
        doc.addPage();
        y = 55;
        return true;
      }

      return false;
    };

    // ----------------------------------------------------------
    // CLINICAL INFORMATION
    // ----------------------------------------------------------

    const drawSection = (
      heading,
      content
    ) => {
      if (
        content === undefined ||
        content === null ||
        !String(content).trim()
      ) {
        return;
      }

      const text = String(content).trim();

      const textHeight =
        doc.heightOfString(text, {
          width,
          font: "Helvetica",
          fontSize: 10,
          lineGap: 3,
        });

      const requiredHeight =
        Math.min(
          textHeight + 45,
          doc.page.height - 135
        );

      ensureSpace(requiredHeight);

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#174C5A")
        .text(
          heading,
          left,
          y,
          {
            width,
          }
        );

      y += 19;

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#333333")
        .text(
          text,
          left,
          y,
          {
            width,
            lineGap: 3,
          }
        );

      y = doc.y + 22;

      // If the text itself reached close to the footer,
      // start the next section on a fresh page.
      if (
        y >
        doc.page.height - 90
      ) {
        doc.addPage();
        y = 55;
      }
    };

    if (isPrescription) {
      drawSection(
        "PRESCRIPTION",
        record.prescription
      );

      drawSection(
        "MEDICATIONS",
        record.medications
      );

      if (
        !String(
          record.prescription || ""
        ).trim() &&
        !String(
          record.medications || ""
        ).trim()
      ) {
        drawSection(
          "PRESCRIPTION INFORMATION",
          "No prescription or medication details have been recorded."
        );
      }
    } else {
      drawSection(
        "DENTAL NOTES",
        record.dentalNotes
      );

      drawSection(
        "TREATMENT PROVIDED",
        record.treatment
      );

      drawSection(
        "MEDICATIONS",
        record.medications
      );

      drawSection(
        "PRESCRIPTION",
        record.prescription
      );

      drawSection(
        "ADDITIONAL NOTES",
        record.additionalNotes
      );
    }

    // ----------------------------------------------------------
    // FOOTER
    // ----------------------------------------------------------

    const footerY =
      doc.page.height - 65;

    doc
      .moveTo(left, footerY)
      .lineTo(right, footerY)
      .strokeColor("#D5E1E3")
      .lineWidth(1)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#71818A")
      .text(
        "Confidential medical document. Please keep it secure.",
        left,
        footerY + 12,
        {
          width,
          align: "center",
        }
      );

    doc.end();
  } catch (error) {
    return handlePDFError(
      error,
      res,
      "medical record"
    );
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  generateInvoicePDF,
  generatePaymentReceiptPDF,
  generateMedicalRecordPDF,
};

