export const API_BASE = '/api';

export interface Paste {
  id: string;
  text?: string;
  protected: boolean;
  timeoutUnix: number;
}

export interface CreatePasteRequest {
  expiry: number;
  passProtect: boolean;
  pass: string;
  pasteText: string;
}

// Transport Encryption Logic
async function fetchKey(): Promise<string> {
  const storedKeyData = sessionStorage.getItem("transportKey");
  if (storedKeyData) {
    const { key, timestamp } = JSON.parse(storedKeyData);
    if (Date.now() - timestamp < 300000) { // 5 mins
      return key;
    }
  }

  const response = await fetch(`${API_BASE}/token`);
  if (!response.ok) throw new Error("Failed to fetch encryption key");
  const data = await response.json();
  
  sessionStorage.setItem("transportKey", JSON.stringify({
    key: data.key,
    timestamp: Date.now()
  }));

  return data.key;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function encryptJSON(data: any): Promise<string> {
  const keyHex = await fetchKey();
  // Import Key (AES-CBC)
  // We use the raw bytes of the hex string as key?
  // Go backend sends 64-char hex string. 
  // If we decode hex -> 32 bytes.
  
  const keyBytes = hexToBytes(keyHex);
  
  const key = await window.crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const jsonStr = JSON.stringify(data);
  const encoded = new TextEncoder().encode(jsonStr);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    encoded
  );

  // Combine IV + Ciphertext
  const encryptedBytes = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedBytes.length);
  combined.set(iv);
  combined.set(encryptedBytes, iv.length);

  return arrayBufferToBase64(combined.buffer);
}

export async function decryptJSON<T>(encryptedBase64: string): Promise<T> {
  const keyHex = await fetchKey();
  const keyBytes = hexToBytes(keyHex);

  const key = await window.crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );

  const combinedBuffer = base64ToArrayBuffer(encryptedBase64);
  const combined = new Uint8Array(combinedBuffer);

  const iv = combined.slice(0, 16);
  const data = combined.slice(16);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    key,
    data
  );

  const decoded = new TextDecoder().decode(decrypted);
  return JSON.parse(decoded);
}

export async function apiPost(endpoint: string, data: any) {
  // Encrypt data
  const encrypted = await encryptJSON(data);
  
  // Send as raw string (in JSON body? or raw body?)
  // Backend middleware expects raw body or JSON string?
  // Middleware: io.ReadAll(c.Request.Body) -> encryptedStr.
  // If we use fetch body: JSON.stringify(encrypted), it sends "base64...".
  // Backend handles quotes.
  
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(encrypted),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
     throw new Error(`API Error: ${response.status}`);
  }

  // Response might be encrypted (string) or JSON (object).
  // If content-type is json, we can check.
  const text = await response.text();
  try {
     // Try parsing as JSON first
     const json = JSON.parse(text);
     // If it's the encrypted string, it's a string?
     if (typeof json === 'string') {
        // Likely encrypted response
        try {
           return await decryptJSON(json);
        } catch (e) {
           // Not encrypted or decryption failed, return as is (maybe it's just a string ID)
           return json;
        }
     }
     return json;
  } catch (e) {
     // Not JSON, return text
     return text;
  }
}
