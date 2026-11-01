const MIME = {
  JPG: 'image/jpeg', JPEG: 'image/jpeg', PNG: 'image/png',
  WEBP: 'image/webp', GIF: 'image/gif', PDF: 'application/pdf',
};

/**
 * Share an image or PDF.
 *
 * Mobile  — fetches the actual file as a blob, opens the native OS share
 *           sheet with the real image/PDF so the user can send it to
 *           WhatsApp, save to Photos/Files, etc.
 * Desktop — copies the direct URL to the clipboard.
 *
 * Returns 'shared' | 'copied'.
 * Throws  AbortError when the user cancels the share sheet (caller should
 *         swallow this silently).
 */
export async function shareMedia({ url, name, fileType }) {
  const ext      = (fileType ?? '').toUpperCase();
  const mime     = MIME[ext] || 'application/octet-stream';
  const safeName = name?.includes('.') ? name : `${name || 'file'}.${ext.toLowerCase()}`;

  if (typeof navigator.share === 'function') {
    // Fetch the real file in the background
    const blob = await fetch(url, { mode: 'cors' }).then((r) => r.blob());
    // Prefer the detected MIME; fall back to blob's own content-type
    const finalMime = mime !== 'application/octet-stream' ? mime : blob.type || mime;
    const file = new File([blob], safeName, { type: finalMime });

    // Share the actual file if the browser/OS supports it
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return 'shared';
    }

    // Fallback within native share: share URL only
    await navigator.share({ title: name, url });
    return 'shared';
  }

  // Desktop: no Web Share API — copy link to clipboard
  await navigator.clipboard.writeText(url);
  return 'copied';
}
