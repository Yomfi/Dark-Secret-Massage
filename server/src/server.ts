import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

async function main() {
  const app = createApp();

  try {
    await prisma.$connect();
  } catch (err) {
    console.error('Failed to connect to MySQL. Check DATABASE_URL.', err);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.info(`Dark Secret API listening on port ${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
