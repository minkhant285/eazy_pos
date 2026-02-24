// import { TRPCLink } from '@trpc/client'
// import { observable } from '@trpc/server/observable'
// import { AnyRouter } from '@trpc/server'

// export function ipcLink<TRouter extends AnyRouter>(): TRPCLink<TRouter> {
//   return () =>
//     ({ op }) =>
//       observable((observer) => {
//         const { id, type, path, input } = op

//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         window.electronTRPC.onMessage((response: any) => {
//           if (response.id !== id) return
//           if (response.error) {
//             observer.error(response.error)
//           } else {
//             observer.next({ result: { data: response.result.data } })
//             observer.complete()
//           }
//         })

//         window.electronTRPC.sendMessage({ id, type, path, input })
//       })
// }

import { TRPCLink } from '@trpc/client'
import { observable } from '@trpc/server/observable'
import { AnyRouter } from '@trpc/server'

export function ipcLink<TRouter extends AnyRouter>(): TRPCLink<TRouter> {
  return () =>
    ({ op }) =>
      observable((observer) => {
        const { id, type, path, input } = op

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.electronTRPC.onMessage((response: any) => {
          if (response.error) {
            observer.error(response.error)
          } else {
            observer.next({ result: { data: response.result.data } })
            observer.complete()
          }
        }, id as number)

        window.electronTRPC.sendMessage({ id, type, path, input })
      })
}
