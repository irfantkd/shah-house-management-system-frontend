import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const A4_W = 210; // mm
const A4_H = 297; // mm

async function captureCanvas(element, scale) {
  return html2canvas(element, {
    scale,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    imageTimeout: 20000,
    removeContainer: false,
    allowTaint: false,
  });
}

/**
 * Captures a LetterheadDoc DOM element and saves as a crisp A4 PDF.
 * Renders at 3× DPI for sharp print quality. Multi-page if content overflows.
 */
export async function generateLetterheadPdf(element, filename = 'letterhead.pdf') {
  const canvas    = await captureCanvas(element, 3);
  const imgData   = canvas.toDataURL('image/png');
  const pdf       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const renderedH = (canvas.height / canvas.width) * A4_W;

  if (renderedH <= A4_H + 2) {
    pdf.addImage(imgData, 'PNG', 0, 0, A4_W, renderedH);
  } else {
    const totalPages = Math.ceil(renderedH / A4_H);
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -(page * A4_H), A4_W, renderedH);
    }
  }

  pdf.save(filename);
}

/**
 * Generates a compact PDF sized to fit only the content — no trailing white space.
 * Uses 2× scale and JPEG compression to keep the file small for WhatsApp sharing.
 * Returns a Blob (no download triggered).
 */
export async function generateLetterheadPdfBlob(element) {
  const canvas = await captureCanvas(element, 2);

  // JPEG at 85% quality — much smaller than PNG, fine for WhatsApp preview
  const imgData = canvas.toDataURL('image/jpeg', 0.85);

  // Content height in mm at A4 width, capped at A4 height per page
  const contentH = (canvas.height / canvas.width) * A4_W;

  if (contentH <= A4_H + 2) {
    // Single page — page height = content height (no empty white space below)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [A4_W, Math.min(contentH, A4_H)],
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, A4_W, contentH);
    return pdf.output('blob');
  } else {
    // Multi-page content — use standard A4 pages
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const totalPages = Math.ceil(contentH / A4_H);
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, -(page * A4_H), A4_W, contentH);
    }
    return pdf.output('blob');
  }
}
