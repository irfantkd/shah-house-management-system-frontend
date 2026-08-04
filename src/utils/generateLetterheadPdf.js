import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Captures a LetterheadDoc DOM element and saves as a crisp A4 PDF.
 *
 * The document root already has minHeight: 1123px so every capture is
 * guaranteed to be ≥ A4 height. We render at 3× DPI for sharp text,
 * then fit the image to exactly A4 width (210 mm) and scale height
 * proportionally — if it fits in one page we pad to A4, otherwise we
 * slice it across multiple A4 pages.
 */
export async function generateLetterheadPdf(element, filename = 'letterhead.pdf') {
  const canvas = await html2canvas(element, {
    scale: 3,            // 3× DPI → sharp on high-res screens/printers
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    imageTimeout: 20000,
    removeContainer: false,
    allowTaint: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const A4_W = 210;   // mm
  const A4_H = 297;   // mm

  // Natural rendered height in mm (proportional to A4 width)
  const renderedH = (canvas.height / canvas.width) * A4_W;

  if (renderedH <= A4_H + 2) {
    // Fits in one page — place image at the top, let A4 white-space fill the rest
    pdf.addImage(imgData, 'PNG', 0, 0, A4_W, renderedH);
  } else {
    // Multiple pages — slice the single tall image across A4 pages
    const totalPages = Math.ceil(renderedH / A4_H);
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();
      // Shift the image up by one page-height each iteration
      pdf.addImage(imgData, 'PNG', 0, -(page * A4_H), A4_W, renderedH);
    }
  }

  pdf.save(filename);
}
