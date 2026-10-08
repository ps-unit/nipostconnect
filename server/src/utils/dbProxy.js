const net = require("net");

let proxyServer = null;

function startDbProxy(remoteHost = "ep-fancy-rain-abp58drj.eu-west-2.aws.neon.tech", remotePort = 5432, localPort = 5433) {
  return new Promise((resolve, reject) => {
    if (proxyServer) return resolve();

    const server = net.createServer((clientSocket) => {
      const remoteSocket = net.connect({
        host: remoteHost,
        port: remotePort,
        family: 4 // Force IPv4 to bypass broken Windows IPv6 routing
      });

      clientSocket.pipe(remoteSocket);
      remoteSocket.pipe(clientSocket);

      clientSocket.on("error", () => {});
      remoteSocket.on("error", () => {});
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        // Port already bound (e.g. from previous run), proceed
        resolve();
      } else {
        reject(err);
      }
    });

    server.listen(localPort, "127.0.0.1", () => {
      proxyServer = server;
      console.log(`   DB IPv4 Bridge: 127.0.0.1:${localPort} -> ${remoteHost}:${remotePort}`);
      resolve();
    });
  });
}

module.exports = { startDbProxy };
