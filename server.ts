import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EncryptedSyncEnvelope {
  vaultId: string;
  ivBase64: string;
  saltBase64: string;
  ciphertextBase64: string;
  sha256Digest: string;
  byteLength: number;
  encryptedAt: string;
  updatedByDevice: string;
}

const syncVaultStore = new Map<string, EncryptedSyncEnvelope>();

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  if (/^10\./.test(lower) || /^192\.168\./.test(lower) || /^169\.254\./.test(lower)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) {
    return true;
  }
  return false;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  // Bind port 3000 immediately so Nginx and readiness probes never see ECONNREFUSED / 502 warmup.html
  await new Promise<void>((resolve) => {
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Local: http://localhost:${PORT}/`);
      console.log(`Network: http://0.0.0.0:${PORT}/`);
      resolve();
    });
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    console.error('Server listen error:', err.message);
  });

  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, status: 'ready', port: PORT });
  });

  app.get('/api/sync/:vaultId', (req: Request, res: Response) => {
    const vaultId = String(req.params.vaultId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!vaultId || vaultId.length < 8) {
      res.status(400).json({ ok: false, error: 'Identificador de cofre inválido.' });
      return;
    }
    const envelope = syncVaultStore.get(vaultId);
    if (!envelope) {
      res.status(404).json({ ok: false, error: 'Nenhum pacote cifrado encontrado para este cofre.' });
      return;
    }
    res.json({ ok: true, envelope });
  });

  app.post('/api/sync/:vaultId', (req: Request, res: Response) => {
    const vaultId = String(req.params.vaultId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const body = req.body as Partial<EncryptedSyncEnvelope> | undefined;
    if (
      !vaultId ||
      vaultId.length < 8 ||
      !body ||
      typeof body.ciphertextBase64 !== 'string' ||
      typeof body.ivBase64 !== 'string' ||
      typeof body.saltBase64 !== 'string' ||
      typeof body.sha256Digest !== 'string'
    ) {
      res.status(400).json({ ok: false, error: 'Envelope criptográfico incompleto.' });
      return;
    }

    const saved: EncryptedSyncEnvelope = {
      vaultId,
      ivBase64: body.ivBase64,
      saltBase64: body.saltBase64,
      ciphertextBase64: body.ciphertextBase64,
      sha256Digest: body.sha256Digest,
      byteLength: Number(body.byteLength) || body.ciphertextBase64.length,
      encryptedAt: typeof body.encryptedAt === 'string' ? body.encryptedAt : new Date().toISOString(),
      updatedByDevice: typeof body.updatedByDevice === 'string' ? body.updatedByDevice : 'Veloce Web · Linux',
    };

    syncVaultStore.set(vaultId, saved);
    res.json({ ok: true, envelope: saved });
  });

  app.get('/api/fetch-page', async (req: Request, res: Response) => {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl) {
      res.status(400).json({ ok: false, error: 'URL ausente.' });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ ok: false, error: 'Formato de URL inválido.' });
      return;
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      res.status(400).json({ ok: false, error: 'Apenas protocolos HTTP e HTTPS são permitidos.' });
      return;
    }

    if (isBlockedHost(parsed.hostname)) {
      res.status(200).json({ ok: false, error: 'Acesso a endereços de rede privada bloqueado por segurança.' });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    try {
      const upstream = await fetch(parsed.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'VeloceBrowser/2.4 (Android 15; KotlinEngine; PrivacyFirst)',
          Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          DNT: '1',
          'Sec-GPC': '1',
        },
        redirect: 'follow',
      });
      clearTimeout(timer);

      const contentType = upstream.headers.get('content-type') || 'text/html';
      if (!contentType.includes('html') && !contentType.includes('text') && !contentType.includes('xml')) {
        res.status(200).json({ ok: false, error: 'Tipo de conteúdo binário não renderizável como documento.' });
        return;
      }

      const text = await upstream.text();
      const capped = text.slice(0, 450_000);
      res.json({
        ok: true,
        finalUrl: upstream.url || parsed.toString(),
        statusCode: upstream.status,
        rawHtml: capped,
      });
    } catch {
      clearTimeout(timer);
      res.status(200).json({
        ok: false,
        error: 'Host externo indisponível neste ambiente de rede.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const viteReadyPromise = (async () => {
      const { createServer: createViteServer } = await import('vite');
      return createViteServer({
        plugins: [
          {
            name: 'veloce-attach-http-server',
            config() {
              return {
                server: {
                  allowedHosts: true as const,
                  hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
                },
              };
            },
          },
        ],
        server: {
          allowedHosts: true as const,
          middlewareMode: true,
        },
        appType: 'spa',
      });
    })();

    app.use(async (req: Request, res: Response, next: NextFunction) => {
      try {
        const vite = await viteReadyPromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
