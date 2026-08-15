const localtunnel = require('localtunnel');

(async () => {
  const startTunnel = async () => {
    try {
      const tunnel = await localtunnel({ port: 3000 });
      console.log('Tunnel started:', tunnel.url);

      tunnel.on('close', () => {
        console.log('Tunnel closed, restarting...');
        startTunnel();
      });

      tunnel.on('error', (err) => {
        console.error('Tunnel error:', err);
        tunnel.close();
      });
    } catch (err) {
      console.error('Tunnel connection failed:', err);
      setTimeout(startTunnel, 5000);
    }
  };

  startTunnel();
})();
