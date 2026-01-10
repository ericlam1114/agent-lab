import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './agent-evals/src/db/schema.ts',
  out: './agent-evals/src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.agentevals/evals.db',
  },
});
