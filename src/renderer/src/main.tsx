// src/renderer/src/main.tsx
import './assets/main.css'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { trpc, client } from './trpc-client/trpc'
import App from './App'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <trpc.Provider client={client} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
)
