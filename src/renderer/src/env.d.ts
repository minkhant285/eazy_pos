/// <reference types="vite/client" />
interface Window {
  electronTRPC: {
    sendMessage: (op: unknown) => void
    onMessage: (cb: (data: unknown) => void, id: number) => void
  }
}
