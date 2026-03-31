import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { execa } from 'execa';

// Known editor app names (display name → app bundle name)
// Used to label detected apps nicely — not used for detection
const KNOWN_EDITOR_NAMES: Record<string, string> = {
  'visual studio code': 'VS Code',
  'cursor': 'Cursor',
  'zed': 'Zed',
  'phpstorm': 'PhpStorm',
  'webstorm': 'WebStorm',
  'sublime text': 'Sublime Text',
  'nova': 'Nova',
  'bbedit': 'BBEdit',
  'textmate': 'TextMate',
  'antigravity': 'Antigravity',
  'atom': 'Atom',
  'brackets': 'Brackets',
  'codeedit': 'CodeEdit',
  'coderunner': 'CodeRunner',
};

const KNOWN_TERMINAL_NAMES: Record<string, string> = {
  'terminal': 'Terminal',
  'iterm2': 'iTerm2',
  'iterm': 'iTerm2',
  'warp': 'Warp',
  'ghostty': 'Ghostty',
  'hyper': 'Hyper',
  'alacritty': 'Alacritty',
  'kitty': 'Kitty',
  'wave': 'Wave',
};

// Keywords that suggest an app is a code editor
const EDITOR_KEYWORDS = ['code', 'edit', 'ide', 'storm', 'develop', 'text', 'script', 'gravity', 'nova', 'bracket'];
// Keywords that suggest an app is a terminal
const TERMINAL_KEYWORDS = ['terminal', 'iterm', 'warp', 'ghostty', 'hyper', 'console', 'alacritty', 'kitty', 'wave', 'shell'];

interface DetectedApp {
  id: string;
  label: string;
  appName: string;
}

function getAppsInDir(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.app'))
      .map(f => f.replace(/\.app$/, ''));
  } catch {
    return [];
  }
}

function labelFor(appName: string, known: Record<string, string>): string {
  const key = appName.toLowerCase();
  for (const [k, v] of Object.entries(known)) {
    if (key.includes(k)) return v;
  }
  return appName;
}

function idFor(appName: string): string {
  return appName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

async function detectApps(): Promise<{ editors: DetectedApp[]; terminals: DetectedApp[] }> {
  const platform = process.platform;

  if (platform === 'darwin') {
    // Scan /Applications and ~/Applications
    const appDirs = [
      '/Applications',
      path.join(homedir(), 'Applications'),
      '/Applications/Utilities',
    ];

    const allApps = appDirs.flatMap(getAppsInDir);
    const unique = [...new Set(allApps)];

    const editors: DetectedApp[] = [];
    const terminals: DetectedApp[] = [];

    // Terminal.app lives in /System/Applications/Utilities — always available
    const systemTerminalExists = existsSync('/System/Applications/Utilities/Terminal.app');
    if (systemTerminalExists && !unique.find(a => a.toLowerCase() === 'terminal')) {
      terminals.push({ id: 'terminal', label: 'Terminal', appName: 'Terminal' });
    }

    for (const app of unique) {
      const lower = app.toLowerCase();
      const isEditor = EDITOR_KEYWORDS.some(k => lower.includes(k));
      const isTerminal = TERMINAL_KEYWORDS.some(k => lower.includes(k));

      if (isEditor) {
        editors.push({
          id: idFor(app),
          label: labelFor(app, KNOWN_EDITOR_NAMES),
          appName: app,
        });
      }
      if (isTerminal) {
        terminals.push({
          id: idFor(app),
          label: labelFor(app, KNOWN_TERMINAL_NAMES),
          appName: app,
        });
      }
    }

    return { editors, terminals };
  }

  if (platform === 'linux') {
    // Check common CLI editors
    const editorCLIs = ['code', 'cursor', 'zed', 'subl', 'atom', 'gedit', 'kate', 'vim', 'nvim'];
    const terminalCLIs = ['gnome-terminal', 'konsole', 'xterm', 'alacritty', 'kitty', 'warp'];

    const editors: DetectedApp[] = [];
    const terminals: DetectedApp[] = [];

    for (const cli of editorCLIs) {
      try {
        await execa('which', [cli]);
        editors.push({ id: cli, label: labelFor(cli, KNOWN_EDITOR_NAMES), appName: cli });
      } catch { /* not found */ }
    }
    for (const cli of terminalCLIs) {
      try {
        await execa('which', [cli]);
        terminals.push({ id: cli, label: labelFor(cli, KNOWN_TERMINAL_NAMES), appName: cli });
      } catch { /* not found */ }
    }

    return { editors, terminals };
  }

  // Windows or unknown — return empty, let user type manually
  return { editors: [], terminals: [] };
}

export async function GET() {
  try {
    const { editors, terminals } = await detectApps();
    return Response.json({ editors, terminals });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Detection failed', editors: [], terminals: [] });
  }
}
