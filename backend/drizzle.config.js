// drizzle-kit config — generates SQL migrations from src/db/schema.js into
// ./drizzle. Run `npm run db:generate` after changing the schema; migrations are
// applied automatically on server startup (see src/db/index.js).
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/db/schema.js',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || './data/resumex.db',
  },
});
