const fs = require('fs');
let code = fs.readFileSync('backend/server_revert.js', 'utf8');
code = code.replace(/expiresIn: '24h'/g, "expiresIn: '365d'");
code = code.replace(/expiresIn: '7d'/g, "expiresIn: '365d'");
fs.writeFileSync('backend/server.js', code);
