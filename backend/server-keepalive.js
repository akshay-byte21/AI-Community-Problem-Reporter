const { spawn } = require('child_process');

function startServer() {
  console.log('Starting backend server...');
  const child = spawn('node', ['server.js'], { stdio: 'inherit' });

  child.on('close', (code) => {
    console.log(`Server process exited with code ${code}. Restarting in 2 seconds...`);
    setTimeout(startServer, 2000);
  });
}

startServer();
