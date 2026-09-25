const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../dist/client');
const PORT = 4173;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

function requestHandler(req, res) {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(ROOT, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    res.statusCode = 404;
    res.end('Not Found');
  });
  stream.pipe(res);
}

const server4173 = http.createServer(requestHandler);
server4173.listen(PORT, '0.0.0.0', () => {
  console.log(`MaarifOS Server active at http://localhost:${PORT}`);
});

try {
  const server80 = http.createServer(requestHandler);
  server80.on('error', (err) => {
    console.log(`Port 80 not available (${err.message}), continuing with port ${PORT}`);
  });
  server80.listen(80, '0.0.0.0', () => {
    console.log(`MaarifOS Server also active at http://localhost:80 (http://maarifos.com / http://maarifos.net)`);
  });
} catch (e) {
  console.log('Port 80 error:', e.message);
}
