import os from 'os';
import crypto from 'crypto';

/** Returns a stable SHA-256 machine fingerprint based on MAC + hostname + platform. */
export function getMachineId(): string {
  const ifaces = os.networkInterfaces();
  const macs: string[] = [];

  for (const addrs of Object.values(ifaces)) {
    for (const addr of addrs ?? []) {
      if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
        macs.push(addr.mac.toLowerCase());
      }
    }
  }

  macs.sort();
  const raw = [os.hostname(), os.platform(), macs[0] ?? 'unknown'].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}
