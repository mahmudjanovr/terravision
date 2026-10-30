/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TERRAVISION Backend Server & Secure OpenAQ Proxy
 * Mounts Vite dev middlewares in development and proxies requests securely.
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  const hasKey = Boolean(process.env.OPENAQ_API_KEY && process.env.OPENAQ_API_KEY.trim() !== '');
  res.json({
    status: 'ok',
    phase: 'Phase 2.2: Historical Climate Data & Final Data Integrity',
    hasOpenAqKey: hasKey,
    openAqStatus: hasKey ? 'CONFIGURED' : 'NOT_CONFIGURED',
    timestamp: new Date().toISOString(),
  });
});

// Secure OpenAQ v3 Proxy
app.get('/api/openaq/*', async (req, res) => {
  const apiKey = process.env.OPENAQ_API_KEY;

  // Strict enforcement: if key is absent, return NOT_CONFIGURED without calling external API
  if (!apiKey || apiKey.trim() === '') {
    return res.status(503).json({
      error: 'NOT_CONFIGURED',
      message: 'OpenAQ API v3 requires an authentication key. Set OPENAQ_API_KEY in the server environment (.env).',
      provider: 'OpenAQ',
      documentation: 'https://docs.openaq.org/',
    });
  }

  try {
    const rawSubPath = (req.params as Record<string, string>)[0] || '';
    const cleanSubPath = rawSubPath.replace(/^\/+/, '');

    // Anti-SSRF and Path Traversal Security:
    // Reject path traversal ('..'), protocol injection ('://'), or backslashes
    if (cleanSubPath.includes('..') || cleanSubPath.includes('://') || cleanSubPath.includes('\\')) {
      return res.status(400).json({
        error: 'INVALID_PATH',
        message: 'Path traversal and protocol injection are strictly forbidden.',
      });
    }

    // Strict whitelist of allowable OpenAQ v3 endpoints
    const OPENAQ_PATH_WHITELIST = /^(locations(\/\d+(\/(latest|sensors))?)?|sensors(\/\d+(\/measurements)?)?|parameters|countries|providers|manufacturers)$/;

    if (!OPENAQ_PATH_WHITELIST.test(cleanSubPath)) {
      return res.status(403).json({
        error: 'FORBIDDEN_ENDPOINT',
        message: `Access to OpenAQ path '${cleanSubPath}' is not permitted through this proxy.`,
      });
    }

    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = `https://api.openaq.org/v3/${cleanSubPath}${queryString}`;

    const headers: Record<string, string> = {
      'User-Agent': 'TERRAVISION-Environmental-Intelligence/2.0',
      'Accept': 'application/json',
      'X-API-Key': apiKey.trim(),
    };

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    // Forward upstream rate limit headers if present
    if (response.headers.has('retry-after')) {
      res.setHeader('Retry-After', response.headers.get('retry-after')!);
    }
    if (response.headers.has('x-ratelimit-remaining')) {
      res.setHeader('X-RateLimit-Remaining', response.headers.get('x-ratelimit-remaining')!);
    }

    const data = await response.json().catch(() => ({}));
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({
      error: 'UPSTREAM_PROXY_ERROR',
      message: err.message,
    });
  }
});

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(import.meta.dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TERRAVISION Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TERRAVISION server:', err);
  process.exit(1);
});
