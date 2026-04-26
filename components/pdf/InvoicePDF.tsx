"use client";

import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font,
} from "@react-pdf/renderer";
import { formatCurrency, numberToWords } from "@/lib/pdf";
import { formatADDate } from "@/lib/nepali-date";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 30, backgroundColor: "#ffffff" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, paddingBottom: 15, borderBottom: "2 solid #3b82f6" },
  schoolName: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1e3a5f" },
  schoolSub: { fontSize: 9, color: "#64748b", marginTop: 2 },
  invoiceTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#3b82f6", textAlign: "right" },
  invoiceNumber: { fontSize: 10, color: "#64748b", textAlign: "right" },
  section: { marginBottom: 15 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#94a3b8", textTransform: "uppercase", marginBottom: 6, letterSpacing: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#64748b", width: "40%" },
  value: { color: "#1e293b", fontFamily: "Helvetica-Bold", width: "60%" },
  table: { marginBottom: 15 },
  tableHeader: { flexDirection: "row", backgroundColor: "#1e293b", padding: "6 8", borderRadius: 4, marginBottom: 2 },
  tableHeaderText: { color: "#94a3b8", fontSize: 9, fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", padding: "5 8", borderBottom: "1 solid #f1f5f9" },
  tableCell: { color: "#374151" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", padding: "6 8", backgroundColor: "#eff6ff", marginTop: 5, borderRadius: 4 },
  totalLabel: { fontFamily: "Helvetica-Bold", color: "#1e40af" },
  totalValue: { fontFamily: "Helvetica-Bold", color: "#1e40af", fontSize: 13 },
  footer: { marginTop: 20, paddingTop: 10, borderTop: "1 solid #e2e8f0", textAlign: "center", color: "#94a3b8", fontSize: 8 },
  amountWords: { marginTop: 10, padding: "8 12", backgroundColor: "#f0fdf4", borderRadius: 4, color: "#166534", fontSize: 9, fontFamily: "Helvetica-Bold" },
  status: { padding: "3 8", borderRadius: 10, fontSize: 9, fontFamily: "Helvetica-Bold" },
});

interface InvoicePDFProps {
  invoice: {
    invoiceNumber: string;
    issuedDate: string | Date;
    dueDate: string | Date;
    status: string;
    items: { name: string; amount: number }[];
    subtotal: number;
    discount: number;
    discountReason?: string;
    lateFine: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    month?: string;
    academicYear: string;
    bsMonth?: string;
    bsYear?: string;
  };
  student: {
    name: string;
    studentId: string;
    class: string;
    section: string;
    rollNumber: number;
  };
  school?: {
    name: string;
    address: string;
    phone: string;
    email?: string;
  };
}

function InvoiceDocument({ invoice, student, school }: InvoicePDFProps) {
  const schoolInfo = school || {
    name: "School Name",
    address: "School Address, City",
    phone: "+977-XXXXXXXXXX",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.schoolName}>{schoolInfo.name}</Text>
            <Text style={styles.schoolSub}>{schoolInfo.address}</Text>
            <Text style={styles.schoolSub}>Tel: {schoolInfo.phone}</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}># {invoice.invoiceNumber}</Text>
          </View>
        </View>

        {/* Student & Invoice Info */}
        <View style={{ flexDirection: "row", gap: 20, marginBottom: 15 }}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#1e293b", marginBottom: 3 }}>{student.name}</Text>
            <Text style={{ color: "#64748b" }}>Student ID: {student.studentId}</Text>
            <Text style={{ color: "#64748b" }}>Class: {student.class} - {student.section}</Text>
            <Text style={{ color: "#64748b" }}>Roll No: {student.rollNumber}</Text>
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Issue Date:</Text>
              <Text style={styles.value}>{formatADDate(new Date(invoice.issuedDate))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Due Date:</Text>
              <Text style={styles.value}>{formatADDate(new Date(invoice.dueDate))}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Period:</Text>
              <Text style={styles.value}>{invoice.month || "—"} {invoice.academicYear}</Text>
            </View>
            {invoice.bsMonth && (
              <View style={styles.row}>
                <Text style={styles.label}>BS Period:</Text>
                <Text style={styles.value}>Month {invoice.bsMonth}, {invoice.bsYear}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Fee Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 3 }]}>Fee Type</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Amount</Text>
          </View>
          {invoice.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 3 }]}>{item.name}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: "right" }]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ alignItems: "flex-end" }}>
          <View style={{ width: 220 }}>
            <View style={[styles.row, { padding: "3 0" }]}>
              <Text style={{ color: "#64748b" }}>Subtotal:</Text>
              <Text style={{ color: "#1e293b" }}>{formatCurrency(invoice.subtotal)}</Text>
            </View>
            {invoice.discount > 0 && (
              <View style={[styles.row, { padding: "3 0" }]}>
                <Text style={{ color: "#16a34a" }}>Discount:</Text>
                <Text style={{ color: "#16a34a" }}>- {formatCurrency(invoice.discount)}</Text>
              </View>
            )}
            {invoice.lateFine > 0 && (
              <View style={[styles.row, { padding: "3 0" }]}>
                <Text style={{ color: "#dc2626" }}>Late Fine:</Text>
                <Text style={{ color: "#dc2626" }}>+ {formatCurrency(invoice.lateFine)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Due:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.dueAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Amount in words */}
        <View style={styles.amountWords}>
          <Text>Amount in Words: {numberToWords(invoice.dueAmount)}</Text>
        </View>

        <View style={styles.footer}>
          <Text>This is a computer-generated invoice. No signature required.</Text>
          <Text style={{ marginTop: 3 }}>Generated on {formatADDate(new Date())}</Text>
        </View>
      </Page>
    </Document>
  );
}

export function InvoicePDFDownload({ invoice, student, school, filename }: InvoicePDFProps & { filename?: string }) {
  return (
    <PDFDownloadLink
      document={<InvoiceDocument invoice={invoice} student={student} school={school} />}
      fileName={filename || `Invoice-${invoice.invoiceNumber}.pdf`}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
    >
      {({ loading }) => (loading ? "Generating..." : "Download Invoice PDF")}
    </PDFDownloadLink>
  );
}

export default InvoiceDocument;
