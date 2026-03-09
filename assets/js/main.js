import { fetchCtfEntries } from "./ctf-source.js";
import { fetchExploitEntries } from "./exploit-source.js";
import { safeExternalUrl } from "./security-utils.js";

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
    const metaParts = [
      item.category ?? item.target,
      item.severity && item.severity !== "N/A" ? item.severity : ""
    ].filter(Boolean);
    meta = metaParts.join(" · ");
    linkText = "Abrir detalle";
    link = `exploit-detail.html?id=${item.id}`;
    external = false;
  }

  if (type === "repo") meta = `${item.language} · ${item.category}`;

  const titleEl = document.createElement("h3");
  titleEl.textContent = item.title ?? "Sin titulo";

  const metaEl = document.createElement("p");
  metaEl.className = "meta";
  metaEl.textContent = meta;

  const descEl = document.createElement("p");
  descEl.textContent = item.description ?? "";

  const linkEl = document.createElement("a");
  linkEl.textContent = linkText;

  if (external) {
    const safeUrl = safeExternalUrl(link);
    linkEl.href = safeUrl || "#";
    linkEl.target = "_blank";
    linkEl.rel = "noreferrer";
  } else {
    linkEl.href = link;
  }

  article.append(titleEl, metaEl, descEl, linkEl);

  if (item.tag) {
    const tagEl = document.createElement("div");
    tagEl.className = "tag";
    tagEl.textContent = item.tag;
    article.appendChild(tagEl);
  }

  return article;
};

const renderList = (target, items, type) => {
  if (!target) return;
  if (!items.length) {
    target.textContent = "No hay contenido todavia.";
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
    ctfList.textContent = `Error cargando CTFs: ${error.message}`;
  }
};

const loadExploitPreview = async () => {
  try {
    const exploitEntries = await fetchExploitEntries();
    renderList(exploitList, exploitEntries.slice(0, 3), "exploit");
  } catch (error) {
    exploitList.textContent = `Error cargando exploits: ${error.message}`;
  }
};

const loadData = async () => {
  try {
    const response = await fetch("assets/data/content.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    renderList(repoList, data.repos ?? [], "repo");
  } catch (error) {
    if (repoList) repoList.textContent = `Error cargando contenido: ${error.message}`;
  }
};

await typeTerminal();
await Promise.all([loadCtfPreview(), loadExploitPreview(), loadData()]);
