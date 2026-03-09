const OWNER = "NexusFireMan";
const REPO = "CTF";
const BRANCH = "main";

const API_TREE = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
const API_MARKDOWN = "https://api.github.com/markdown";
const CONTENT_FALLBACK = "assets/data/content.json";
const CACHE_KEY = "ctf_tree_cache_v1";
const CACHE_TTL_MS = 60 * 60 * 1000;

const encodePath = (path) => path.split("/").map((part) => encodeURIComponent(part)).join("/");
const encodeId = (path) => encodeURIComponent(path);
const decodeId = (id) => decodeURIComponent(id);

const escapeHtml = (text) => text
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const niceName = (filename) => filename
  .replace(/\.md$/i, "")
  .replaceAll("_", " ")
  .replaceAll("-", " ")
  .replace(/\s+/g, " ")
  .trim();

const titleCase = (text) => text
  .split(" ")
  .filter(Boolean)
  .map((word) => word[0].toUpperCase() + word.slice(1))
  .join(" ");

const normalizeMetaKey = (key) => key.toLowerCase().trim().normalize("NFD").replace(/[^a-z0-9]/g, "");

const pickMeta = (meta, ...keys) => {
  for (const key of keys) {
    if (meta[key]) return meta[key];
  }
  return "";
};

const parseFrontMatter = (markdown) => {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { meta: {}, body: normalized };

  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) return { meta: {}, body: normalized };

  const frontMatterBlock = normalized.slice(4, end);
  const body = normalized.slice(end + 5).trimStart();
  const meta = {};

  frontMatterBlock.split("\n").forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return;

    const rawKey = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    if (!rawKey || !rawValue) return;

    meta[normalizeMetaKey(rawKey)] = rawValue;
  });

  return { meta, body };
};

const renderMarkdownWithGithub = async (markdown) => {
  const response = await fetch(API_MARKDOWN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: markdown,
      mode: "gfm",
      context: `${OWNER}/${REPO}`
    })
  });

  if (!response.ok) throw new Error(`GitHub Markdown API ${response.status}`);
  return response.text();
};

const buildEntry = (path) => {
  const parts = path.split("/");
  const platform = parts[0] || "Unknown";
  const file = parts[parts.length - 1];
  const title = titleCase(niceName(file));

  return {
    id: encodeId(path),
    path,
    platform,
    title,
    description: `Writeup en ${platform}.`,
    difficulty: "N/A",
    year: "N/A",
    tag: "Writeup",
    githubUrl: `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${encodeURI(path)}`
  };
};

const loadCachedTree = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.tree;
  } catch {
    return null;
  }
};

const saveCachedTree = (tree) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), tree }));
  } catch {
    // ignore cache failures
  }
};

const getTreeFromGithub = async () => {
  const response = await fetch(API_TREE);
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);

  const data = await response.json();
  const tree = data.tree || [];
  saveCachedTree(tree);
  return tree;
};

const getTree = async () => {
  const cached = loadCachedTree();
  if (cached) return cached;
  return getTreeFromGithub();
};

const entriesFromTree = (tree) => tree
  .filter((entry) => entry.type === "blob")
  .map((entry) => entry.path)
  .filter((path) => /\.md$/i.test(path) && path.includes("/"))
  .sort((a, b) => a.localeCompare(b, "es"))
  .map(buildEntry);

const getLocalFallbackEntries = async () => {
  const response = await fetch(CONTENT_FALLBACK);
  if (!response.ok) throw new Error(`Fallback HTTP ${response.status}`);

  const data = await response.json();
  return (data.ctf || []).map((item) => ({
    id: encodeId(item.path || item.id || item.title),
    path: item.path || item.id || item.title,
    platform: item.platform || "Unknown",
    title: item.title || "Writeup",
    description: item.description || "Writeup local.",
    difficulty: item.difficulty || "N/A",
    year: item.year || "N/A",
    tag: item.tag || "Writeup",
    githubUrl: item.url || ""
  }));
};

export const fetchCtfEntries = async () => {
  try {
    const tree = await getTree();
    return entriesFromTree(tree);
  } catch {
    return getLocalFallbackEntries();
  }
};

export const fetchCtfMarkdownById = async (id) => {
  const path = decodeId(id);
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodePath(path)}?ref=${BRANCH}`;

  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);

  const data = await response.json();
  const b64 = (data.content || "").replace(/\n/g, "");
  const bytes = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
  const markdown = new TextDecoder("utf-8").decode(bytes);

  const { meta, body } = parseFrontMatter(markdown);
  const content = body || markdown;

  let html;
  try {
    html = await renderMarkdownWithGithub(content);
  } catch {
    html = `<pre>${escapeHtml(content)}</pre>`;
  }

  return {
    path,
    markdown,
    html,
    meta,
    githubUrl: data.html_url || `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${encodeURI(path)}`,
    title: pickMeta(meta, "titulo", "title") || titleCase(niceName(path.split("/").pop() || "Writeup")),
    platform: pickMeta(meta, "plataforma", "platform") || path.split("/")[0] || "Unknown",
    status: pickMeta(meta, "estado", "status"),
    os: pickMeta(meta, "so", "os"),
    difficulty: pickMeta(meta, "dificultad", "difficulty"),
    vector: pickMeta(meta, "vectorinicial", "vector", "initialvector"),
    datetime: pickMeta(meta, "fecha", "date")
  };
};
