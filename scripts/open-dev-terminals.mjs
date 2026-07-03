import { execFile } from 'node:child_process';
import { cwd } from 'node:process';

const projectDir = cwd();

const tabs = [
  {
    title: 'GuessTheTeam Backend',
    command: 'npm run backend:dev',
  },
  {
    title: 'GuessTheTeam Frontend',
    command: 'npm run dev',
  },
];

const appleScript = `
tell application "Terminal"
  activate
${tabs.map((tab, index) => {
  const command = [
    `cd ${shellQuote(projectDir)}`,
    `printf '\\\\e]1;${escapeForShell(tab.title)}\\\\a'`,
    tab.command,
  ].join(' && ');

  if (index === 0) {
    return `  do script ${appleScriptQuote(command)}`;
  }

  return [
    '  tell application "System Events" to keystroke "t" using command down',
    '  delay 0.2',
    `  do script ${appleScriptQuote(command)} in selected tab of front window`,
  ].join('\n');
}).join('\n')}
end tell
`;

execFile('osascript', ['-e', appleScript], (error) => {
  if (error) {
    console.error(`Could not open Terminal tabs: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log('Opened Backend and Frontend in separate Terminal tabs.');
});

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function escapeForShell(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
}

function appleScriptQuote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
