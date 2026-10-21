import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

async function main() {
  const app = createApp();

  if (!env.skipDbConnect) {
    try {
      await prisma.$connect();
    } catch (err) {
      console.error('Failed to connect to MySQL. Check DATABASE_URL.');
      if (!env.isProd) {
        console.error(err);
      }
      process.exit(1);
    }
  } else {
    console.warn('SKIP_DB_CONNECT=true — starting without MySQL (smoke/static only).');
  }

  // Bind all interfaces for Hostinger / containers. Port from env (default 3000).
  const host = process.env.HOST || '0.0.0.0';
  app.listen(env.port, host, () => {
    console.info(`Dark Secret listening on ${host}:${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
