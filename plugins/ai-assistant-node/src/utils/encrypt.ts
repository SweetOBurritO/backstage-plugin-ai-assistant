import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';

const normalizeKey = (key: string): Buffer => {
  // Hash the key to ensure it's always 32 bytes for AES-256
  return createHash('sha256').update(key).digest();
};

export const encrypt = (text: string, key: string): string => {
  const iv = randomBytes(16);
  const normalizedKey = normalizeKey(key);
  const cipher = createCipheriv('aes-256-gcm', normalizedKey, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
};

export const decrypt = (encryptedText: string, key: string): string => {
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const authTag = Buffer.from(parts[2], 'hex');
  const normalizedKey = normalizeKey(key);
  const decipher = createDecipheriv('aes-256-gcm', normalizedKey, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
