// Zentrale Prisma-CLI-Konfiguration (Prisma ORM v7).
// Ersetzt die früheren CLI-Flags --schema/--url; die Verbindung steht hier
// (aus der .env), nicht im Schema.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});