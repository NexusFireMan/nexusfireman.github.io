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
    const response = await fetch("assets/data/content.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const item = (data.ctf ?? []).find((entry) => entry.id === ctfId);

    if (!item) {
      renderMissing("El laboratorio solicitado no existe en content.json.");
    } else {
      const sectionsHtml = (item.sections ?? [])
        .map((section) => `<section><h2>${section.title}</h2><p>${section.text}</p></section>`)
        .join("");

      detailEl.innerHTML = `
        <header>
          <h1>${item.title}</h1>
          <p class="meta">${item.platform} · ${item.difficulty} · ${item.year}</p>
          <p>${item.description}</p>
        </header>
        ${sectionsHtml}
        ${item.url ? `<p><a href="${item.url}" target="_blank" rel="noreferrer">Referencia externa</a></p>` : ""}
      `;
      document.title = `${item.title} | CTF | NexusFireMan`;
    }
  } catch (error) {
    renderMissing(`No se pudo cargar el contenido (${error.message}).`);
  }
}
