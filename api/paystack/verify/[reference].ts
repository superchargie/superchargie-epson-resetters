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

interface VercelReq {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}

interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
}

export default async function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    res.status(503).json({ verified: false, error: 'Paystack secret key is not configured.' });
    return;
  }

  const rawRef = req.query?.reference;
  const reference = Array.isArray(rawRef) ? rawRef[0] : rawRef;

  if (!reference || !/^[A-Za-z0-9_-]{6,80}$/.test(reference)) {
    res.status(400).json({ verified: false, error: 'Invalid transaction reference.' });
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
    res.status(200).json({
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
}
