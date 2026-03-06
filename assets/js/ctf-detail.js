import { fetchCtfMarkdownById } from "./ctf-source.js";

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const detailEl = document.getElementById("ctf-detail");
const params = new URLSearchParams(window.location.search);
const ctfId = params.get("id");

const renderMissing = (message) => {
  detailEl.innerHTML = `
    <h1>Writeup no encontrado</h1>
    <p class="meta">${message}</p>
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
    .map((section) => `<section><h2>${section.title}</h2><p>${section.text}</p></section>`)
    .join("");

  return {
    title: item.title || "Writeup",
    platform: item.platform || "Unknown",
    html,
    githubUrl: item.url || ""
  };
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

    detailEl.innerHTML = `
      <header>
        <h1>${writeup.title}</h1>
        <p class="meta">${writeup.platform}</p>
      </header>
      <div class="markdown-content">${writeup.html}</div>
      ${writeup.githubUrl ? `<p><a href="${writeup.githubUrl}" target="_blank" rel="noreferrer">Ver archivo original en GitHub</a></p>` : ""}
    `;

    document.title = `${writeup.title} | CTF | NexusFireMan`;
  } catch (error) {
    renderMissing(`No se pudo cargar el writeup (${error.message}).`);
  }
}
