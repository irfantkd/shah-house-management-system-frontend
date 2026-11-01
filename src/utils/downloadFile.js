/* Download a remote file (Cloudinary, etc.) as a browser file-save.
   Falls back to opening in a new tab if fetch/blob fails (e.g. CORS). */
export async function downloadFile(url, filename) {
  try {
    const res  = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const obj  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = obj;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(obj);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
