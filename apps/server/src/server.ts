import { createApp } from './app.js';
import { config } from './config/config.js';
import { database } from './database/context.js';

const app = createApp();
const server = app.listen(config.port, config.host, () => {
  console.log(`Peanut server: http://${config.host}:${config.port}`);
});

function shutdown(): void {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
