export type OrderItemType = 'download' | 'remote';

export interface CartItem {
  key: string;
  packageId: string;
  title: string;
  model: string;
  type: OrderItemType;
  unitPriceKsh: number;
  quantity: number;
}

export interface CompletedOrder {
  orderId: string;
  createdAt: string;
  customerName: string;
  phone: string;
  email: string;
  mpesaRef: string;
  anydeskId?: string;
  items: CartItem[];
  totalKsh: number;
}

const ORDERS_STORAGE_KEY = 'epson_resetters_orders_v1';
const CART_STORAGE_KEY = 'epson_resetters_cart_v1';

export function loadOrders(): CompletedOrder[] {
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: CompletedOrder[]): void {
  try {
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Ignore storage quota issues
  }
}

export function loadCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota issues
  }
}

export function generateOrderId(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `ADJ-${num}`;
}

export function triggerResetterPackageDownload(order: CompletedOrder, item: CartItem): void {
  const safeModel = item.model.replace(/[^a-zA-Z0-9_-]/g, '');
  const lines = [
    '============================================================',
    'EPSON ADJUSTMENT PROGRAM (ADJPROG) — ORDER & SETUP PACKAGE',
    '============================================================',
    `Order Reference : ${order.orderId}`,
    `Date Issued     : ${new Date(order.createdAt).toLocaleString()}`,
    `Customer        : ${order.customerName} (${order.phone})`,
    `M-Pesa / Ref    : ${order.mpesaRef}`,
    `Service Type    : ${
      item.type === 'download'
        ? 'Self-Download AdjProg Utility (KSh 300)'
        : 'AnyDesk Remote Reset Session (KSh 500)'
    }`,
    `Target Model    : Epson ${item.model}`,
    `Package         : ${item.title}`,
    order.anydeskId ? `AnyDesk Address : ${order.anydeskId}` : '',
    '',
    '------------------------------------------------------------',
    item.type === 'download'
      ? 'QUICK WINDOWS USB RESET PROCEDURE'
      : 'ANYDESK REMOTE RESET PREPARATION',
    '------------------------------------------------------------',
    ...(item.type === 'download'
      ? [
          '1. Connect your Epson ' + item.model + ' directly to a Windows PC via USB cable.',
          '2. Cancel any stuck jobs in Devices and Printers -> Print Queue.',
          '3. Temporarily pause Windows Defender Real-time protection (or exclude the folder).',
          '4. Extract the AdjProg archive with WinRAR and right-click AdjProg.exe -> Run as Administrator.',
          '5. Click Select -> choose Epson ' + item.model + ' and active USB port (e.g. USB001).',
          '6. Open Particular Adjustment Mode -> Waste Ink Pad Counter -> tick Main pad counter.',
          '7. Click Check, then click Initialize. Power off the printer for 10s, then power on.',
        ]
      : [
          '1. Ensure your Epson ' + item.model + ' is powered ON and connected via direct USB cable.',
          '2. Open AnyDesk on your Windows PC and keep it running.',
          '3. Have your Order Reference (' + order.orderId + ') ready for technician verification.',
          '4. Accept the incoming technician prompt when ready; reset takes under 5 minutes.',
        ]),
    '',
    'HARDWARE ADVISORY:',
    'Resetting the software counter clears the 100% lockout. Inspect, clean, or replace',
    'saturated physical waste ink sponge pads after 1-2 resets to prevent ink leaks.',
    '============================================================',
  ].filter((line) => line !== '');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download =
    item.type === 'download'
      ? `Epson_${safeModel}_AdjProg_Setup_${order.orderId}.txt`
      : `Epson_${safeModel}_AnyDesk_Ticket_${order.orderId}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
