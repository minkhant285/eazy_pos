import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'

const ALGORITHM = 'aes-256-gcm'
// 32-byte key — never exposed to the renderer process
const SECRET = Buffer.from('mkjrnl-easypos-backup-2024-keys!', 'utf8') // 32 bytes

interface MkbakPayload {
  v: number
  app: string
  created: string
  iv: string
  tag: string
  data: string
}

export function encryptDbFile(dbFilePath: string): Buffer {
  const raw = readFileSync(dbFilePath)
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, SECRET, iv)
  const encrypted = Buffer.concat([cipher.update(raw), cipher.final()])
  const tag = cipher.getAuthTag()

  const payload: MkbakPayload = {
    v: 1,
    app: 'mkjournal',
    created: new Date().toISOString(),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('base64'),
  }

  return Buffer.from(JSON.stringify(payload), 'utf8')
}

export function decryptMkbakToFile(mkbakBuffer: Buffer, outPath: string): void {
  let payload: MkbakPayload
  try {
    payload = JSON.parse(mkbakBuffer.toString('utf8'))
  } catch {
    throw new Error('Invalid backup file — could not parse')
  }

  if (payload.v !== 1 || payload.app !== 'mkjournal') {
    throw new Error('Invalid or incompatible backup file')
  }

  const iv = Buffer.from(payload.iv, 'hex')
  const tag = Buffer.from(payload.tag, 'hex')
  const encrypted = Buffer.from(payload.data, 'base64')

  const decipher = createDecipheriv(ALGORITHM, SECRET, iv)
  decipher.setAuthTag(tag)
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

  writeFileSync(outPath, decrypted)
}
