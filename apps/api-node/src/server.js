'use strict';

const express = require('express');
const pino = require('pino');
const pinoHttp = require('pino-http');
const client = require('prom-client');

const log = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();

// Version banner is the single most important env var for the A/B testing lab.
// Module 04 deploys v1 and v2 of this same image with different VERSION values.
const VERSION = process.env.APP_VERSION || 'v1';
const REGION  = process.env.REGION || 'unknown';
const FAIL_RATE = parseFloat(process.env.FAIL_RATE || '0');     // 0..1 chaos hook
const LATENCY_MS = parseInt(process.env.LATENCY_MS || '0', 10); // injected latency

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP requests',
  labelNames: ['method', 'route', 'status', 'version', 'region'],
  registers: [register],
});
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status', 'version'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

app.use(pinoHttp({ logger: log }));
app.use(express.json());

app.use((req, res, next) => {
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const labels = { method: req.method, route: req.route?.path || req.path, status: res.statusCode, version: VERSION };
    end(labels);
    httpRequests.inc({ ...labels, region: REGION });
  });
  next();
});

// Liveness: process is up. Readiness: app can serve traffic (could check deps).
app.get('/healthz', (_req, res) => res.json({ ok: true, version: VERSION, region: REGION }));
app.get('/readyz',  (_req, res) => res.json({ ready: true, version: VERSION }));

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Demo product catalog. Tiny on purpose.
const PRODUCTS = [
  { id: 1, name: 'Widget',  price: 9.99,  inStock: true },
  { id: 2, name: 'Gadget',  price: 19.99, inStock: true },
  { id: 3, name: 'Gizmo',   price: 29.99, inStock: false },
];

app.get('/api/products', async (req, res) => {
  if (LATENCY_MS > 0) await new Promise(r => setTimeout(r, LATENCY_MS));
  if (FAIL_RATE > 0 && Math.random() < FAIL_RATE) {
    return res.status(503).json({ error: 'injected failure', version: VERSION });
  }
  // v2 adds a "rating" field — used in the A/B lab to show observable diff
  const payload = VERSION.startsWith('v2')
    ? PRODUCTS.map(p => ({ ...p, rating: 4.2 }))
    : PRODUCTS;
  res.json({ items: payload, version: VERSION, region: REGION });
});

app.get('/', (_req, res) => res.json({ service: 'api-node', version: VERSION, region: REGION }));

const port = process.env.PORT || 8080;
app.listen(port, () => log.info({ port, version: VERSION, region: REGION }, 'api-node listening'));
