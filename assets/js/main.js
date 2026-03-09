import { fetchCtfEntries } from "./ctf-source.js";
import { fetchExploitEntries } from "./exploit-source.js";

const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

const terminalOutput = document.getElementById("terminal-output");
const ctfList = document.getElementById("ctf-list");
const exploitList = document.getElementById("exploit-list");
const repoList = document.getElementById("repo-list");

const terminalLines = [
  "{",
  "  \"role\": \"Pentester\",",
  "  \"focus\": [\"Web\", \"AD\", \"Binary Exploitation\"],",
  "  \"status\": \"building & breaking\"",
  "}"
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const typeTerminal = async () => {
  if (!terminalOutput) return;

  terminalOutput.textContent = "";
  for (const line of terminalLines) {
    for (const char of line) {
      terminalOutput.textContent += char;
      await sleep(18);
    }
    terminalOutput.textContent += "\n";
    await sleep(120);
  }
};

const createCard = (item, type) => {
  const article = document.createElement("article");
  article.className = "card";

  let meta = "";
  let linkText = "Ver mas";
  let link = item.url;
  let external = true;

  if (type === "ctf") {
    meta = `${item.platform} · ${item.difficulty ?? "N/A"} · ${item.year ?? "N/A"}`;
    linkText = "Abrir writeup";
    link = `ctf-detail.html?id=${item.id}`;
    external = false;
  }

  if (type === "exploit") {
    meta = `${item.category ?? item.target} · ${item.severity ?? "N/A"}`;
    linkText = "Abrir detalle";
    link = `exploit-detail.html?id=${item.id}`;
    external = false;
  }
  if (type === "repo") meta = `${item.language} · ${item.category}`;

  const linkAttrs = external ? 'target="_blank" rel="noreferrer"' : "";

  article.innerHTML = `
    <h3>${item.title}</h3>
    <p class="meta">${meta}</p>
    <p>${item.description}</p>
    <a href="${link}" ${linkAttrs}>${linkText}</a>
    ${item.tag ? `<div class="tag">${item.tag}</div>` : ""}
  `;

  return article;
};

const renderList = (target, items, type) => {
  if (!target) return;
  if (!items.length) {
    target.innerHTML = "<p>No hay contenido todavia.</p>";
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.appendChild(createCard(item, type)));
  target.replaceChildren(fragment);
};

const loadCtfPreview = async () => {
  try {
    const ctfEntries = await fetchCtfEntries();
    renderList(ctfList, ctfEntries.slice(0, 3), "ctf");
  } catch (error) {
    ctfList.innerHTML = `<p class="meta">Error cargando CTFs: ${error.message}</p>`;
  }
};

const loadExploitPreview = async () => {
  try {
    const exploitEntries = await fetchExploitEntries();
    renderList(exploitList, exploitEntries.slice(0, 3), "exploit");
  } catch (error) {
    exploitList.innerHTML = `<p class="meta">Error cargando exploits: ${error.message}</p>`;
  }
};

const loadData = async () => {
  try {
    const response = await fetch("assets/data/content.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    renderList(repoList, data.repos ?? [], "repo");
  } catch (error) {
    const message = `<p class="meta">Error cargando contenido: ${error.message}</p>`;
    if (repoList) repoList.innerHTML = message;
  }
};

await typeTerminal();
await Promise.all([loadCtfPreview(), loadExploitPreview(), loadData()]);
