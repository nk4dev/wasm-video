const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const COOP = 'same-origin';
const COEP = 'require-corp';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function sendFile(res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', type);

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      res.statusCode = 500;
      res.end('Server error');
    });
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  // Set COOP and COEP headers for every response
  res.setHeader('Cross-Origin-Opener-Policy', COOP);
  res.setHeader('Cross-Origin-Embedder-Policy', COEP);

  // Only allow GET/HEAD for static serving
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  // Normalize requested path and serve files from project root
  let safePath = decodeURIComponent(req.url.split('?')[0] || '/');
  if (safePath.includes('\0')) { // null byte attack protection
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  if (safePath === '/') safePath = '/index.html';
  const filePath = path.join(__dirname, safePath);

  // Prevent path traversal
  if (!filePath.startsWith(__dirname)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}/`);
  console.log(`Headers set:`);
  console.log(`  Cross-Origin-Opener-Policy: ${COOP}`);
  console.log(`  Cross-Origin-Embedder-Policy: ${COEP}`);
});

// Graceful shutdown on SIGINT/SIGTERM
process.on('SIGINT', () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
});
