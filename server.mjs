import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number.parseInt(process.env.PORT ?? "5173", 10);
const ROOT = __dirname;

const CONTENT_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".md", "text/markdown; charset=utf-8"]
]);

function safeResolveUrlPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] || "/");
  const normalized = decoded.replaceAll("\\\\", "/");
  const relative = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  const resolved = path.resolve(ROOT, relative);
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }

    let fsPath = safeResolveUrlPath(req.url);
    if (!fsPath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    if (fsPath.endsWith(path.sep)) fsPath = path.join(fsPath, "index.html");
    if (path.extname(fsPath) === "") fsPath = path.join(fsPath, "index.html");

    const body = await readFile(fsPath);
    const contentType = CONTENT_TYPES.get(path.extname(fsPath).toLowerCase()) ?? "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });
    res.end(body);
  } catch (err) {
    if (String(err?.code) === "ENOENT") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(500);
    res.end("Internal server error");
  }
});

server.listen(PORT, () => {
  console.log(`Shrink Ray sim running on http://localhost:${PORT}`);
});

