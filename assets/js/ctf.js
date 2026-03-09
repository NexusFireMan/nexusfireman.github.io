import { fetchCtfEntries } from "./ctf-source.js";

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const ctfList = document.getElementById("ctf-page-list");
const platformFilter = document.getElementById("platform-filter");

const createCtfCard = (item) => {
  const article = document.createElement("article");
  article.className = "card";

  const titleEl = document.createElement("h3");
  titleEl.textContent = item.title ?? "Sin titulo";

  const metaEl = document.createElement("p");
  metaEl.className = "meta";
  metaEl.textContent = `${item.platform} · ${item.difficulty ?? "N/A"} · ${item.year ?? "N/A"}`;

  const descEl = document.createElement("p");
  descEl.textContent = item.description ?? "";

  const linkEl = document.createElement("a");
  linkEl.href = `ctf-detail.html?id=${item.id}`;
  linkEl.textContent = "Ver detalle";

  article.append(titleEl, metaEl, descEl, linkEl);

  if (item.tag) {
    const tagEl = document.createElement("div");
    tagEl.className = "tag";
    tagEl.textContent = item.tag;
    article.appendChild(tagEl);
  }

  return article;
};

const renderCtfList = (items) => {
  if (!items.length) {
    ctfList.textContent = "No hay CTFs para este filtro.";
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
  ctfList.textContent = `Error cargando CTFs: ${error.message}`;
}
