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

if (!ctfId) {
  renderMissing("Falta el parametro id en la URL.");
} else {
  try {
    const writeup = await fetchCtfMarkdownById(ctfId);

    detailEl.innerHTML = `
      <header>
        <h1>${writeup.title}</h1>
        <p class="meta">${writeup.platform}</p>
      </header>
      <div class="markdown-content">${writeup.html}</div>
      <p><a href="${writeup.githubUrl}" target="_blank" rel="noreferrer">Ver archivo original en GitHub</a></p>
    `;

    document.title = `${writeup.title} | CTF | NexusFireMan`;
  } catch (error) {
    renderMissing(`No se pudo cargar el writeup (${error.message}).`);
  }
}
