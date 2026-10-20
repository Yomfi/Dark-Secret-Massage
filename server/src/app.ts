import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { env } from './config/env';
import { authRouter } from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

/** Resolve repo-root Vite `dist/` from compiled `server/dist/*.js`. */
export function resolveFrontendDist(): string {
  return path.resolve(__dirname, '..', '..', 'dist');
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
    app.use(
      express.static(frontendDist, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );

    // SPA fallback for client-side routes (never for /api — handled above)
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'The requested resource was not found.' },
        });
      }
      res.sendFile(indexHtml, (err) => {
        if (err) next(err);
      });
    });
  } else if (env.isProd) {
    console.warn(
      `Frontend build not found at ${frontendDist}. Run root "npm run build:production" before start.`
    );
  }

  app.use(errorHandler);

  return app;
}
