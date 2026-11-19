import { type CartItem } from '../types/orders';

export const SUPPORT_WHATSAPP_LOCAL = '0707 637 143';
export const SUPPORT_WHATSAPP_INTL = '254707637143';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        metadata?: Record<string, unknown>;
        callback: (response: { reference: string }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

export interface PaystackConfig {
  configured: boolean;
  publicKey: string;
}

export interface PaystackInitResult {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  amountKsh: number;
}

export interface PaystackVerifyResult {
  verified: boolean;
  status?: string;
  reference?: string;
  amountKsh?: number;
  channel?: string;
  paidAt?: string;
  error?: string;
}

export async function fetchPaystackConfig(): Promise<PaystackConfig> {
  try {
    const res = await fetch('/api/paystack/config');
    if (!res.ok) return { configured: false, publicKey: '' };
    return (await res.json()) as PaystackConfig;
  } catch {
    return { configured: false, publicKey: '' };
  }
}

export async function initializePaystackPayment(payload: {
  email: string;
  customerName: string;
  phone: string;
  anydeskId?: string;
  items: CartItem[];
}): Promise<PaystackInitResult> {
  const res = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      customerName: payload.customerName,
      phone: payload.phone,
      anydeskId: payload.anydeskId,
      items: payload.items.map((item) => ({
        title: item.title,
        model: item.model,
        type: item.type,
        quantity: item.quantity,
      })),
    }),
  });

  const data = (await res.json()) as PaystackInitResult & { error?: string };
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Could not start Paystack payment.');
  }
  return data;
}

export async function verifyPaystackPayment(reference: string): Promise<PaystackVerifyResult> {
  const res = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`);
  const data = (await res.json()) as PaystackVerifyResult;
  if (!res.ok) {
    return { verified: false, error: data.error || 'Payment verification failed.' };
  }
  return data;
}

export function buildWhatsAppChatUrl(message: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP_INTL}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppOrderMessage(params: {
  customerName?: string;
  phone?: string;
  anydeskId?: string;
  items: CartItem[];
  totalKsh: number;
}): string {
  const itemLines = params.items.map(
    (item) =>
      `- Epson ${item.model} (${
        item.type === 'remote' ? 'AnyDesk Remote Reset' : 'AdjProg Resetter'
      }) x${item.quantity} — KSh ${item.unitPriceKsh * item.quantity}`
  );

  return [
    'Hello, I would like to place an Epson Resetter order:',
    ...itemLines,
    `Total: KSh ${params.totalKsh}`,
    params.customerName ? `Name: ${params.customerName}` : null,
    params.phone ? `Phone: ${params.phone}` : null,
    params.anydeskId ? `AnyDesk ID: ${params.anydeskId}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
