const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

const ctfList = document.getElementById("ctf-list");
const exploitList = document.getElementById("exploit-list");
const repoList = document.getElementById("repo-list");

const createCard = (item, type) => {
  const article = document.createElement("article");
  article.className = "card";

  let meta = "";
  if (type === "ctf") meta = `${item.platform} · ${item.difficulty} · ${item.year}`;
  if (type === "exploit") meta = `${item.target} · ${item.severity}`;
  if (type === "repo") meta = `${item.language} · ${item.category}`;

  article.innerHTML = `
    <h3>${item.title}</h3>
    <p class="meta">${meta}</p>
    <p>${item.description}</p>
    <a href="${item.url}" target="_blank" rel="noreferrer">Ver más</a>
    ${item.tag ? `<div class="tag">${item.tag}</div>` : ""}
  `;
  return article;
};

const renderList = (target, items, type) => {
  if (!items.length) {
    target.innerHTML = "<p>No hay contenido todavía.</p>";
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.appendChild(createCard(item, type)));
  target.replaceChildren(fragment);
};

const loadData = async () => {
  try {
    const response = await fetch("assets/data/content.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    renderList(ctfList, data.ctf ?? [], "ctf");
    renderList(exploitList, data.exploits ?? [], "exploit");
    renderList(repoList, data.repos ?? [], "repo");
  } catch (error) {
    const message = `<p class="meta">Error cargando contenido: ${error.message}</p>`;
    ctfList.innerHTML = message;
    exploitList.innerHTML = message;
    repoList.innerHTML = message;
  }
};

loadData();
