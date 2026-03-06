import { fetchCtfEntries } from "./ctf-source.js";

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const ctfList = document.getElementById("ctf-page-list");
const platformFilter = document.getElementById("platform-filter");

const createCtfCard = (item) => {
  const article = document.createElement("article");
  article.className = "card";
  article.innerHTML = `
    <h3>${item.title}</h3>
    <p class="meta">${item.platform} · ${item.difficulty ?? "N/A"} · ${item.year ?? "N/A"}</p>
    <p>${item.description}</p>
    <a href="ctf-detail.html?id=${item.id}">Ver detalle</a>
    ${item.tag ? `<div class="tag">${item.tag}</div>` : ""}
  `;
  return article;
};

const renderCtfList = (items) => {
  if (!items.length) {
    ctfList.innerHTML = "<p>No hay CTFs para este filtro.</p>";
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.appendChild(createCtfCard(item)));
  ctfList.replaceChildren(fragment);
};

try {
  const ctfItems = await fetchCtfEntries();

  const platforms = [...new Set(ctfItems.map((item) => item.platform))].sort((a, b) => a.localeCompare(b, "es"));
  platforms.forEach((platform) => {
    const option = document.createElement("option");
    option.value = platform;
    option.textContent = platform;
    platformFilter.appendChild(option);
  });

  const applyFilter = () => {
    const selected = platformFilter.value;
    const filtered = selected === "all" ? ctfItems : ctfItems.filter((item) => item.platform === selected);
    renderCtfList(filtered);
  };

  platformFilter.addEventListener("change", applyFilter);
  applyFilter();
} catch (error) {
  ctfList.innerHTML = `<p class="meta">Error cargando CTFs: ${error.message}</p>`;
}
