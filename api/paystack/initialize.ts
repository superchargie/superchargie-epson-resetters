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

interface VercelReq {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: {
    email?: string;
    customerName?: string;
    phone?: string;
    anydeskId?: string;
    items?: IncomingOrderItem[];
  };
}

interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    res.status(503).json({
      error:
        'Paystack secret key is not configured. Add PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY in Vercel Environment Variables, or order via WhatsApp.',
    });
    return;
  }

  const { email, customerName, phone, anydeskId, items } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'A valid email address is required for Paystack checkout.' });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'At least one order item is required.' });
    return;
  }

  let totalKsh = 0;
  for (const item of items) {
    const qty = Math.max(1, Math.min(20, Math.floor(Number(item.quantity) || 1)));
    const unitPrice = item.type === 'remote' ? ANYDESK_RESET_PRICE_KSH : RESETTER_PRICE_KSH;
    totalKsh += unitPrice * qty;
  }

  const reference = `EPS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const hostHeader = req.headers?.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  const baseUrl = process.env.APP_URL || (host ? `https://${host}` : '');

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        amount: totalKsh * 100,
        currency: 'KES',
        reference,
        channels: ['mobile_money', 'card', 'bank', 'apple_pay'],
        ...(baseUrl ? { callback_url: `${baseUrl.replace(/\/$/, '')}/?paystack_ref=${reference}` } : {}),
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

    res.status(200).json({
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
}
