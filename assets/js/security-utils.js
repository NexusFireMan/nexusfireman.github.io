export const escapeHtml = (text) => String(text ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

export const safeExternalUrl = (candidate) => {
  try {
    const url = new URL(String(candidate ?? ""), window.location.origin);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
    return "";
  } catch {
    return "";
  }
};
