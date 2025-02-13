const net = require('net');
const logger = require('./logger');

function findAvailablePort(startPort, endPort = startPort + 10) {
  return new Promise((resolve, reject) => {
    // Always try to use port 5001 for OAuth consistency
    const requiredPort = 5001;
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${requiredPort} is in use. This port is required for OAuth to work correctly.`);
        reject(new Error(`Port ${requiredPort} is required for OAuth but is already in use. Please free up port ${requiredPort} and try again.`));
      } else {
        reject(err);
      }
    });

    server.once('listening', () => {
      server.close(() => {
        logger.info(`Using required port: ${requiredPort}`);
        resolve(requiredPort);
      });
    });

    server.listen(requiredPort);
  });
}

module.exports = findAvailablePort; 