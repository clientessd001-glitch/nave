import type { BookmarkItem, EncryptedSyncEnvelope } from '../types/browser';

const PBKDF2_ITERATIONS = 100_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function deriveVaultId(passphrase: string): Promise<string> {
  const normalized = passphrase.trim();
  if (normalized.length < 6) {
    throw new Error('A frase-chave de sincronização deve ter pelo menos 6 caracteres.');
  }
  const data = new TextEncoder().encode(`veloce-vault-id-v1:${normalized}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return `vault_${bytesToHex(new Uint8Array(digest)).slice(0, 20)}`;
}

async function deriveAesGcmKey(
  passphrase: string,
  salt: Uint8Array,
  usages: KeyUsage[]
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase.trim()),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usages
  );
}

export async function encryptBookmarksPayload(
  bookmarks: BookmarkItem[],
  passphrase: string,
  deviceName = 'Estação Web · Veloce'
): Promise<EncryptedSyncEnvelope> {
  const vaultId = await deriveVaultId(passphrase);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesGcmKey(passphrase, salt, ['encrypt']);

  const plaintextJson = JSON.stringify({
    schema: 'veloce.bookmarks.v1',
    exportedAt: new Date().toISOString(),
    bookmarks,
  });
  const plaintextBytes = new TextEncoder().encode(plaintextJson);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintextBytes
  );
  const cipherBytes = new Uint8Array(cipherBuffer);

  const digestBuffer = await crypto.subtle.digest('SHA-256', cipherBytes);
  const sha256Digest = bytesToHex(new Uint8Array(digestBuffer));

  return {
    vaultId,
    ivBase64: bytesToBase64(iv),
    saltBase64: bytesToBase64(salt),
    ciphertextBase64: bytesToBase64(cipherBytes),
    sha256Digest,
    byteLength: cipherBytes.byteLength,
    encryptedAt: new Date().toISOString(),
    updatedByDevice: deviceName,
  };
}

export async function decryptBookmarksPayload(
  envelope: EncryptedSyncEnvelope,
  passphrase: string
): Promise<BookmarkItem[]> {
  const salt = base64ToBytes(envelope.saltBase64);
  const iv = base64ToBytes(envelope.ivBase64);
  const cipherBytes = base64ToBytes(envelope.ciphertextBase64);

  const key = await deriveAesGcmKey(passphrase, salt, ['decrypt']);

  let plainBuffer: ArrayBuffer;
  try {
    plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      cipherBytes as BufferSource
    );
  } catch {
    throw new Error('Falha na autenticação GCM: chave incorreta ou pacote adulterado.');
  }

  const decoded = new TextDecoder().decode(plainBuffer);
  const parsed = JSON.parse(decoded) as { schema?: string; bookmarks?: unknown };
  if (parsed.schema !== 'veloce.bookmarks.v1' || !Array.isArray(parsed.bookmarks)) {
    throw new Error('Estrutura de favoritos decifrada inválida.');
  }

  return parsed.bookmarks as BookmarkItem[];
}
