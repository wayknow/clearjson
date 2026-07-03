// Simple test server — serves JSON files with correct Content-Type
// Usage: node server.js
// Then open http://localhost:8765/complex-api-response.json etc.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const DIR = __dirname;

const MIME = {
  '.json': 'application/json',
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = path.join(DIR, url.pathname === '/' ? 'index.html' : url.pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found: ' + url.pathname);
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('Test server running at http://localhost:' + PORT);
  console.log('');
  console.log('Test URLs:');
  fs.readdirSync(DIR).filter(f => f.endsWith('.json')).forEach(f => {
    console.log(`  http://localhost:${PORT}/${f}`);
  });
});
