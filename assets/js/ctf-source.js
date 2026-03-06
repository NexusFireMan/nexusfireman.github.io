const OWNER = "NexusFireMan";
const REPO = "CTF";
const BRANCH = "main";

const API_TREE = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
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

const inlineFormat = (text) => text
  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  .replace(/\*(.*?)\*/g, "<em>$1</em>")
  .replace(/`(.*?)`/g, "<code>$1</code>")
  .replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');

const mdToHtml = (markdown) => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      html.push("");
      continue;
    }

    if (line.startsWith("### ")) {
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith("## ")) {
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("# ")) {
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith("- ")) {
      const listItem = `<li>${inlineFormat(escapeHtml(line.slice(2)))}</li>`;
      const previous = html[html.length - 1] || "";
      if (previous.endsWith("</ul>")) {
        html[html.length - 1] = previous.replace(/<\/ul>$/, `${listItem}</ul>`);
      } else {
        html.push(`<ul>${listItem}</ul>`);
      }
      continue;
    }

    if (line.startsWith("```")) {
      const previous = html[html.length - 1] || "";
      if (previous.includes("<pre><code>")) {
        html[html.length - 1] = `${previous}</code></pre>`;
      } else {
        html.push("<pre><code>");
      }
      continue;
    }

    const previous = html[html.length - 1] || "";
    if (previous.includes("<pre><code>") && !previous.includes("</code></pre>")) {
      html[html.length - 1] = `${previous}${escapeHtml(rawLine)}\n`;
    } else {
      html.push(`<p>${inlineFormat(escapeHtml(line))}</p>`);
    }
  }

  return html.filter(Boolean).join("\n");
};

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

  return {
    path,
    markdown,
    html: mdToHtml(markdown),
    githubUrl: data.html_url || `https://github.com/${OWNER}/${REPO}/blob/${BRANCH}/${encodeURI(path)}`,
    title: titleCase(niceName(path.split("/").pop() || "Writeup")),
    platform: path.split("/")[0] || "Unknown"
  };
};
