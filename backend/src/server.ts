import { env } from './config/env';
import { createApp } from './app';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`FootyGuesser API listening on http://localhost:${env.PORT}`);
});
