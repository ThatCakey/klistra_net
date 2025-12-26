import { argon2id } from 'hash-wasm';

export async function deriveKeys(password: string, salt: string) {
  // We use Argon2id to derive:
  // 1. Encryption Key (32 bytes)
  // 2. Access Hash (32 bytes) - to be sent to the server
  
  const saltUint8 = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  
  // Hash once for the encryption key
  const encryptionKey = await argon2id({
    password: password,
    salt: saltUint8,
    iterations: 3,
    memorySize: 64 * 1024,
    parallelism: 4,
    hashLength: 32,
    outputType: 'binary',
  }) as Uint8Array;

  // Hash again with a different salt suffix for the access hash
  // this ensures the access hash cannot be used to recover the encryption key
  const accessHash = await argon2id({
    password: password,
    salt: new Uint8Array([...saltUint8, ...new TextEncoder().encode('access')]),
    iterations: 3,
    memorySize: 64 * 1024,
    parallelism: 4,
    hashLength: 32,
    outputType: 'hex',
  }) as string;

  return {
    encryptionKey,
    accessHash
  };
}

export async function encryptData(data: string, key: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as any,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encodedData
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(encryptedBase64: string, key: Uint8Array): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as any,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// Reuse existing file encryption but integrate with shared key logic
export async function encryptFile(file: File, key: Uint8Array): Promise<{ encryptedBlob: Blob }> {
  const arrayBuffer = await file.arrayBuffer();
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as any,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    arrayBuffer
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return {
    encryptedBlob: new Blob([combined])
  };
}

export async function decryptFile(blob: Blob, key: Uint8Array): Promise<Blob> {
  const combined = await blob.arrayBuffer();
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key as any,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );

  return new Blob([decrypted]);
}

export function generateRandomKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...salt));
}

export function keyToBase64(key: Uint8Array): string {
  return btoa(String.fromCharCode(...key)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64ToKey(base64: string): Uint8Array {
  const sanitized = base64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(sanitized);
  const key = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    key[i] = binary.charCodeAt(i);
  }
  return key;
}
