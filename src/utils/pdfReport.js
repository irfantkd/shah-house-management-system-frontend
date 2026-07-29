import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Palette [r, g, b] ─────────────────────────────────────────────────────────
const NAVY = [11, 29, 58];
const WHITE = [255, 255, 255];
const GR = [21, 128, 61]; // green  — cash in
const RD = [185, 28, 28]; // red    — cash out
const GY50 = [249, 250, 251]; // alternate row tint
const GY200 = [229, 231, 235]; // borders / dividers
const GY300 = [209, 213, 219]; // stronger border
const SL = [15, 23, 42]; // primary text (dark)
const SL5 = [71, 85, 105]; // secondary text
const SL4 = [100, 116, 139]; // muted labels

const ML = 14; // left / right margin
const PW = 210; // A4 width  (mm)
const PH = 297; // A4 height (mm)
const UW = 182; // usable width  (PW − 2 × ML)

const fm = (n) =>
  Number(n).toLocaleString("en-AE", { maximumFractionDigits: 0 });
const fd = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const tod = () =>
  new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

// ── Header band ───────────────────────────────────────────────────────────────
function drawHeader(
  doc,
  walletLabel,
  periodLabel,
  accentColor,
  propertyName,
  propertyType,
) {
  // Background
  doc.setFillColor(...(accentColor ?? NAVY));
  doc.rect(0, 0, PW, 32, "F");

  // Thin accent stripe at very top
  doc.setFillColor(255, 255, 255, 0.15);
  doc.rect(0, 0, PW, 1.2, "F");

  // Brand name left — property name
  const brand = propertyName ?? "Property Management";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text(brand, ML, 12);

  // Property type tag
  if (propertyType) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(185, 210, 235);
    doc.text(propertyType.toUpperCase(), ML, 18.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "  ·  Dubai, United Arab Emirates  ·  Property & Expense Management System",
      ML + doc.getTextWidth(propertyType.toUpperCase()),
      18.5,
    );
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(185, 210, 235);
    doc.text(
      "Dubai, United Arab Emirates  ·  Property & Expense Management System",
      ML,
      18.5,
    );
  }

  // Statement info right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...WHITE);
  doc.text("STATEMENT OF ACCOUNT", PW - ML, 11.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(185, 210, 235);
  doc.text(walletLabel, PW - ML, 17.5, { align: "right" });
  doc.text(`Period: ${periodLabel}   Generated: ${tod()}`, PW - ML, 24.5, {
    align: "right",
  });
}

// ── Account info line ─────────────────────────────────────────────────────────
function drawInfoLine(doc, y, walletLabel, periodLabel, txCount, propertyName) {
  doc.setFillColor(...GY50);
  doc.setDrawColor(...GY200);
  doc.setLineWidth(0.3);
  doc.rect(ML, y, UW, 11, "FD");

  const holder = propertyName ?? "Property Management";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SL5);
  doc.text(
    `Property: ${holder}   ·   Wallet: ${walletLabel}   ·   Period: ${periodLabel}   ·   Transactions: ${txCount}`,
    ML + 4,
    y + 7,
  );
  return y + 11;
}

// ── Single-row stat container (4 columns, vertical dividers) ──────────────────
function drawStatRow(doc, y, items) {
  const H = 28;
  const CW = UW / items.length;

  // Container background + border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...GY300);
  doc.setLineWidth(0.35);
  doc.rect(ML, y, UW, H, "FD");

  items.forEach(({ label, value, sub, vc }, i) => {
    const cx = ML + i * CW;
    const tx = cx + 5;

    // Vertical divider between columns
    if (i > 0) {
      doc.setDrawColor(...GY200);
      doc.setLineWidth(0.25);
      doc.line(cx, y + 2, cx, y + H - 2);
    }

    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...SL4);
    doc.text(label.toUpperCase(), tx, y + 8);

    // Value — large
    doc.setFont("helvetica", "bold");
    doc.setFontSize(items.length <= 4 ? 11.5 : 9.5);
    doc.setTextColor(...(vc ?? SL));
    doc.text(value, tx, y + 19);

    // Sub label
    if (sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...SL4);
      doc.text(sub, tx, y + 25.5);
    }
  });

  return y + H + 5;
}

// ── Section label + horizontal rule ──────────────────────────────────────────
function sectionLabel(doc, y, text) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...SL5);
  doc.text(text.toUpperCase(), ML, y + 4);

  doc.setDrawColor(...GY300);
  doc.setLineWidth(0.35);
  doc.line(ML, y + 6, ML + UW, y + 6);

  return y + 9;
}

// ── Per-page footer ───────────────────────────────────────────────────────────
function pageFooter(doc, pageNum, propertyName) {
  doc.setDrawColor(...GY200);
  doc.setLineWidth(0.3);
  doc.line(ML, PH - 12, ML + UW, PH - 12);

  const footerProp = propertyName ?? "Property Management";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...SL4);
  doc.text(
    `${footerProp}  ·  Dubai, United Arab Emirates  ·  Confidential`,
    ML,
    PH - 7.5,
  );
  doc.text(`Page ${pageNum}`, PW - ML, PH - 7.5, { align: "right" });
}

// ── Totals summary strip ──────────────────────────────────────────────────────
function totalsStrip(doc, y, count, cashIn, cashOut) {
  const net = cashIn - cashOut;

  doc.setFillColor(...GY50);
  doc.setDrawColor(...GY300);
  doc.setLineWidth(0.35);
  doc.rect(ML, y, UW, 10, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);

  doc.setTextColor(...SL5);
  doc.text(`${count} transaction${count !== 1 ? "s" : ""}`, ML + 4, y + 7);

  doc.setTextColor(...GR);
  doc.text(`Cash In: +AED ${fm(cashIn)}`, ML + 53, y + 7);

  doc.setTextColor(...RD);
  doc.text(`Cash Out: -AED ${fm(cashOut)}`, ML + 110, y + 7);

  const netColor = net >= 0 ? GR : RD;
  doc.setTextColor(...netColor);
  doc.text(
    `Net: ${net >= 0 ? "+" : "-"}AED ${fm(Math.abs(net))}`,
    ML + UW - 2,
    y + 7,
    { align: "right" },
  );
}

// ── Shared table config ───────────────────────────────────────────────────────
const TABLE_STYLES = {
  fontSize: 8,
  cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
  lineColor: GY200,
  lineWidth: 0.2,
  textColor: SL,
  overflow: "linebreak",
  valign: "middle",
};

const HEAD_STYLES = {
  fillColor: NAVY,
  textColor: WHITE,
  fontSize: 7.5,
  fontStyle: "bold",
  cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
};

const ALT_ROW = { fillColor: GY50 };

// ─────────────────────────────────────────────────────────────────────────────
//  SINGLE WALLET PDF
// ─────────────────────────────────────────────────────────────────────────────
// Column layout (total = 182 mm):
//   Date(24) | Description(86) | Cash In+(24) | Cash Out-(24) | Balance(24)
// ─────────────────────────────────────────────────────────────────────────────
export function downloadSingleWalletPDF({
  walletLabel,
  walletColor,
  wallet,
  transactions,
  byMonth,
  periodLabel,
  propertyName,
  propertyType,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  drawHeader(
    doc,
    walletLabel,
    periodLabel,
    walletColor ?? NAVY,
    propertyName,
    propertyType,
  );

  let y = 36;

  y =
    drawInfoLine(
      doc,
      y,
      walletLabel,
      periodLabel,
      transactions.length,
      propertyName,
    ) + 4;

  // Computed figures
  const bal = wallet.balance ?? 0;
  const total = wallet.totalDeposited ?? 0;
  const pct = total > 0 ? Math.round((bal / total) * 100) : 0;
  const cashIn = transactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);
  const cashOut = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  y = drawStatRow(doc, y, [
    {
      label: "Current Balance",
      value: `AED ${fm(bal)}`,
      sub: `${pct}% of budget remaining`,
    },
    {
      label: "Total Deposited",
      value: `AED ${fm(total)}`,
      sub: "All-time deposits",
    },
    {
      label: "Cash In  (+)",
      value: `AED ${fm(cashIn)}`,
      sub: `Deposits — ${periodLabel}`,
      vc: GR,
    },
    {
      label: "Cash Out  (−)",
      value: `AED ${fm(cashOut)}`,
      sub: `Expenses — ${periodLabel}`,
      vc: RD,
    },
  ]);

  // ── Monthly breakdown ─────────────────────────────────────────────────────
  if (byMonth && byMonth.length > 0) {
    y = sectionLabel(doc, y, "Monthly Overview — Last 6 Months");

    autoTable(doc, {
      startY: y,
      head: [
        ["Month", "Cash In (+)  AED", "Cash Out (−)  AED", "Net Movement  AED"],
      ],
      body: byMonth
        .slice()
        .reverse()
        .map((m) => {
          const lbl = new Date(m.key + "-01").toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          });
          const net = m.deposited - m.spent;
          return [
            lbl,
            `AED ${fm(m.deposited)}`,
            `AED ${fm(m.spent)}`,
            `${net >= 0 ? "+" : "-"}AED ${fm(Math.abs(net))}`,
          ];
        }),
      styles: { ...TABLE_STYLES, fontSize: 8 },
      headStyles: HEAD_STYLES,
      alternateRowStyles: ALT_ROW,
      columnStyles: {
        0: { cellWidth: 60 },
        1: {
          cellWidth: 40.7,
          halign: "right",
          fontStyle: "bold",
          textColor: GR,
        },
        2: {
          cellWidth: 40.7,
          halign: "right",
          fontStyle: "bold",
          textColor: RD,
        },
        3: { cellWidth: 40.6, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (d) => {
        if (d.section === "body" && d.column.index === 3)
          d.cell.styles.textColor = d.cell.text.join("").startsWith("+")
            ? GR
            : RD;
      },
      rowPageBreak: "avoid",
      margin: { left: ML, right: ML },
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  y = sectionLabel(
    doc,
    y,
    `Transaction Details  ·  ${periodLabel}  ·  ${transactions.length} Record${transactions.length !== 1 ? "s" : ""}`,
  );

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Date",
        "Description / Note",
        "Cash In  (+)",
        "Cash Out  (−)",
        "Balance",
      ],
    ],
    body: transactions.length
      ? transactions.map((t) => [
          fd(t.date),
          t.type === "credit"
            ? t.note || "Deposit received"
            : t.description || "Expense deducted",
          t.type === "credit" ? `+AED ${fm(t.amount)}` : "",
          t.type === "debit"  ? `-AED ${fm(t.amount)}` : "",
          `AED ${fm(t.balanceAfter ?? 0)}`,
        ])
      : [["", "No transactions recorded for this period.", "", "", ""]],
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    alternateRowStyles: ALT_ROW,
    columnStyles: {
      0: { cellWidth: 24, textColor: SL5 },
      1: { cellWidth: 86 }, // wide — full description
      2: { cellWidth: 24, halign: "right", fontStyle: "bold", textColor: GR },
      3: { cellWidth: 24, halign: "right", fontStyle: "bold", textColor: RD },
      4: { cellWidth: 24, halign: "right", textColor: SL5 },
    },
    didParseCell: (d) => {
      if (
        d.section === "body" &&
        (d.column.index === 2 || d.column.index === 3) &&
        d.cell.text.join("") === ""
      )
        d.cell.styles.textColor = GY200; // invisible blank cells
    },
    rowPageBreak: "avoid",
    didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
    margin: { left: ML, right: ML },
  });

  totalsStrip(
    doc,
    doc.lastAutoTable.finalY,
    transactions.length,
    cashIn,
    cashOut,
  );

  const propSlug = (propertyName ?? "Property").replace(/\s+/g, "-");
  doc.save(
    `${propSlug}-${walletLabel.replace(/\s+/g, "-")}-${periodLabel.replace(/[\s/]+/g, "-")}-Statement.pdf`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMBINED WALLET PDF
// ─────────────────────────────────────────────────────────────────────────────
// Column layout (total = 182 mm):
//   Date(24) | Wallet(20) | Description(66) | Cash In+(24) | Cash Out-(24) | Balance(24)
// ─────────────────────────────────────────────────────────────────────────────
export function downloadCombinedWalletPDF({
  vWallet,
  hWallet,
  transactions,
  periodLabel,
  propertyName,
  propertyType,
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  drawHeader(
    doc,
    "Vehicle Wallet  +  Home Wallet",
    periodLabel,
    NAVY,
    propertyName,
    propertyType,
  );

  let y = 36;

  y =
    drawInfoLine(
      doc,
      y,
      "All Wallets Combined",
      periodLabel,
      transactions.length,
      propertyName,
    ) + 4;

  const vBal = vWallet.balance ?? 0;
  const hBal = hWallet.balance ?? 0;
  const vTotal = vWallet.totalDeposited ?? 0;
  const hTotal = hWallet.totalDeposited ?? 0;
  const cashIn = transactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);
  const cashOut = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  // Row 1 — wallet balances
  y = drawStatRow(doc, y, [
    {
      label: "Vehicle Wallet Balance",
      value: `AED ${fm(vBal)}`,
      sub: `of AED ${fm(vTotal)} deposited`,
    },
    {
      label: "Home Wallet Balance",
      value: `AED ${fm(hBal)}`,
      sub: `of AED ${fm(hTotal)} deposited`,
    },
    {
      label: "Cash In  (+)",
      value: `AED ${fm(cashIn)}`,
      sub: `Deposits — ${periodLabel}`,
      vc: GR,
    },
    {
      label: "Cash Out  (−)",
      value: `AED ${fm(cashOut)}`,
      sub: `Expenses — ${periodLabel}`,
      vc: RD,
    },
  ]);

  // ── Transactions ──────────────────────────────────────────────────────────
  y = sectionLabel(
    doc,
    y,
    `Transaction Details  ·  ${periodLabel}  ·  ${transactions.length} Record${transactions.length !== 1 ? "s" : ""}`,
  );

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Date",
        "Wallet",
        "Description / Note",
        "Cash In  (+)",
        "Cash Out  (−)",
        "Balance",
      ],
    ],
    body: transactions.length
      ? transactions.map((t) => [
          fd(t.date),
          t.walletType === "vehicle" ? "Vehicle" : "Home",
          t.type === "credit"
            ? t.note || "Deposit received"
            : t.description || "Expense deducted",
          t.type === "credit" ? `+AED ${fm(t.amount)}` : "",
          t.type === "debit"  ? `-AED ${fm(t.amount)}` : "",
          `AED ${fm(t.balanceAfter ?? 0)}`,
        ])
      : [["", "", "No transactions recorded for this period.", "", "", ""]],
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    alternateRowStyles: ALT_ROW,
    columnStyles: {
      0: { cellWidth: 24, textColor: SL5 },
      1: { cellWidth: 20, fontStyle: "bold" },
      2: { cellWidth: 66 }, // full description
      3: { cellWidth: 24, halign: "right", fontStyle: "bold", textColor: GR },
      4: { cellWidth: 24, halign: "right", fontStyle: "bold", textColor: RD },
      5: { cellWidth: 24, halign: "right", textColor: SL5 },
    },
    didParseCell: (d) => {
      if (d.section === "body") {
        if (d.column.index === 1)
          d.cell.styles.textColor =
            d.cell.text.join("") === "Vehicle" ? NAVY : GR;
        if (
          (d.column.index === 3 || d.column.index === 4) &&
          d.cell.text.join("") === ""
        )
          d.cell.styles.textColor = GY200;
      }
    },
    rowPageBreak: "avoid",
    didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
    margin: { left: ML, right: ML },
  });

  totalsStrip(
    doc,
    doc.lastAutoTable.finalY,
    transactions.length,
    cashIn,
    cashOut,
  );

  const propSlug = (propertyName ?? "Property").replace(/\s+/g, "-");
  doc.save(
    `${propSlug}-All-Wallets-${periodLabel.replace(/[\s/]+/g, "-")}-Statement.pdf`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  WALLET CSV STATEMENT
// ─────────────────────────────────────────────────────────────────────────────
export function downloadWalletCSV({ transactions, walletLabel, periodLabel, propertyName }) {
  const headers = [
    "Date",
    "Wallet",
    "Type",
    "Description / Note",
    "Cash In AED",
    "Cash Out AED",
    "Balance After AED",
  ];

  const WALLET_LABEL = { vehicle: "Vehicle", home: "Home", salary: "Salary" };

  const rows = transactions.map((t) => [
    t.date,
    WALLET_LABEL[t.walletType] ?? t.walletType,
    t.type === "credit" ? "Deposit" : "Expense",
    t.type === "credit" ? (t.note || "Deposit") : (t.description || "Expense"),
    t.type === "credit" ? t.amount : "",
    t.type === "debit"  ? t.amount : "",
    t.balanceAfter ?? "",
  ]);

  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${(propertyName ?? "Property").replace(/\s+/g, "-")}-${walletLabel.replace(/\s+/g, "-")}-${periodLabel.replace(/[\s/]+/g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
//  SALARY / PAYROLL PDF
// ─────────────────────────────────────────────────────────────────────────────
// Employee summary table  +  full payment history
// ─────────────────────────────────────────────────────────────────────────────
const PURPLE = [76, 29, 149];

export function downloadSalaryPDF({
  employees,
  salaryWallet,
  periodLabel,
  propertyName,
  propertyType,
}) {
  const CUR_MON = new Date().toISOString().slice(0, 7);
  const fmtMonth = (m) =>
    new Date(m + "-01").toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });

  const active = (employees ?? []).filter((e) => e.status === "active");
  const monthlyPayroll = active.reduce(
    (s, e) => s + Number(e.monthlySalary),
    0,
  );
  const allPayments = (employees ?? []).flatMap((emp) =>
    (emp.salaryHistory ?? [])
      .filter((p) => p.type === "salary")
      .map((p) => ({ ...p, empName: emp.name, empRole: emp.role })),
  );
  const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  drawHeader(
    doc,
    "Employee Salary Wallet",
    periodLabel,
    PURPLE,
    propertyName,
    propertyType,
  );

  let y = 36;

  y =
    drawInfoLine(
      doc,
      y,
      "Payroll Statement",
      periodLabel,
      (employees ?? []).length,
      propertyName,
    ) + 4;

  y = drawStatRow(doc, y, [
    {
      label: "Total Employees",
      value: String((employees ?? []).length),
      sub: `${active.length} active`,
    },
    {
      label: "Monthly Payroll",
      value: `AED ${fm(monthlyPayroll)}`,
      sub: "Active staff total",
    },
    {
      label: "Wallet Balance",
      value: `AED ${fm(salaryWallet?.balance ?? 0)}`,
      sub: "Current available funds",
    },
    {
      label: "Total Disbursed",
      value: `AED ${fm(totalPaid)}`,
      sub: "All-time salary payments",
      vc: RD,
    },
  ]);

  // ── Employee summary table ────────────────────────────────────────────────
  y = sectionLabel(doc, y, "Employee Payroll Summary");

  autoTable(doc, {
    startY: y,
    head: [
      ["Employee", "Role", "Nationality", "Monthly Salary", "Paid This Month", "Status"],
    ],
    body: (employees ?? []).map((emp) => {
      const paidThisMonth = (emp.salaryHistory ?? []).some(
        (p) => p.type === "salary" && p.month === CUR_MON,
      );
      return [
        emp.name,
        emp.role,
        emp.nationality || "—",
        `AED ${fm(emp.monthlySalary)}`,
        paidThisMonth ? "Paid" : "Unpaid",
        emp.status === "active" ? "Active" : "Inactive",
      ];
    }),
    styles: TABLE_STYLES,
    headStyles: { ...HEAD_STYLES, fillColor: PURPLE },
    alternateRowStyles: ALT_ROW,
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: 32 },
      2: { cellWidth: 28 },
      3: { cellWidth: 30, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 25, halign: "center", fontStyle: "bold" },
      5: { cellWidth: 25, halign: "center" },
    },
    didParseCell: (d) => {
      if (d.section === "body") {
        if (d.column.index === 4) {
          d.cell.styles.textColor =
            d.cell.text.join("") === "Paid" ? GR : RD;
        }
        if (d.column.index === 5) {
          d.cell.styles.textColor =
            d.cell.text.join("") === "Active" ? GR : SL4;
        }
      }
    },
    rowPageBreak: "avoid",
    didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
    margin: { left: ML, right: ML },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Payment history table ─────────────────────────────────────────────────
  const sortedPayments = [...allPayments].sort(
    (a, b) => new Date(b.paidOn) - new Date(a.paidOn),
  );

  y = sectionLabel(
    doc,
    y,
    `Payment History  ·  ${sortedPayments.length} Record${sortedPayments.length !== 1 ? "s" : ""}`,
  );

  autoTable(doc, {
    startY: y,
    head: [["Date Paid", "Employee", "Role", "For Month", "Amount (AED)", "Notes"]],
    body: sortedPayments.length
      ? sortedPayments.map((p) => [
          fd(p.paidOn),
          p.empName,
          p.empRole,
          fmtMonth(p.month),
          `-AED ${fm(p.amount)}`,
          p.notes || "—",
        ])
      : [["", "", "", "No payments recorded.", "", ""]],
    styles: TABLE_STYLES,
    headStyles: { ...HEAD_STYLES, fillColor: PURPLE },
    alternateRowStyles: ALT_ROW,
    columnStyles: {
      0: { cellWidth: 26, textColor: SL5 },
      1: { cellWidth: 40, fontStyle: "bold" },
      2: { cellWidth: 30 },
      3: { cellWidth: 36 },
      4: { cellWidth: 26, halign: "right", fontStyle: "bold", textColor: RD },
      5: { cellWidth: 24 },
    },
    rowPageBreak: "avoid",
    didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
    margin: { left: ML, right: ML },
  });

  totalsStrip(
    doc,
    doc.lastAutoTable.finalY,
    sortedPayments.length,
    0,
    totalPaid,
  );

  const propSlug = (propertyName ?? "Property").replace(/\s+/g, "-");
  doc.save(
    `${propSlug}-Payroll-${periodLabel.replace(/[\s/]+/g, "-")}.pdf`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  VEHICLE FLEET REPORT PDF
// ─────────────────────────────────────────────────────────────────────────────
// Sections:
//   1. Header band (navy)
//   2. Fleet totals stat row
//   3. Per-vehicle summary table (sorted by total spend)
//   4. Monthly trend table (12 months)
//   5. Per-vehicle detail (expenses + fuel + maintenance rows)
// ─────────────────────────────────────────────────────────────────────────────
export function downloadFleetReportPDF({
  report,
  periodLabel,
  propertyName,
  propertyType,
  vehicleFilter = "all",
  typeFilter    = "all",
}) {
  const BLUE   = [37, 99, 235];
  const AMBER  = [180, 83, 9];
  const PURP   = [109, 40, 217];

  const { perCar, fleetTotals, monthlyTrend } = report;

  // Apply vehicle filter
  const cars = vehicleFilter === "all"
    ? [...perCar].sort((a, b) => b.totals.combined - a.totals.combined)
    : perCar.filter((c) => c.carId === vehicleFilter);

  // Recompute totals if filtered
  const totals = vehicleFilter === "all" ? fleetTotals : cars.reduce(
    (acc, c) => ({
      expenses:    acc.expenses    + c.totals.expenses,
      fuel:        acc.fuel        + c.totals.fuel,
      maintenance: acc.maintenance + c.totals.maintenance,
      combined:    acc.combined    + c.totals.combined,
      liters:      acc.liters      + c.totals.liters,
    }),
    { expenses: 0, fuel: 0, maintenance: 0, combined: 0, liters: 0 },
  );

  const showExp  = typeFilter === "all" || typeFilter === "expenses";
  const showFuel = typeFilter === "all" || typeFilter === "fuel";
  const showMnt  = typeFilter === "all" || typeFilter === "maintenance";

  const reportTitle = vehicleFilter === "all"
    ? "VEHICLE FLEET COST REPORT"
    : `VEHICLE REPORT — ${(cars[0]?.nickname || `${cars[0]?.make} ${cars[0]?.model}`) ?? "Vehicle"}`.toUpperCase();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 34, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text(propertyName ?? "Property Management", ML, 12);

  if (propertyType) {
    doc.setFontSize(6.5);
    doc.setTextColor(185, 210, 235);
    doc.text(
      `${propertyType.toUpperCase()}  ·  Dubai, United Arab Emirates  ·  Fleet Management System`,
      ML, 18.5,
    );
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...WHITE);
  doc.text(reportTitle, PW - ML, 11.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(185, 210, 235);
  doc.text(`Period: ${periodLabel}`, PW - ML, 17.5, { align: "right" });
  doc.text(`Generated: ${tod()}`, PW - ML, 24.5, { align: "right" });

  let y = 38;

  // ── Stat row ─────────────────────────────────────────────────────────────
  const statItems = [];
  if (showExp)  statItems.push({ label: "Fleet Expenses",   value: `AED ${fm(totals.expenses)}`,    sub: `${cars.reduce((s,c) => s + c.totals.expenseCount, 0)} records`,     vc: BLUE  });
  if (showFuel) statItems.push({ label: "Fleet Fuel",       value: `AED ${fm(totals.fuel)}`,        sub: `${fm(totals.liters)} litres`,                                        vc: AMBER });
  if (showMnt)  statItems.push({ label: "Maintenance",      value: `AED ${fm(totals.maintenance)}`, sub: `${cars.reduce((s,c) => s + c.totals.maintenanceCount, 0)} records`, vc: PURP  });
  statItems.push({ label: "Total Fleet Cost",  value: `AED ${fm(totals.combined)}`,  sub: periodLabel });

  y = drawStatRow(doc, y, statItems);

  // ── Per-vehicle summary table ─────────────────────────────────────────────
  y = sectionLabel(doc, y, `Vehicle Breakdown  ·  ${cars.length} Vehicle${cars.length !== 1 ? "s" : ""}  ·  Sorted by Spend`);

  const summaryHead = ["Vehicle", "Plate", "Driver"];
  if (showExp)  summaryHead.push("Expenses");
  if (showFuel) summaryHead.push("Fuel");
  if (showMnt)  summaryHead.push("Maintenance");
  summaryHead.push("Total");
  if (vehicleFilter === "all") summaryHead.push("% Fleet");

  const summaryBody = cars.map((c) => {
    const pct = totals.combined > 0 ? ((c.totals.combined / totals.combined) * 100).toFixed(1) + "%" : "—";
    const row = [
      c.nickname || `${c.make} ${c.model}`,
      c.plateNumber || "—",
      c.driverName || "—",
    ];
    if (showExp)  row.push(`AED ${fm(c.totals.expenses)}`);
    if (showFuel) row.push(`AED ${fm(c.totals.fuel)}`);
    if (showMnt)  row.push(`AED ${fm(c.totals.maintenance)}`);
    row.push(`AED ${fm(c.totals.combined)}`);
    if (vehicleFilter === "all") row.push(pct);
    return row;
  });

  // Totals footer row
  const totalRow = ["", "TOTAL", ""];
  if (showExp)  totalRow.push(`AED ${fm(totals.expenses)}`);
  if (showFuel) totalRow.push(`AED ${fm(totals.fuel)}`);
  if (showMnt)  totalRow.push(`AED ${fm(totals.maintenance)}`);
  totalRow.push(`AED ${fm(totals.combined)}`);
  if (vehicleFilter === "all") totalRow.push("100%");
  summaryBody.push(totalRow);

  // Dynamic column widths
  const colCount = summaryHead.length;
  const fixedW   = vehicleFilter === "all" ? 42 + 22 + 28 : 50 + 28 + 32; // vehicle + plate + driver
  const dataW    = (UW - fixedW) / (colCount - 3);

  const summaryColStyles = {
    0: { cellWidth: vehicleFilter === "all" ? 42 : 50, fontStyle: "bold" },
    1: { cellWidth: vehicleFilter === "all" ? 22 : 28 },
    2: { cellWidth: vehicleFilter === "all" ? 28 : 32 },
  };
  let ci = 3;
  if (showExp)  { summaryColStyles[ci] = { cellWidth: dataW, halign: "right", textColor: BLUE  }; ci++; }
  if (showFuel) { summaryColStyles[ci] = { cellWidth: dataW, halign: "right", textColor: AMBER }; ci++; }
  if (showMnt)  { summaryColStyles[ci] = { cellWidth: dataW, halign: "right", textColor: PURP  }; ci++; }
  summaryColStyles[ci] = { cellWidth: dataW, halign: "right", fontStyle: "bold" }; ci++;
  if (vehicleFilter === "all") summaryColStyles[ci] = { cellWidth: 14, halign: "right" };

  autoTable(doc, {
    startY: y,
    head: [summaryHead],
    body: summaryBody,
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    alternateRowStyles: ALT_ROW,
    columnStyles: summaryColStyles,
    didParseCell: (d) => {
      const isLastRow = d.row.index === summaryBody.length - 1;
      if (d.section === "body" && isLastRow) {
        d.cell.styles.fontStyle  = "bold";
        d.cell.styles.fillColor  = GY200;
        d.cell.styles.textColor  = SL;
      }
    },
    rowPageBreak: "avoid",
    didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
    margin: { left: ML, right: ML },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Monthly trend table ───────────────────────────────────────────────────
  if (vehicleFilter === "all" && typeFilter === "all") {
    y = sectionLabel(doc, y, "Monthly Trend — Full Year");

    const trendHead = ["Month", "Expenses", "Fuel", "Maintenance", "Total"];
    const trendBody = [...monthlyTrend].reverse().map((m) => {
      const total = m.expenses + m.fuel + m.maintenance;
      return [
        m.label,
        m.expenses    > 0 ? `AED ${fm(m.expenses)}`    : "—",
        m.fuel        > 0 ? `AED ${fm(m.fuel)}`        : "—",
        m.maintenance > 0 ? `AED ${fm(m.maintenance)}` : "—",
        total         > 0 ? `AED ${fm(total)}`          : "—",
      ];
    });
    // Year total row
    trendBody.push([
      "Year Total",
      `AED ${fm(fleetTotals.expenses)}`,
      `AED ${fm(fleetTotals.fuel)}`,
      `AED ${fm(fleetTotals.maintenance)}`,
      `AED ${fm(fleetTotals.combined)}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [trendHead],
      body: trendBody,
      styles: { ...TABLE_STYLES, fontSize: 8 },
      headStyles: HEAD_STYLES,
      alternateRowStyles: ALT_ROW,
      columnStyles: {
        0: { cellWidth: 34 },
        1: { cellWidth: 37, halign: "right", textColor: BLUE  },
        2: { cellWidth: 37, halign: "right", textColor: AMBER },
        3: { cellWidth: 37, halign: "right", textColor: PURP  },
        4: { cellWidth: 37, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (d) => {
        const isLastRow = d.row.index === trendBody.length - 1;
        if (d.section === "body" && isLastRow) {
          d.cell.styles.fontStyle = "bold";
          d.cell.styles.fillColor = GY200;
        }
      },
      rowPageBreak: "avoid",
      didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
      margin: { left: ML, right: ML },
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Per-vehicle detail records ────────────────────────────────────────────
  for (const car of cars) {
    const carLabel = car.nickname || `${car.make} ${car.model}`;

    if (y > PH - 60) { doc.addPage(); y = 15; }
    y = sectionLabel(doc, y, `${carLabel}  ·  ${car.plateNumber || "No Plate"}  ·  ${car.driverName || "No Driver"}`);

    // Expenses detail
    if (showExp && car.expenses.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Date", "Type", "Description", "Vendor", "Amount (AED)"]],
        body: car.expenses.map((e) => [
          fd(e.date),
          e.type ? e.type.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—",
          e.description || "—",
          e.vendor      || "—",
          `AED ${fm(e.amount)}`,
        ]),
        styles: { ...TABLE_STYLES, fontSize: 7.5 },
        headStyles: { ...HEAD_STYLES, fillColor: BLUE },
        alternateRowStyles: ALT_ROW,
        columnStyles: {
          0: { cellWidth: 22, textColor: SL5 },
          1: { cellWidth: 28 },
          2: { cellWidth: 68 },
          3: { cellWidth: 32 },
          4: { cellWidth: 32, halign: "right", fontStyle: "bold", textColor: BLUE },
        },
        rowPageBreak: "avoid",
        didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
        margin: { left: ML, right: ML },
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    // Fuel detail
    if (showFuel && car.fuelLogs.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Date", "Station", "Litres", "Price/Litre", "Mileage (km)", "Total (AED)"]],
        body: car.fuelLogs.map((f) => [
          fd(f.date),
          f.station    || "—",
          f.liters     ? `${Number(f.liters).toFixed(1)} L` : "—",
          f.pricePerLiter ? `AED ${Number(f.pricePerLiter).toFixed(3)}` : "—",
          f.mileage    ? Number(f.mileage).toLocaleString() : "—",
          `AED ${fm(f.totalPrice)}`,
        ]),
        styles: { ...TABLE_STYLES, fontSize: 7.5 },
        headStyles: { ...HEAD_STYLES, fillColor: AMBER },
        alternateRowStyles: ALT_ROW,
        columnStyles: {
          0: { cellWidth: 22, textColor: SL5 },
          1: { cellWidth: 30 },
          2: { cellWidth: 24, halign: "right" },
          3: { cellWidth: 30, halign: "right" },
          4: { cellWidth: 32, halign: "right" },
          5: { cellWidth: 44, halign: "right", fontStyle: "bold", textColor: AMBER },
        },
        rowPageBreak: "avoid",
        didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
        margin: { left: ML, right: ML },
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    // Maintenance detail
    if (showMnt && car.maintenance.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Date", "Service Type", "Vendor", "Mileage (km)", "Cost (AED)"]],
        body: car.maintenance.map((m) => [
          fd(m.date),
          m.type   || "—",
          m.vendor || "—",
          m.mileage ? Number(m.mileage).toLocaleString() : "—",
          `AED ${fm(m.cost)}`,
        ]),
        styles: { ...TABLE_STYLES, fontSize: 7.5 },
        headStyles: { ...HEAD_STYLES, fillColor: PURP },
        alternateRowStyles: ALT_ROW,
        columnStyles: {
          0: { cellWidth: 22, textColor: SL5 },
          1: { cellWidth: 50 },
          2: { cellWidth: 50 },
          3: { cellWidth: 30, halign: "right" },
          4: { cellWidth: 30, halign: "right", fontStyle: "bold", textColor: PURP },
        },
        rowPageBreak: "avoid",
        didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
        margin: { left: ML, right: ML },
      });
      y = doc.lastAutoTable.finalY + 6;
    }
  }

  const propSlug = (propertyName ?? "Fleet").replace(/\s+/g, "-");
  const vSlug    = vehicleFilter === "all" ? "All-Vehicles" : (cars[0]?.plateNumber ?? "Vehicle").replace(/\s+/g, "-");
  doc.save(`${propSlug}-Fleet-Report-${vSlug}-${periodLabel.replace(/[\s/]+/g, "-")}.pdf`);
}
