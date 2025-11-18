#!/usr/bin/env node

/**
 * REST API Server for MCP Network Testing
 * Provides HTTP REST API access to all network testing tools
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { logger } from '../logger/index.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { swaggerSpec } from './swagger.js';
import { toolsRouter } from './routes/tools.js';
import { healthRouter } from './routes/health.js';

// Load environment variables
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Check for global .env file first (for npm global installs)
const globalEnvPath = join(homedir(), '.mcp-network.env');
const localEnvPath = join(process.cwd(), '.env');

if (existsSync(globalEnvPath)) {
  dotenv.config({ path: globalEnvPath });
} else if (existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config(); // Try default .env location
}

const app: Express = express();
const PORT = parseInt(process.env.API_PORT || '3000', 10);
const API_ENABLED = process.env.API_ENABLED !== 'false';

// Security middleware
app.use(helmet());

// CORS configuration - restrictive by default, configurable via environment
// Supports: false (no CORS), * (all origins), or comma-separated list of origins
const corsOrigin = process.env.CORS_ORIGIN;
let origin: boolean | string | string[] = false; // Default: same-origin only

if (corsOrigin === '*') {
  origin = true; // Allow all origins (insecure, for development only)
} else if (corsOrigin && corsOrigin.trim()) {
  origin = corsOrigin.split(',').map(o => o.trim()); // Array of allowed origins
}

const corsOptions: cors.CorsOptions = {
  origin,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(compression());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.API_RATE_LIMIT_MAX || '100', 10),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  }, 'API request received');
  next();
});

// API Documentation (Swagger UI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'MCP Network Testing API',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
}));

// Health check endpoint (no auth required)
app.use('/health', healthRouter);

// API routes (auth required)
app.use('/api/tools', authMiddleware, toolsRouter);

// Root redirect to API docs
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/api-docs');
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: {
      documentation: '/api-docs',
      health: '/health',
      tools: '/api/tools'
    }
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
function startServer() {
  if (!API_ENABLED) {
    logger.warn('API server is disabled (API_ENABLED=false)');
    return;
  }

  app.listen(PORT, () => {
    logger.info(`🚀 REST API server started on port ${PORT}`);
    logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    logger.info(`💚 Health check: http://localhost:${PORT}/health`);
    logger.info(`🔧 Tools endpoint: http://localhost:${PORT}/api/tools`);
  });
}

// Start if run directly (not in test mode)
// Note: Auto-start disabled during tests to allow for testing
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  startServer();
}

export { app, startServer };
