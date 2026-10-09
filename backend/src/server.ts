import { startMailWorker } from './services/MailService';
import { pool } from './db/pool';
import { env } from './config/env';
import { createApp } from './app';

const app = createApp();
const stopMailWorker = startMailWorker();

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`GuessTheTeam API listening on http://localhost:${env.PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.close(() => { void stopMailWorker().then(() => pool.end()).then(() => process.exit(0)); });
});
