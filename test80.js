const http = require('http'); const s = http.createServer(); s.listen(80, () = console.log('success'); process.exit(0); }).on('error', (e) = console.error(e.message); process.exit(1); });  
