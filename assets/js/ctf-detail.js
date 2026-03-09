import { fetchCtfMarkdownById } from "./ctf-source.js";
import { escapeHtml, safeExternalUrl } from "./security-utils.js";

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const detailEl = document.getElementById("ctf-detail");
const params = new URLSearchParams(window.location.search);
const ctfId = params.get("id");

const renderMissing = (message) => {
  detailEl.innerHTML = `
    <h1>Writeup no encontrado</h1>
    <p class="meta">${escapeHtml(message)}</p>
  `;
};

const fallbackLocalDetail = async (id) => {
  const response = await fetch("assets/data/content.json");
  if (!response.ok) throw new Error(`Fallback HTTP ${response.status}`);

  const data = await response.json();
  const decodedId = decodeURIComponent(id);
  const item = (data.ctf || []).find((entry) => {
    const candidate = entry.path || entry.id || entry.title;
    return candidate === decodedId || encodeURIComponent(candidate) === id;
  });

  if (!item) throw new Error("Sin fallback local para este writeup");

  const html = (item.sections || [])
    .map((section) => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.text)}</p></section>`)
    .join("");

  return {
    title: item.title || "Writeup",
    platform: item.platform || "Unknown",
    html,
    githubUrl: item.url || "",
    status: "",
    os: "",
    difficulty: item.difficulty || "",
    vector: "",
    datetime: item.year ? String(item.year) : ""
  };
};

const buildMetaPills = (writeup) => {
  const pills = [
    ["Estado", writeup.status],
    ["SO", writeup.os],
    ["Dificultad", writeup.difficulty],
    ["Vector", writeup.vector],
    ["Fecha", writeup.datetime]
  ].filter(([, value]) => value);

  if (!pills.length) return "";

  return `
    <div class="meta-pills">
      ${pills.map(([label, value]) => `<span class="pill"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`).join("")}
    </div>
  `;
};

if (!ctfId) {
  renderMissing("Falta el parametro id en la URL.");
} else {
  try {
    let writeup;

    try {
      writeup = await fetchCtfMarkdownById(ctfId);
    } catch {
      writeup = await fallbackLocalDetail(ctfId);
    }

    const safeUrl = safeExternalUrl(writeup.githubUrl);

    detailEl.innerHTML = `
      <header class="writeup-header">
        <h1>${escapeHtml(writeup.title)}</h1>
        <p class="meta">${escapeHtml(writeup.platform)}</p>
        ${buildMetaPills(writeup)}
      </header>
      <div class="markdown-content">${writeup.html}</div>
      ${safeUrl ? `<p><a href="${safeUrl}" target="_blank" rel="noreferrer">Ver archivo original en GitHub</a></p>` : ""}
    `;

    document.title = `${writeup.title} | CTF | NexusFireMan`;
  } catch (error) {
    renderMissing(`No se pudo cargar el writeup (${error.message}).`);
  }
}
