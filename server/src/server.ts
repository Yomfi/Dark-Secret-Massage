import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

async function main() {
  const app = createApp();

  try {
    await prisma.$connect();
  } catch (err) {
    console.error('Failed to connect to MySQL. Check DATABASE_URL.');
    if (!env.isProd) {
      console.error(err);
    }
    process.exit(1);
  }

  // Bind all interfaces so Hostinger (and containers) can reach the process.
  // Port always comes from process.env.PORT in production.
  const host = process.env.HOST || '0.0.0.0';
  app.listen(env.port, host, () => {
    console.info(`Dark Secret API listening on ${host}:${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
