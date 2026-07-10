import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaLibSQL } from '@prisma/adapter-libsql';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  experimental: { adapter: true },
  engine: 'js',
  adapter: async () =>
    new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
});
