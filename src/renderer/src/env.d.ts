/// <reference types="vite/client" />
interface Window {
  electronTRPC: {
    sendMessage: (op: unknown) => void
    onMessage: (cb: (data: unknown) => void, id: number) => void
  }
  backupApi: {
    save: () => Promise<{ success: boolean; path?: string; error?: string }>
    restore: () => Promise<{ success: boolean; error?: string }>
    selectFolder: () => Promise<{ success: boolean; folderPath?: string }>
    saveToFolder: (folderPath: string) => Promise<{ success: boolean; path?: string; fileName?: string; error?: string }>
  }
  appApi: {
    cleanData: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  }
  printApi: {
    printReceipt: (html: string) => Promise<{ success: boolean; error?: string }>
  }

}
