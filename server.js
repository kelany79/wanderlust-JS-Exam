const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname);
const port = Number(process.env.PORT) || 4173;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const relative = pathname.replace(/^\/+/, "");
  const target = path.resolve(root, relative);
  if (!target.toLowerCase().startsWith(root.toLowerCase())) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(target, (error, data) => {
    if (!error) {
      const ext = path.extname(target);
      send(res, 200, data, types[ext] || "application/octet-stream");
      return;
    }
    const ext = path.extname(target);
    if (ext && ext !== ".html") {
      send(res, 404, "Not found");
      return;
    }
    fs.readFile(path.join(root, "index.html"), (htmlError, html) => {
      if (htmlError) {
        send(res, 500, "Missing index.html");
        return;
      }
      send(res, 200, html, types[".html"]);
    });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Wanderlust running at http://127.0.0.1:${port}`);
});
