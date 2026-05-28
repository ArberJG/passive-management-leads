import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4280);
const host = "127.0.0.1";

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function resolveRequest(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const clean = path.normalize(decoded).replace(/^([/\\])+/, "");
  const target = path.join(root, clean || "index.html");
  return target.startsWith(root) ? target : null;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${host}`);
  const filePath = resolveRequest(url.pathname);

  if (!filePath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`RIA Lead CRM running at http://${host}:${port}`);
});
