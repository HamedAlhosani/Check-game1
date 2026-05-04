import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET || 'check-game-local-secret-2024';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(uid: string): string {
  return jwt.sign({ uid }, SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { uid: string } | null {
  try {
    return jwt.verify(token, SECRET) as { uid: string };
  } catch {
    return null;
  }
}
