/* Download a remote file (Cloudinary, etc.) as a browser file-save.
   Auto-appends the file extension from the URL if the filename lacks one.
   Falls back to window.open if fetch/blob fails (e.g. CORS). */
const KNOWN_EXTS = new Set([
  'pdf','doc','docx','xls','xlsx','ppt','pptx',
  'jpg','jpeg','png','webp','gif','txt','csv','zip',
]);

export async function downloadFile(url, filename) {
  // Derive extension from URL path (strip query string first)
  const urlExt = url.split('?')[0].split('.').pop().toLowerCase();
  let name = filename || 'download';
  // Add extension when filename has none and URL has a recognisable one
  if (KNOWN_EXTS.has(urlExt) && !name.toLowerCase().includes('.')) {
    name = `${name}.${urlExt}`;
  }

  try {
    const res  = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const obj  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = obj;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(obj);
  } catch {
    // Fallback: open in new tab (browser will download or show inline)
    const a    = document.createElement('a');
    a.href     = url;
    a.download = name;
    a.target   = '_blank';
    a.rel      = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
