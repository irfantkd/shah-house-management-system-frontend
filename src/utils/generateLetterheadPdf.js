import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Captures a LetterheadDoc DOM element at A4 resolution and saves as PDF.
 * Pass the element rendered at ~794px wide for correct A4 proportions.
 */
export async function generateLetterheadPdf(element, filename = 'letterhead.pdf') {
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    imageTimeout: 15000,
    removeContainer: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pW = 210;
  const pH = 297;
  const imgH = (canvas.height / canvas.width) * pW;

  if (imgH <= pH) {
    pdf.addImage(imgData, 'PNG', 0, 0, pW, imgH);
  } else {
    const pages = Math.ceil(imgH / pH);
    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, -(i * pH), pW, imgH);
    }
  }

  pdf.save(filename);
}
