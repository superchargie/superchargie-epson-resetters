import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESETTER_PRICE_KSH = 300;
const ANYDESK_RESET_PRICE_KSH = 500;

interface IncomingOrderItem {
  title: string;
  model: string;
  type: 'download' | 'remote';
  quantity: number;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    channel?: string;
    paid_at?: string;
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Public Paystack config endpoint (never exposes secret key)
  app.get('/api/paystack/config', (_req, res) => {
    const publicKey = process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || '';
    const hasSecretKey = Boolean(process.env.PAYSTACK_SECRET_KEY);
    res.json({
      configured: Boolean(publicKey && hasSecretKey),
      publicKey,
    });
  });

  // Initialize a real Paystack KES transaction server-side
  app.post('/api/paystack/initialize', async (req, res) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      res.status(503).json({
        error:
          'Paystack secret key is not configured on the server yet. Add PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY in Secrets, or order via WhatsApp.',
      });
      return;
    }

    const { email, customerName, phone, anydeskId, items } = req.body as {
      email?: string;
      customerName?: string;
      phone?: string;
      anydeskId?: string;
      items?: IncomingOrderItem[];
    };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'A valid email address is required for Paystack checkout.' });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'At least one order item is required.' });
      return;
    }

    // Recompute authoritative total on the server (KSh 300 resetter / KSh 500 AnyDesk)
    let totalKsh = 0;
    for (const item of items) {
      const qty = Math.max(1, Math.min(20, Math.floor(Number(item.quantity) || 1)));
      const unitPrice = item.type === 'remote' ? ANYDESK_RESET_PRICE_KSH : RESETTER_PRICE_KSH;
      totalKsh += unitPrice * qty;
    }

    const reference = `EPS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const appUrl = process.env.APP_URL || '';

    try {
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          amount: totalKsh * 100, // Paystack KES amount in cents
          currency: 'KES',
          reference,
          channels: ['mobile_money', 'card', 'bank', 'apple_pay'],
          ...(appUrl ? { callback_url: `${appUrl.replace(/\/$/, '')}/?paystack_ref=${reference}` } : {}),
          metadata: {
            customer_name: customerName || '',
            phone: phone || '',
            anydesk_id: anydeskId || '',
            items: items.map((i) => ({
              model: i.model,
              type: i.type,
              qty: i.quantity,
            })),
          },
        }),
      });

      const payload = (await response.json()) as PaystackInitializeResponse;
      if (!response.ok || !payload.status || !payload.data) {
        res.status(400).json({
          error: payload.message || 'Paystack could not initialize the transaction.',
        });
        return;
      }

      res.json({
        reference: payload.data.reference,
        authorizationUrl: payload.data.authorization_url,
        accessCode: payload.data.access_code,
        amountKsh: totalKsh,
      });
    } catch {
      res.status(502).json({
        error: 'Unable to reach Paystack right now. Please try again or order via WhatsApp.',
      });
    }
  });

  // Verify a Paystack transaction server-side
  app.get('/api/paystack/verify/:reference', async (req, res) => {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      res.status(503).json({ error: 'Paystack secret key is not configured on the server.' });
      return;
    }

    const { reference } = req.params;
    if (!reference || !/^[A-Za-z0-9_-]{6,80}$/.test(reference)) {
      res.status(400).json({ error: 'Invalid transaction reference.' });
      return;
    }

    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );

      const payload = (await response.json()) as PaystackVerifyResponse;
      if (!response.ok || !payload.status || !payload.data) {
        res.status(400).json({
          verified: false,
          error: payload.message || 'Transaction verification failed.',
        });
        return;
      }

      const verified = payload.data.status === 'success';
      res.json({
        verified,
        status: payload.data.status,
        reference: payload.data.reference,
        amountKsh: Math.round((payload.data.amount || 0) / 100),
        channel: payload.data.channel || 'paystack',
        paidAt: payload.data.paid_at || new Date().toISOString(),
      });
    } catch {
      res.status(502).json({
        verified: false,
        error: 'Could not verify payment with Paystack.',
      });
    }
  });

  // Mount Vite middleware in development or serve built dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
