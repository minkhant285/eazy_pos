import crypto from 'crypto';

// Ed25519 PUBLIC key only — safe to embed in the app.
// The private key lives exclusively in scripts/keygen.js (never shipped).
// Even if someone extracts this from the app bundle, they can VERIFY keys
// but cannot generate new ones without the private key.
const PUBLIC_KEY_PEM = [
  '-----BEGIN PUBLIC KEY-----',
  'MCowBQYDK2VwAyEAbggOu/YZpu1l9sKVXDiL/KMJNRQFR+TJXc9ij646VuM=',
  '-----END PUBLIC KEY-----',
].join('\n');

export interface VerifyResult {
  valid: boolean;
  expiresAt?: Date;
  error?: string;
}

/** Verify a MKJRNL-… activation key against a machine ID. */
export function verifyKey(key: string, machineId: string): VerifyResult {
  try {
    if (!key.startsWith('MKJRNL-')) return { valid: false, error: 'Invalid key format' };

    const b64 = key.slice(7);
    const payload = Buffer.from(b64, 'base64url').toString('utf8');
    const parts = payload.split(':');
    if (parts.length !== 3) return { valid: false, error: 'Malformed key' };

    const [midPrefix, expStr, sigHex] = parts;

    // Machine binding — server stores first 16 chars of SHA256(machineId)
    const midHash = crypto.createHash('sha256').update(machineId).digest('hex');
    if (midHash.slice(0, 16) !== midPrefix) {
      return { valid: false, error: 'Key not valid for this machine' };
    }

    // Ed25519 signature verification — cannot be forged without the private key
    const message = Buffer.from(`${midPrefix}:${expStr}`);
    const signature = Buffer.from(sigHex, 'hex');
    const ok = crypto.verify(null, message, PUBLIC_KEY_PEM, signature);
    if (!ok) return { valid: false, error: 'Invalid key signature' };

    // Expiry check
    const exp = parseInt(expStr, 10);
    if (isNaN(exp)) return { valid: false, error: 'Bad expiry in key' };

    const expiresAt = new Date(exp * 1000);
    if (Date.now() > exp * 1000) {
      return { valid: false, expiresAt, error: 'Key expired' };
    }

    return { valid: true, expiresAt };
  } catch {
    return { valid: false, error: 'Key parse error' };
  }
}
