import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { env } from './config/env';
import { authRouter } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

/**
 * Resolve the Vite SPA directory.
 * Preferred: `server/dist/public` (synced next to the compiled entry).
 * Fallbacks keep local/dev layouts working.
 */
export function resolveFrontendDist(): string {
  const candidates = [
    path.resolve(__dirname, 'public'), // server/dist/public (Hostinger-safe)
    path.resolve(__dirname, '..', 'public'), // server/public
    path.resolve(__dirname, '..', '..', 'dist'), // repo-root dist/
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), 'server', 'dist', 'public'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  return candidates[0];
}

function isStaticAssetPath(requestPath: string): boolean {
  return /\.(?:js|css|map|json|ico|png|jpe?g|gif|webp|svg|woff2?|ttf|eot|txt|webmanifest)$/i.test(
    requestPath
  );
}

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      // SPA assets are same-origin; avoid overly strict defaults that break Vite builds.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Same-origin in production; CORS kept for local Vite (different port) when configured.
  if (env.corsOrigins.length > 0) {
    app.use(
      cors({
        origin(origin, callback) {
          if (!origin) return callback(null, true);
          if (env.corsOrigins.includes(origin)) return callback(null, true);
          return callback(null, false);
        },
        credentials: true,
      })
    );
  }

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());

  // --- API routes first ---
  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', service: 'dark-secret-api' } });
  });

  app.use('/api/auth', authRouter);

  // Unknown /api/* must stay JSON — never React index.html
  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
    });
  });

  // --- Frontend static + SPA fallback ---
  const frontendDist = resolveFrontendDist();
  const indexHtml = path.join(frontendDist, 'index.html');

  if (fs.existsSync(indexHtml)) {
    console.info(`Serving frontend from ${frontendDist}`);
    app.use(
      express.static(frontendDist, {
        index: false,
        fallthrough: true,
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    // SPA fallback for client-side routes. Never for /api or missing hashed assets
    // (serving index.html as JS/CSS causes a blank white page).
    app.get('*', (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      if (req.path.startsWith('/api')) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
        });
      }
      if (isStaticAssetPath(req.path)) {
        return res.status(404).type('text/plain').send('Not found');
      }
      res.sendFile(indexHtml, (err) => {
        if (err) next(err);
      });
    });
  } else if (env.isProd) {
    console.error(
      `Frontend build not found (looked for index.html under server/dist/public and dist/). ` +
        `Last tried: ${frontendDist}. Run root "npm run build:production" before start.`
    );
  }

  app.use(errorHandler);

  return app;
}
