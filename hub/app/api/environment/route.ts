import { existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

// Comprehensive known list — checked against /Applications and ~/Applications
const KNOWN_EDITORS = [
  { id: 'vscode',      label: 'VS Code',       appName: 'Visual Studio Code' },
  { id: 'cursor',      label: 'Cursor',         appName: 'Cursor' },
  { id: 'zed',         label: 'Zed',            appName: 'Zed' },
  { id: 'phpstorm',    label: 'PhpStorm',       appName: 'PhpStorm' },
  { id: 'webstorm',    label: 'WebStorm',       appName: 'WebStorm' },
  { id: 'sublime',     label: 'Sublime Text',   appName: 'Sublime Text' },
  { id: 'nova',        label: 'Nova',           appName: 'Nova' },
  { id: 'bbedit',      label: 'BBEdit',         appName: 'BBEdit' },
  { id: 'textmate',    label: 'TextMate',       appName: 'TextMate' },
  { id: 'antigravity', label: 'Antigravity',    appName: 'Antigravity' },
  { id: 'codeedit',    label: 'CodeEdit',       appName: 'CodeEdit' },
  { id: 'atom',        label: 'Atom',           appName: 'Atom' },
  { id: 'brackets',    label: 'Brackets',       appName: 'Brackets' },
  { id: 'coderunner',  label: 'CodeRunner',     appName: 'CodeRunner' },
  { id: 'rubymine',    label: 'RubyMine',       appName: 'RubyMine' },
  { id: 'intellij',    label: 'IntelliJ IDEA',  appName: 'IntelliJ IDEA' },
];

const KNOWN_TERMINALS = [
  { id: 'terminal',  label: 'Terminal',   appName: 'Terminal' },
  { id: 'iterm2',    label: 'iTerm2',     appName: 'iTerm' },
  { id: 'warp',      label: 'Warp',       appName: 'Warp' },
  { id: 'ghostty',   label: 'Ghostty',    appName: 'Ghostty' },
  { id: 'hyper',     label: 'Hyper',      appName: 'Hyper' },
  { id: 'alacritty', label: 'Alacritty',  appName: 'Alacritty' },
  { id: 'kitty',     label: 'kitty',      appName: 'kitty' },
  { id: 'wave',      label: 'Wave',       appName: 'Wave' },
];

function appExists(appName: string): boolean {
  const appDirs = [
    '/Applications',
    path.join(homedir(), 'Applications'),
    '/System/Applications',
    '/System/Applications/Utilities',
  ];
  return appDirs.some(dir => existsSync(path.join(dir, `${appName}.app`)));
}

export interface DetectedApp {
  id: string;
  label: string;
  appName: string;
  available: boolean;
}

export async function GET() {
  const editors: DetectedApp[] = KNOWN_EDITORS.map(e => ({
    ...e,
    available: appExists(e.appName),
  }));

  const terminals: DetectedApp[] = KNOWN_TERMINALS.map(t => ({
    ...t,
    available: appExists(t.appName),
  }));

  // Only return what's installed
  return Response.json({
    editors: editors.filter(e => e.available),
    terminals: terminals.filter(t => t.available),
  });
}
