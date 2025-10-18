import { env } from './config/env.js';
import { connectMongo } from './db/connection.js';
import { createApp } from './app.js';

const app = createApp();

const start = async () => {
  await connectMongo();
  app.listen(env.port, () => {
    console.log(`[server] listening on port ${env.port}`);
  });
};

void start();
