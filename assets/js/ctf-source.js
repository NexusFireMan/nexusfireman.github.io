const OWNER = "NexusFireMan";
const REPO = "CTF";
const BRANCH = "main";

const API_TREE = `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;
const encodePath = (path) => path.split("/").map((part) => encodeURIComponent(part)).join("/");

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

const getTree = async () => {
  const response = await fetch(API_TREE);
  if (!response.ok) throw new Error(`GitHub API ${response.status}`);
  return response.json();
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
  const id = encodeURIComponent(path);

  return {
    id,
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

export const fetchCtfEntriesFromGithub = async () => {
  const treeData = await getTree();
  const files = (treeData.tree || [])
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path)
    .filter((path) => /\.md$/i.test(path) && path.includes("/"));

  return files
    .sort((a, b) => a.localeCompare(b, "es"))
    .map(buildEntry);
};

export const fetchCtfMarkdownById = async (encodedPath) => {
  const path = decodeURIComponent(encodedPath);
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
