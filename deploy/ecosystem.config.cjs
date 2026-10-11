const path = require('node:path');
module.exports = {
  apps: [{
    name: 'guesstheteam-api',
    cwd: path.resolve(__dirname, '..'),
    script: 'backend/src/server.ts',
    interpreter: process.execPath,
    node_args: ['--import', path.resolve(__dirname, '../node_modules/tsx/dist/loader.mjs')],
    env: { NODE_ENV: 'production', PORT: '4000', HOST: '127.0.0.1' },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    restart_delay: 5000
  }]
};
