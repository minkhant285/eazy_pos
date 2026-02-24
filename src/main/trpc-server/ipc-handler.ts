// src/main/ipc-handler.ts
import { ipcMain, IpcMainEvent } from 'electron'
import { AnyRouter, callTRPCProcedure, getTRPCErrorFromUnknown } from '@trpc/server'

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createIPCHandler({ router }: { router: AnyRouter }) {
  ipcMain.on('electron-trpc', async (event: IpcMainEvent, op) => {
    try {
      const result = await callTRPCProcedure({
        router: router,
        path: op.path,
        getRawInput: async () => op.input,
        ctx: {},
        type: op.type,
        signal: undefined,
        batchIndex: 0
      })
      event.reply('electron-trpc', { id: op.id, result: { data: result } })
    } catch (err) {
      const trpcErr = getTRPCErrorFromUnknown(err)
      event.reply('electron-trpc', {
        id: op.id,
        error: {
          message: trpcErr.message,
          code: trpcErr.code
        }
      })
    }
  })
}
