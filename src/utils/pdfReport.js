import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Palette [r, g, b] ─────────────────────────────────────────────────────────
const NAVY  = [11,  29,  58 ];
const WHITE = [255, 255, 255];
const GR    = [21,  128, 61 ];   // green  — cash in
const RD    = [185, 28,  28 ];   // red    — cash out
const GY50  = [249, 250, 251];   // alternate row tint
const GY200 = [229, 231, 235];   // borders / dividers
const GY300 = [209, 213, 219];   // stronger border
const SL    = [15,  23,  42 ];   // primary text (dark)
const SL5   = [71,  85,  105];   // secondary text
const SL4   = [100, 116, 139];   // muted labels

const ML = 14;    // left / right margin
const PW = 210;   // A4 width  (mm)
const PH = 297;   // A4 height (mm)
const UW = 182;   // usable width  (PW − 2 × ML)

const fm  = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fd  = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const tod = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// ── Header band ───────────────────────────────────────────────────────────────
function drawHeader(doc, walletLabel, periodLabel, accentColor, propertyName, propertyType) {
  // Background
  doc.setFillColor(...(accentColor ?? NAVY));
  doc.rect(0, 0, PW, 32, 'F');

  // Thin accent stripe at very top
  doc.setFillColor(255, 255, 255, 0.15);
  doc.rect(0, 0, PW, 1.2, 'F');

  // Brand name left — property name
  const brand = propertyName ?? 'Property Management';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text(brand, ML, 12);

  // Property type tag
  if (propertyType) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(185, 210, 235);
    doc.text(propertyType.toUpperCase(), ML, 18.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('  ·  Dubai, United Arab Emirates  ·  Property & Expense Management System', ML + doc.getTextWidth(propertyType.toUpperCase()), 18.5);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 210, 235);
    doc.text('Dubai, United Arab Emirates  ·  Property & Expense Management System', ML, 18.5);
  }

  // Statement info right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...WHITE);
  doc.text('STATEMENT OF ACCOUNT', PW - ML, 11.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(185, 210, 235);
  doc.text(walletLabel, PW - ML, 17.5, { align: 'right' });
  doc.text(`Period: ${periodLabel}   Generated: ${tod()}`, PW - ML, 24.5, { align: 'right' });
}

// ── Account info line ─────────────────────────────────────────────────────────
function drawInfoLine(doc, y, walletLabel, periodLabel, txCount, propertyName) {
  doc.setFillColor(...GY50);
  doc.setDrawColor(...GY200);
  doc.setLineWidth(0.3);
  doc.rect(ML, y, UW, 11, 'FD');

  const holder = propertyName ?? 'Property Management';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SL5);
  doc.text(
    `Property: ${holder}   ·   Wallet: ${walletLabel}   ·   Period: ${periodLabel}   ·   Transactions: ${txCount}`,
    ML + 4, y + 7,
  );
  return y + 11;
}

// ── Single-row stat container (4 columns, vertical dividers) ──────────────────
function drawStatRow(doc, y, items) {
  const H  = 28;
  const CW = UW / items.length;

  // Container background + border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...GY300);
  doc.setLineWidth(0.35);
  doc.rect(ML, y, UW, H, 'FD');

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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...SL4);
    doc.text(label.toUpperCase(), tx, y + 8);

    // Value — large
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(items.length <= 4 ? 11.5 : 9.5);
    doc.setTextColor(...(vc ?? SL));
    doc.text(value, tx, y + 19);

    // Sub label
    if (sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(...SL4);
      doc.text(sub, tx, y + 25.5);
    }
  });

  return y + H + 5;
}

// ── Section label + horizontal rule ──────────────────────────────────────────
function sectionLabel(doc, y, text) {
  doc.setFont('helvetica', 'bold');
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

  const footerProp = propertyName ?? 'Property Management';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...SL4);
  doc.text(`${footerProp}  ·  Dubai, United Arab Emirates  ·  Confidential`, ML, PH - 7.5);
  doc.text(`Page ${pageNum}`, PW - ML, PH - 7.5, { align: 'right' });
}

// ── Totals summary strip ──────────────────────────────────────────────────────
function totalsStrip(doc, y, count, cashIn, cashOut) {
  const net = cashIn - cashOut;

  doc.setFillColor(...GY50);
  doc.setDrawColor(...GY300);
  doc.setLineWidth(0.35);
  doc.rect(ML, y, UW, 10, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  doc.setTextColor(...SL5);
  doc.text(`${count} transaction${count !== 1 ? 's' : ''}`, ML + 4, y + 7);

  doc.setTextColor(...GR);
  doc.text(`Cash In: +AED ${fm(cashIn)}`, ML + 53, y + 7);

  doc.setTextColor(...RD);
  doc.text(`Cash Out: -AED ${fm(cashOut)}`, ML + 110, y + 7);

  const netColor = net >= 0 ? GR : RD;
  doc.setTextColor(...netColor);
  doc.text(`Net: ${net >= 0 ? '+' : '-'}AED ${fm(Math.abs(net))}`, ML + UW - 2, y + 7, { align: 'right' });
}

// ── Shared table config ───────────────────────────────────────────────────────
const TABLE_STYLES = {
  fontSize:     8,
  cellPadding:  { top: 3.5, bottom: 3.5, left: 4, right: 4 },
  lineColor:    GY200,
  lineWidth:    0.2,
  textColor:    SL,
  overflow:     'linebreak',
  valign:       'middle',
};

const HEAD_STYLES = {
  fillColor:   NAVY,
  textColor:   WHITE,
  fontSize:    7.5,
  fontStyle:   'bold',
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
  walletLabel, walletColor, wallet, transactions, byMonth, periodLabel,
  propertyName, propertyType,
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawHeader(doc, walletLabel, periodLabel, walletColor ?? NAVY, propertyName, propertyType);

  let y = 36;

  y = drawInfoLine(doc, y, walletLabel, periodLabel, transactions.length, propertyName) + 4;

  // Computed figures
  const bal     = wallet.balance ?? 0;
  const total   = wallet.totalDeposited ?? 0;
  const pct     = total > 0 ? Math.round((bal / total) * 100) : 0;
  const cashIn  = transactions.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const cashOut = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  y = drawStatRow(doc, y, [
    { label: 'Current Balance',  value: `AED ${fm(bal)}`,    sub: `${pct}% of budget remaining`   },
    { label: 'Total Deposited',  value: `AED ${fm(total)}`,  sub: 'All-time deposits'              },
    { label: 'Cash In  (+)',     value: `AED ${fm(cashIn)}`, sub: `Deposits — ${periodLabel}`,  vc: GR },
    { label: 'Cash Out  (−)',    value: `AED ${fm(cashOut)}`,sub: `Expenses — ${periodLabel}`,  vc: RD },
  ]);

  // ── Monthly breakdown ─────────────────────────────────────────────────────
  if (byMonth && byMonth.length > 0) {
    y = sectionLabel(doc, y, 'Monthly Overview — Last 6 Months');

    autoTable(doc, {
      startY: y,
      head: [['Month', 'Cash In (+)  AED', 'Cash Out (−)  AED', 'Net Movement  AED']],
      body: byMonth
        .slice()
        .reverse()
        .map((m) => {
          const lbl = new Date(m.key + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
          const net = m.deposited - m.spent;
          return [
            lbl,
            `AED ${fm(m.deposited)}`,
            `AED ${fm(m.spent)}`,
            `${net >= 0 ? '+' : '-'}AED ${fm(Math.abs(net))}`,
          ];
        }),
      styles: { ...TABLE_STYLES, fontSize: 8 },
      headStyles: HEAD_STYLES,
      alternateRowStyles: ALT_ROW,
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40.7, halign: 'right', fontStyle: 'bold', textColor: GR },
        2: { cellWidth: 40.7, halign: 'right', fontStyle: 'bold', textColor: RD },
        3: { cellWidth: 40.6, halign: 'right', fontStyle: 'bold'                },
      },
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 3)
          d.cell.styles.textColor = d.cell.text.join('').startsWith('+') ? GR : RD;
      },
      rowPageBreak: 'avoid',
      margin: { left: ML, right: ML },
    });

    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Transactions ──────────────────────────────────────────────────────────
  y = sectionLabel(
    doc, y,
    `Transaction Details  ·  ${periodLabel}  ·  ${transactions.length} Record${transactions.length !== 1 ? 's' : ''}`,
  );

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Description / Note', 'Cash In  (+)', 'Cash Out  (−)', 'Balance']],
    body: transactions.length
      ? transactions.map((t) => [
          fd(t.date),
          t.type === 'deposit'
            ? (t.note        || 'Deposit received')
            : (t.description || 'Expense deducted'),
          t.type === 'deposit' ? `+AED ${fm(t.amount)}` : '',
          t.type === 'expense' ? `-AED ${fm(t.amount)}` : '',
          `AED ${fm(t.balanceAfter ?? 0)}`,
        ])
      : [['', 'No transactions recorded for this period.', '', '', '']],
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    alternateRowStyles: ALT_ROW,
    columnStyles: {
      0: { cellWidth: 24, textColor: SL5 },
      1: { cellWidth: 86 },                                                       // wide — full description
      2: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: GR },
      3: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: RD },
      4: { cellWidth: 24, halign: 'right', textColor: SL5 },
    },
    didParseCell: (d) => {
      if (d.section === 'body' && (d.column.index === 2 || d.column.index === 3) && d.cell.text.join('') === '')
        d.cell.styles.textColor = GY200;  // invisible blank cells
    },
    rowPageBreak: 'avoid',
    didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
    margin: { left: ML, right: ML },
  });

  totalsStrip(doc, doc.lastAutoTable.finalY, transactions.length, cashIn, cashOut);

  const propSlug = (propertyName ?? 'Property').replace(/\s+/g, '-');
  doc.save(`${propSlug}-${walletLabel.replace(/\s+/g, '-')}-${periodLabel.replace(/[\s/]+/g, '-')}-Statement.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMBINED WALLET PDF
// ─────────────────────────────────────────────────────────────────────────────
// Column layout (total = 182 mm):
//   Date(24) | Wallet(20) | Description(66) | Cash In+(24) | Cash Out-(24) | Balance(24)
// ─────────────────────────────────────────────────────────────────────────────
export function downloadCombinedWalletPDF({ vWallet, hWallet, transactions, periodLabel, propertyName, propertyType }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawHeader(doc, 'Vehicle Wallet  +  Home Wallet', periodLabel, NAVY, propertyName, propertyType);

  let y = 36;

  y = drawInfoLine(doc, y, 'All Wallets Combined', periodLabel, transactions.length, propertyName) + 4;

  const vBal    = vWallet.balance ?? 0;
  const hBal    = hWallet.balance ?? 0;
  const vTotal  = vWallet.totalDeposited ?? 0;
  const hTotal  = hWallet.totalDeposited ?? 0;
  const cashIn  = transactions.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const cashOut = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net     = cashIn - cashOut;

  // Row 1 — wallet balances
  y = drawStatRow(doc, y, [
    { label: 'Vehicle Wallet Balance', value: `AED ${fm(vBal)}`,       sub: `of AED ${fm(vTotal)} deposited` },
    { label: 'Home Wallet Balance',    value: `AED ${fm(hBal)}`,       sub: `of AED ${fm(hTotal)} deposited` },
    { label: 'Cash In  (+)',           value: `AED ${fm(cashIn)}`,     sub: `Deposits — ${periodLabel}`, vc: GR },
    { label: 'Cash Out  (−)',          value: `AED ${fm(cashOut)}`,    sub: `Expenses — ${periodLabel}`, vc: RD },
  ]);

  // ── Transactions ──────────────────────────────────────────────────────────
  y = sectionLabel(
    doc, y,
    `Transaction Details  ·  ${periodLabel}  ·  ${transactions.length} Record${transactions.length !== 1 ? 's' : ''}`,
  );

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Wallet', 'Description / Note', 'Cash In  (+)', 'Cash Out  (−)', 'Balance']],
    body: transactions.length
      ? transactions.map((t) => [
          fd(t.date),
          t.wallet === 'vehicle' ? 'Vehicle' : 'Home',
          t.type === 'deposit'
            ? (t.note        || 'Deposit received')
            : (t.description || 'Expense deducted'),
          t.type === 'deposit' ? `+AED ${fm(t.amount)}` : '',
          t.type === 'expense' ? `-AED ${fm(t.amount)}` : '',
          `AED ${fm(t.balanceAfter ?? 0)}`,
        ])
      : [['', '', 'No transactions recorded for this period.', '', '', '']],
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    alternateRowStyles: ALT_ROW,
    columnStyles: {
      0: { cellWidth: 24, textColor: SL5 },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 66 },                                                        // full description
      3: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: GR },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: RD },
      5: { cellWidth: 24, halign: 'right', textColor: SL5 },
    },
    didParseCell: (d) => {
      if (d.section === 'body') {
        if (d.column.index === 1)
          d.cell.styles.textColor = d.cell.text.join('') === 'Vehicle' ? NAVY : GR;
        if ((d.column.index === 3 || d.column.index === 4) && d.cell.text.join('') === '')
          d.cell.styles.textColor = GY200;
      }
    },
    rowPageBreak: 'avoid',
    didDrawPage: ({ pageNumber }) => pageFooter(doc, pageNumber, propertyName),
    margin: { left: ML, right: ML },
  });

  totalsStrip(doc, doc.lastAutoTable.finalY, transactions.length, cashIn, cashOut);

  const propSlug = (propertyName ?? 'Property').replace(/\s+/g, '-');
  doc.save(`${propSlug}-All-Wallets-${periodLabel.replace(/[\s/]+/g, '-')}-Statement.pdf`);
}
