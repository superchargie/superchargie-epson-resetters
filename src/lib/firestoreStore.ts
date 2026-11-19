import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { type User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, syncCustomerProfile } from './firebase';
import { type ResetterPackage, type ResetterSeries } from '../data/epsonResetters';
import { type CompletedOrder } from '../types/orders';

export type OrderStatus = 'pending' | 'paid' | 'in_progress' | 'completed' | 'cancelled';

export interface FirestoreOrderRecord {
  orderId: string;
  ownerUid: string;
  customerName: string;
  phone: string;
  email: string;
  paymentMethod: 'paystack' | 'whatsapp';
  paymentRef: string;
  anydeskId?: string;
  itemsSummary: string;
  models: string[];
  totalKsh: number;
  status: OrderStatus;
  whatsappForwarded: boolean;
  adminNotes?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface FirestoreCustomerRecord {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  lastOrderAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface ResetterFormInput {
  id: string;
  title: string;
  series: Exclude<ResetterSeries, 'all'>;
  seriesLabel: string;
  primaryModels: string[];
  allSupportedModels: string[];
  priceKsh: number;
  remoteResetKsh: number;
  osSupport: string;
  connection: string;
  fileSize: string;
  countersSupported: string[];
  notes: string;
  downloadUrl?: string;
  popular?: boolean;
}

function sanitizeId(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned.length >= 2 ? cleaned : `resetter-${Date.now()}`;
}

export async function saveOrderToFirestore(
  user: User,
  order: CompletedOrder,
  paymentMethod: 'paystack' | 'whatsapp'
): Promise<void> {
  const safeOrderId = order.orderId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const path = `orders/${safeOrderId}`;

  const models = Array.from(
    new Set(order.items.map((i) => i.model.trim().slice(0, 30)).filter(Boolean))
  ).slice(0, 15);

  const itemsSummary = order.items
    .map(
      (i) =>
        `Epson ${i.model} (${i.type === 'remote' ? 'AnyDesk' : 'AdjProg'}) x${i.quantity}`
    )
    .join('; ')
    .slice(0, 500);

  const payload: Record<string, unknown> = {
    orderId: safeOrderId,
    ownerUid: user.uid,
    customerName: (order.customerName || user.displayName || 'Customer').trim().slice(0, 100),
    phone: (order.phone || '0700000000').trim().slice(0, 30),
    email: (order.email || user.email || 'customer@example.com').trim().slice(0, 120),
    paymentMethod,
    paymentRef: (order.mpesaRef || safeOrderId).trim().slice(0, 80),
    itemsSummary: itemsSummary.length >= 3 ? itemsSummary : 'Epson Resetter Order',
    models: models.length > 0 ? models : ['L3210'],
    totalKsh: Math.max(50, Math.min(500000, Number(order.totalKsh) || 300)),
    status: paymentMethod === 'paystack' ? 'paid' : 'pending',
    whatsappForwarded: paymentMethod === 'whatsapp',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (order.anydeskId && order.anydeskId.trim()) {
    payload.anydeskId = order.anydeskId.trim().slice(0, 40);
  }

  try {
    await setDoc(doc(db, 'orders', safeOrderId), payload);
    await syncCustomerProfile(user, order.phone);
    await updateDoc(doc(db, 'customers', user.uid), {
      lastOrderAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markOrderForwardedToWhatsApp(orderId: string): Promise<void> {
  const safeId = orderId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeId) return;
  const path = `orders/${safeId}`;
  try {
    await updateDoc(doc(db, 'orders', safeId), {
      whatsappForwarded: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Non-fatal if order was placed as guest (local-only)
    console.warn('Could not update whatsappForwarded in Firestore:', path, error);
  }
}

export async function adminUpdateOrder(
  orderId: string,
  updates: { status: OrderStatus; adminNotes?: string; whatsappForwarded?: boolean }
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    const payload: Record<string, unknown> = {
      status: updates.status,
      updatedAt: serverTimestamp(),
    };
    if (updates.adminNotes !== undefined) {
      payload.adminNotes = updates.adminNotes.trim().slice(0, 400);
    }
    if (updates.whatsappForwarded !== undefined) {
      payload.whatsappForwarded = updates.whatsappForwarded;
    }
    await updateDoc(doc(db, 'orders', orderId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminDeleteOrder(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminSaveResetter(
  input: ResetterFormInput,
  isNew: boolean
): Promise<ResetterPackage> {
  const id = sanitizeId(input.id || input.title);
  const path = `resetters/${id}`;

  const allModels = input.allSupportedModels
    .map((m) => m.trim().toUpperCase().slice(0, 30))
    .filter(Boolean)
    .slice(0, 25);

  const primaryModels = (input.primaryModels.length > 0 ? input.primaryModels : allModels.slice(0, 4))
    .map((m) => m.trim().toUpperCase().slice(0, 30))
    .filter(Boolean)
    .slice(0, 8);

  const counters = input.countersSupported
    .map((c) => c.trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 6);

  const docPayload: Record<string, unknown> = {
    title: input.title.trim().slice(0, 140),
    series: input.series,
    seriesLabel: input.seriesLabel.trim().slice(0, 40),
    primaryModels: primaryModels.length > 0 ? primaryModels : ['L3210'],
    allSupportedModels: allModels.length > 0 ? allModels : ['L3210'],
    priceKsh: Math.max(50, Math.min(50000, Number(input.priceKsh) || 300)),
    remoteResetKsh: Math.max(50, Math.min(50000, Number(input.remoteResetKsh) || 500)),
    osSupport: input.osSupport.trim().slice(0, 60) || 'Windows 7 / 10 / 11',
    connection: input.connection.trim().slice(0, 40) || 'Direct USB 2.0',
    fileSize: input.fileSize.trim().slice(0, 30) || '3.8 MB (.zip)',
    countersSupported: counters.length > 0 ? counters : ['Main pad counter'],
    notes: input.notes.trim().slice(0, 500),
    popular: Boolean(input.popular),
    updatedAt: serverTimestamp(),
  };

  if (input.downloadUrl && input.downloadUrl.trim()) {
    docPayload.downloadUrl = input.downloadUrl.trim().slice(0, 500);
  }

  try {
    if (isNew) {
      docPayload.createdAt = serverTimestamp();
      await setDoc(doc(db, 'resetters', id), docPayload);
    } else {
      await updateDoc(doc(db, 'resetters', id), docPayload);
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }

  return {
    id,
    title: docPayload.title as string,
    series: input.series,
    seriesLabel: docPayload.seriesLabel as string,
    primaryModels: docPayload.primaryModels as string[],
    allSupportedModels: docPayload.allSupportedModels as string[],
    priceKsh: docPayload.priceKsh as number,
    remoteResetKsh: docPayload.remoteResetKsh as number,
    osSupport: docPayload.osSupport as string,
    connection: docPayload.connection as string,
    fileSize: docPayload.fileSize as string,
    countersSupported: docPayload.countersSupported as string[],
    notes: docPayload.notes as string,
    popular: Boolean(input.popular),
  };
}

export async function adminDeleteResetter(resetterId: string): Promise<void> {
  const path = `resetters/${resetterId}`;
  try {
    await deleteDoc(doc(db, 'resetters', resetterId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
