"use client";

import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from "@react-pdf/renderer";
import { formatCurrency, numberToWords } from "@/lib/pdf";
import { formatADDate } from "@/lib/nepali-date";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 25, backgroundColor: "#ffffff" },
  header: { backgroundColor: "#1e40af", padding: 15, borderRadius: 6, marginBottom: 15 },
  schoolName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  schoolSub: { fontSize: 8, color: "#bfdbfe", marginTop: 2 },
  receiptTitle: { fontSize: 10, color: "#bfdbfe", textAlign: "right" },
  receiptNum: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#ffffff", textAlign: "right" },
  box: { border: "1 solid #e2e8f0", borderRadius: 6, padding: 12, marginBottom: 10 },
  boxTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#64748b" },
  value: { fontFamily: "Helvetica-Bold", color: "#1e293b" },
  amountBox: { backgroundColor: "#eff6ff", border: "2 solid #3b82f6", borderRadius: 6, padding: 12, marginBottom: 10 },
  amountLabel: { fontSize: 9, color: "#3b82f6", fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  amountValue: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#1e40af", marginTop: 3 },
  words: { fontSize: 8, color: "#64748b", marginTop: 3, fontStyle: "italic" },
  footer: { marginTop: 15, paddingTop: 10, borderTop: "1 solid #e2e8f0" },
  footerText: { fontSize: 8, color: "#94a3b8", textAlign: "center" },
  stamp: { marginTop: 20, flexDirection: "row", justifyContent: "space-between" },
  stampBox: { width: "45%", borderTop: "1 solid #1e293b", paddingTop: 5, textAlign: "center", fontSize: 8, color: "#64748b" },
});

interface ReceiptPDFProps {
  payment: {
    receiptNumber: string;
    amount: number;
    paymentMethod: string;
    paymentDate: string | Date;
    transactionRef?: string;
    bsDate?: string;
  };
  invoice: {
    invoiceNumber: string;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    month?: string;
    academicYear: string;
  };
  student: {
    name: string;
    studentId: string;
    class: string;
    section: string;
  };
  school?: { name: string; address: string; phone: string };
}

function ReceiptDocument({ payment, invoice, student, school }: ReceiptPDFProps) {
  const schoolInfo = school || { name: "School Name", address: "School Address", phone: "+977-XXXXXXXXXX" };

  return (
    <Document>
      <Page size={[420, 595]} style={styles.page}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={styles.schoolName}>{schoolInfo.name}</Text>
              <Text style={styles.schoolSub}>{schoolInfo.address} | {schoolInfo.phone}</Text>
            </View>
            <View>
              <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
              <Text style={styles.receiptNum}>#{payment.receiptNumber}</Text>
            </View>
          </View>
        </View>

        {/* Student Info */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Student Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{student.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Student ID:</Text>
            <Text style={styles.value}>{student.studentId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Class:</Text>
            <Text style={styles.value}>Class {student.class} - {student.section}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Payment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Invoice No:</Text>
            <Text style={styles.value}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Period:</Text>
            <Text style={styles.value}>{invoice.month || "—"} {invoice.academicYear}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Date:</Text>
            <Text style={styles.value}>{formatADDate(new Date(payment.paymentDate))}</Text>
          </View>
          {payment.bsDate && (
            <View style={styles.row}>
              <Text style={styles.label}>BS Date:</Text>
              <Text style={styles.value}>{payment.bsDate}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method:</Text>
            <Text style={styles.value}>{payment.paymentMethod.toUpperCase()}</Text>
          </View>
          {payment.transactionRef && (
            <View style={styles.row}>
              <Text style={styles.label}>Transaction Ref:</Text>
              <Text style={styles.value}>{payment.transactionRef}</Text>
            </View>
          )}
        </View>

        {/* Amount */}
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
          <Text style={styles.words}>{numberToWords(payment.amount)}</Text>
        </View>

        {invoice.dueAmount > 0 && (
          <View style={[styles.box, { backgroundColor: "#fff7ed" }]}>
            <View style={styles.row}>
              <Text style={{ color: "#c2410c", fontFamily: "Helvetica-Bold" }}>Remaining Balance:</Text>
              <Text style={{ color: "#c2410c", fontFamily: "Helvetica-Bold" }}>{formatCurrency(invoice.dueAmount)}</Text>
            </View>
          </View>
        )}

        <View style={styles.stamp}>
          <View style={styles.stampBox}><Text>Collected By</Text></View>
          <View style={styles.stampBox}><Text>School Stamp</Text></View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>This is a computer-generated receipt. Thank you for your payment!</Text>
          <Text style={[styles.footerText, { marginTop: 2 }]}>Generated: {formatADDate(new Date())}</Text>
        </View>
      </Page>
    </Document>
  );
}

export function ReceiptPDFDownload({ payment, invoice, student, school, filename }: ReceiptPDFProps & { filename?: string }) {
  return (
    <PDFDownloadLink
      document={<ReceiptDocument payment={payment} invoice={invoice} student={student} school={school} />}
      fileName={filename || `Receipt-${payment.receiptNumber}.pdf`}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
    >
      {({ loading }) => (loading ? "Generating..." : "Download Receipt")}
    </PDFDownloadLink>
  );
}

export default ReceiptDocument;
