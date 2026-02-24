// src/renderer/src/trpc.ts
import { createTRPCReact } from '@trpc/react-query'
import { ipcLink } from './ipc-link'
import type { AppRouter } from '../../../main/trpc-server/router'

export const trpc = createTRPCReact<AppRouter>()

export const client = trpc.createClient({
  links: [ipcLink()]
})
