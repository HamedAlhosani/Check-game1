import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function load<T>(file: string, def: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return def; }
}

function save(file: string, data: unknown): void {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  credentials: path.join(DATA_DIR, 'credentials.json'),
  leaderboard: path.join(DATA_DIR, 'leaderboard.json'),
  history: path.join(DATA_DIR, 'history.json'),
  clans: path.join(DATA_DIR, 'clans.json'),
  clanWars: path.join(DATA_DIR, 'clan-wars.json'),
};

export const users = new Map<string, any>(
  Object.entries(load<Record<string, any>>(FILES.users, {}))
);

export const credentials = new Map<string, { uid: string; passwordHash: string }>(
  Object.entries(load<Record<string, any>>(FILES.credentials, {}))
);

export const leaderboard = new Map<string, any>(
  Object.entries(load<Record<string, any>>(FILES.leaderboard, {}))
);

export const history: any[] = load<any[]>(FILES.history, []);

export const clans = new Map<string, any>(
  Object.entries(load<Record<string, any>>(FILES.clans, {}))
);

export const clanWars = new Map<string, any>(
  Object.entries(load<Record<string, any>>(FILES.clanWars, {}))
);

export const saveUsers = () => save(FILES.users, Object.fromEntries(users));
export const saveCredentials = () => save(FILES.credentials, Object.fromEntries(credentials));
export const saveLeaderboard = () => save(FILES.leaderboard, Object.fromEntries(leaderboard));
export const saveHistory = () => save(FILES.history, history);
export const saveClans = () => save(FILES.clans, Object.fromEntries(clans));
export const saveClanWars = () => save(FILES.clanWars, Object.fromEntries(clanWars));
