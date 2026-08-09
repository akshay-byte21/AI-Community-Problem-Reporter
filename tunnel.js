const { spawn } = require('child_process');

function startTunnel() {
  console.log('Starting tunnel...');
  const lt = spawn('npx', ['--yes', 'localtunnel', '--port', '3000', '--subdomain', 'reporter-app-backend-123'], { shell: true });
  
  lt.stdout.on('data', d => {
    console.log(`[LT] ${d.toString().trim()}`);
  });
  
  lt.stderr.on('data', d => {
    console.error(`[LT ERR] ${d.toString().trim()}`);
  });
  
  lt.on('close', () => {
    console.log('Tunnel closed. Restarting in 2 seconds...');
    setTimeout(startTunnel, 2000);
  });
}

startTunnel();
