interface VercelReq {
  method?: string;
}

interface VercelRes {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
}

export default function handler(req: VercelReq, res: VercelRes) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const publicKey = (
    process.env.PAYSTACK_PUBLIC_KEY ||
    process.env.VITE_PAYSTACK_PUBLIC_KEY ||
    ''
  ).trim();
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();

  res.status(200).json({
    configured: Boolean(publicKey && secretKey),
    hasPublicKey: Boolean(publicKey),
    hasSecretKey: Boolean(secretKey),
    publicKey,
  });
}
