import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. Set it in your .env file or environment.\n" +
    "Example: DATABASE_URL=postgresql://user:password@localhost:5432/matami"
  );
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: false,
});
