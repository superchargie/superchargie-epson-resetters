export type OrderItemType = 'download' | 'remote';

export interface CartItem {
  key: string;
  packageId: string;
  title: string;
  model: string;
  type: OrderItemType;
  unitPriceKsh: number;
  quantity: number;
  downloadUrl?: string;
  instructionsPdfUrl?: string;
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

function escapePdfText(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapLine(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current ? current.length + 1 : 0) + word.length <= maxChars) {
      current = current ? `${current} ${word}` : word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Generates a valid single-page PDF 1.4 document with Helvetica typography
 * for automated offline Epson AdjProg / AnyDesk setup instructions.
 */
function buildInstructionPdfBlob(title: string, lines: string[]): Blob {
  const wrapped: string[] = [];
  for (const line of lines) {
    if (!line) {
      wrapped.push('');
    } else {
      wrapped.push(...wrapLine(line, 86));
    }
  }

  const streamOps: string[] = [
    'BT',
    '/F2 15 Tf',
    '50 780 Td',
    `(${escapePdfText(title)}) Tj`,
    '/F1 10 Tf',
    '0 -22 Td',
    '14 TL',
  ];

  for (const line of wrapped.slice(0, 48)) {
    streamOps.push(`(${escapePdfText(line)}) Tj T*`);
  }
  streamOps.push('ET');

  const contentStream = streamOps.join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}

export function triggerResetterPackageDownload(
  order: CompletedOrder,
  item: CartItem,
  directDownloadUrl?: string
): void {
  const safeModel = item.model.replace(/[^a-zA-Z0-9_-]/g, '');
  const resolvedDownload = directDownloadUrl?.trim() || item.downloadUrl?.trim();

  const lines = [
    `Order Reference: ${order.orderId}   |   Paystack / Ref: ${order.mpesaRef}`,
    `Date Issued: ${new Date(order.createdAt).toLocaleString()}`,
    `Customer: ${order.customerName} (${order.phone})`,
    `Target Printer: Epson ${item.model}   |   Package: ${item.title}`,
    `Service: ${
      item.type === 'download'
        ? 'Self-Download AdjProg Utility (KSh 300)'
        : 'AnyDesk Remote Reset Session (KSh 500)'
    }`,
    ...(order.anydeskId ? [`AnyDesk Address: ${order.anydeskId}`] : []),
    ...(resolvedDownload ? [`Direct Download Link: ${resolvedDownload}`] : []),
    '',
    item.type === 'download'
      ? 'STEP-BY-STEP WINDOWS USB RESET INSTRUCTIONS'
      : 'ANYDESK REMOTE RESET PREPARATION CHECKLIST',
    '------------------------------------------------------------------------',
    ...(item.type === 'download'
      ? [
          `1. Connect your Epson ${item.model} directly to a Windows 7/10/11 PC using a USB cable (do not use Wi-Fi).`,
          '2. Open Devices and Printers -> right-click your Epson printer -> See what is printing -> Cancel all stuck jobs.',
          '3. Temporarily pause Windows Defender Real-time protection (or add a folder exclusion) so AdjProg.exe is not blocked.',
          '4. Extract the AdjProg ZIP/RAR archive into a normal folder (do not run directly inside WinRAR).',
          '5. Right-click AdjProg.exe and select Run as Administrator.',
          `6. Click Select -> choose Epson ${item.model} and pick the active USB port (e.g. USB001).`,
          '7. Click Particular Adjustment Mode -> Waste Ink Pad Counter -> tick Main pad counter -> click Check -> click Initialize.',
          '8. Turn the printer completely OFF for 10 seconds when prompted, then power ON. Red lights will clear.',
        ]
      : [
          `1. Power ON your Epson ${item.model} and connect it directly to your Windows PC via USB cable.`,
          '2. Open AnyDesk on your Windows PC and keep it running on screen.',
          `3. Keep your Order Reference (${order.orderId}) ready and forward this receipt on WhatsApp (+254 707 637 143).`,
          '4. Accept the incoming technician request on AnyDesk; the reset takes under 5 minutes.',
        ]),
    '',
    'HARDWARE MAINTENANCE ADVISORY:',
    'AdjProg resets the internal software counter back to 0% so you can print immediately.',
    'After 1-2 software resets, clean or replace the physical waste ink sponge pads or install',
    'an external waste ink bottle to prevent ink overflow.',
    '',
    'Need help? WhatsApp Support: 0707 637 143 | https://resetepson.mwashcyber.co.ke/',
  ];

  const pdfBlob = buildInstructionPdfBlob(
    `Epson ${item.model} AdjProg Setup & Instructions`,
    lines
  );
  const url = URL.createObjectURL(pdfBlob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download =
    item.type === 'download'
      ? `Epson_${safeModel}_Instructions_${order.orderId}.pdf`
      : `Epson_${safeModel}_AnyDesk_Ticket_${order.orderId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
