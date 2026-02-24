import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/main/db/schemas/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './pos.db',
  },
})
