import { useEffect, useState, type FormEvent } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  MessageCircle,
  Plus,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  adminDeleteOrder,
  adminDeleteResetter,
  adminSaveResetter,
  adminUpdateOrder,
  type FirestoreCustomerRecord,
  type FirestoreOrderRecord,
  type OrderStatus,
} from '../lib/firestoreStore';
import {
  ANYDESK_RESET_PRICE_KSH,
  RESETTER_PRICE_KSH,
  type ResetterPackage,
  type ResetterSeries,
} from '../data/epsonResetters';

interface AdminDashboardModalProps {
  isOpen: boolean;
  adminEmail: string;
  customResetters: ResetterPackage[];
  onClose: () => void;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function AdminDashboardModal({
  isOpen,
  adminEmail,
  customResetters,
  onClose,
}: AdminDashboardModalProps) {
  const [tab, setTab] = useState<'orders' | 'customers' | 'resetters'>('orders');
  const [orders, setOrders] = useState<FirestoreOrderRecord[]>([]);
  const [customers, setCustomers] = useState<FirestoreCustomerRecord[]>([]);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  // Add Resetter Form state
  const [title, setTitle] = useState('');
  const [series, setSeries] = useState<Exclude<ResetterSeries, 'all'>>('ecotank-l');
  const [seriesLabel, setSeriesLabel] = useState('EcoTank');
  const [modelsInput, setModelsInput] = useState('');
  const [priceKsh, setPriceKsh] = useState(String(RESETTER_PRICE_KSH));
  const [remoteResetKsh, setRemoteResetKsh] = useState(String(ANYDESK_RESET_PRICE_KSH));
  const [osSupport, setOsSupport] = useState('Windows 7 / 10 / 11');
  const [fileSize, setFileSize] = useState('3.8 MB (.zip)');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [savingResetter, setSavingResetter] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as FirestoreOrderRecord);
        setOrders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const customersQuery = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    const unsubCustomers = onSnapshot(
      customersQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as FirestoreCustomerRecord);
        setCustomers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'customers')
    );

    return () => {
      unsubOrders();
      unsubCustomers();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalRevenueKsh = orders
    .filter((o) => o.status === 'paid' || o.status === 'completed' || o.status === 'in_progress')
    .reduce((sum, o) => sum + (o.totalKsh || 0), 0);

  const handleStatusChange = async (order: FirestoreOrderRecord, newStatus: OrderStatus) => {
    setSavingOrderId(order.orderId);
    try {
      await adminUpdateOrder(order.orderId, {
        status: newStatus,
        adminNotes: noteDrafts[order.orderId] ?? order.adminNotes ?? '',
      });
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleSaveNote = async (order: FirestoreOrderRecord) => {
    setSavingOrderId(order.orderId);
    try {
      await adminUpdateOrder(order.orderId, {
        status: order.status,
        adminNotes: noteDrafts[order.orderId] ?? order.adminNotes ?? '',
      });
    } finally {
      setSavingOrderId(null);
    }
  };

  const handleAddResetter = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const parsedModels = modelsInput
      .split(/[,\s]+/)
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean);

    if (title.trim().length < 4) {
      setFormError('Enter a descriptive package title (e.g. Epson L3255 / L3260 AdjProg).');
      return;
    }

    if (parsedModels.length === 0) {
      setFormError('Enter at least one Epson model number separated by commas (e.g. L3255, L3260).');
      return;
    }

    if (notes.trim().length < 6) {
      setFormError('Add a short description of what this Adjustment Program supports.');
      return;
    }

    setSavingResetter(true);
    try {
      await adminSaveResetter(
        {
          id: `${parsedModels[0].toLowerCase()}-${Date.now().toString().slice(-4)}`,
          title: title.trim(),
          series,
          seriesLabel: seriesLabel.trim() || 'EcoTank',
          primaryModels: parsedModels.slice(0, 4),
          allSupportedModels: parsedModels,
          priceKsh: Number(priceKsh) || RESETTER_PRICE_KSH,
          remoteResetKsh: Number(remoteResetKsh) || ANYDESK_RESET_PRICE_KSH,
          osSupport: osSupport.trim() || 'Windows 7 / 10 / 11',
          connection: 'Direct USB 2.0',
          fileSize: fileSize.trim() || '3.8 MB (.zip)',
          countersSupported: ['Main pad counter', 'Platen pad counter'],
          notes: notes.trim(),
          downloadUrl: downloadUrl.trim() || undefined,
          popular: false,
        },
        true
      );
      setFormSuccess(`Added "${title.trim()}" to the live storefront catalog.`);
      setTitle('');
      setModelsInput('');
      setDownloadUrl('');
      setNotes('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save resetter.');
    } finally {
      setSavingResetter(false);
    }
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
    return digits;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Admin dashboard"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs text-slate-500">Admin Console · {adminEmail}</p>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Orders, Customers &amp; Resetter Catalog
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTab('orders')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tab === 'orders'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Orders ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('customers')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tab === 'customers'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customers ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('resetters')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tab === 'resetters'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Add / Manage Resetters ({customResetters.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3.5 text-xs">
          <div>
            <span className="text-slate-500">Total Orders</span>
            <p className="font-mono text-base font-bold text-slate-900 tabular-nums">
              {orders.length}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Paid / Completed Revenue</span>
            <p className="font-mono text-base font-bold text-[#003399] tabular-nums">
              KSh {totalRevenueKsh.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-slate-500">Registered Customers</span>
            <p className="font-mono text-base font-bold text-slate-900 tabular-nums">
              {customers.length}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-600">
                  No customer orders recorded in Firestore yet. New Paystack and signed-in orders
                  appear here in real time.
                </div>
              ) : (
                orders.map((order) => {
                  const customerWaPhone = formatPhoneForWhatsApp(order.phone);
                  const replyHref = `https://wa.me/${customerWaPhone}?text=${encodeURIComponent(
                    `Hello ${order.customerName}, regarding your Epson Resetter order ${order.orderId} (${order.itemsSummary}): `
                  )}`;

                  return (
                    <div
                      key={order.orderId}
                      className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-3">
                        <div>
                          <p className="font-mono text-xs font-bold text-slate-900">
                            {order.orderId} · Ref {order.paymentRef} ·{' '}
                            {order.paymentMethod.toUpperCase()}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {order.customerName}{' '}
                            <span className="font-normal text-slate-500">
                              ({order.phone} · {order.email})
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-slate-600">{order.itemsSummary}</p>
                          {order.anydeskId && (
                            <p className="mt-1 text-xs text-slate-700">
                              AnyDesk ID:{' '}
                              <span className="font-mono font-semibold">{order.anydeskId}</span>
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="font-mono text-base font-bold text-slate-900 tabular-nums">
                            KSh {order.totalKsh}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            WhatsApp: {order.whatsappForwarded ? 'Forwarded' : 'Not yet forwarded'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <label
                            htmlFor={`status-${order.orderId}`}
                            className="text-xs font-medium text-slate-600"
                          >
                            Status:
                          </label>
                          <select
                            id={`status-${order.orderId}`}
                            value={order.status}
                            disabled={savingOrderId === order.orderId}
                            onChange={(e) =>
                              handleStatusChange(order, e.target.value as OrderStatus)
                            }
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-[#003399] focus:outline-none"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={noteDrafts[order.orderId] ?? order.adminNotes ?? ''}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({
                                ...prev,
                                [order.orderId]: e.target.value,
                              }))
                            }
                            placeholder="Admin note (e.g. sent file link)"
                            className="w-56 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#003399] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveNote(order)}
                            disabled={savingOrderId === order.orderId}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Save
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {customerWaPhone.length >= 9 && (
                            <a
                              href={replyHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md bg-[#15803D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#166534]"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp Customer
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => adminDeleteOrder(order.orderId)}
                            aria-label={`Delete order ${order.orderId}`}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-400 hover:text-rose-700 hover:border-rose-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {tab === 'customers' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3 text-right">Orders</th>
                    <th className="px-4 py-3 text-right">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-xs">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                        No registered customers yet. Customers appear here once they sign in.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => {
                      const customerOrders = orders.filter((o) => o.ownerUid === c.uid);
                      const spent = customerOrders.reduce((s, o) => s + (o.totalKsh || 0), 0);
                      return (
                        <tr key={c.uid}>
                          <td className="px-4 py-3 font-medium text-slate-900">{c.displayName}</td>
                          <td className="px-4 py-3 text-slate-600">{c.email}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{c.phone || '—'}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            {customerOrders.length}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            KSh {spent.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'resetters' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <form
                onSubmit={handleAddResetter}
                className="lg:col-span-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5"
              >
                <h3 className="text-sm font-bold text-slate-900">Add New Epson Resetter</h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Package Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Epson L3255 / L3260 AdjProg"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category Series
                    </label>
                    <select
                      value={series}
                      onChange={(e) =>
                        setSeries(e.target.value as Exclude<ResetterSeries, 'all'>)
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    >
                      <option value="ecotank-l">EcoTank L-Series</option>
                      <option value="photo-wide">Photo &amp; A3 Wide</option>
                      <option value="monochrome-m">Monochrome M-Series</option>
                      <option value="et-wf-legacy">ET / WF / Legacy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Series Label
                    </label>
                    <input
                      type="text"
                      value={seriesLabel}
                      onChange={(e) => setSeriesLabel(e.target.value)}
                      placeholder="e.g. EcoTank Gen-4"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supported Models (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={modelsInput}
                    onChange={(e) => setModelsInput(e.target.value)}
                    placeholder="e.g. L3255, L3256, L3260"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900 placeholder:font-sans"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Resetter Price (KSh)
                    </label>
                    <input
                      type="number"
                      min={50}
                      value={priceKsh}
                      onChange={(e) => setPriceKsh(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      AnyDesk Remote (KSh)
                    </label>
                    <input
                      type="number"
                      min={50}
                      value={remoteResetKsh}
                      onChange={(e) => setRemoteResetKsh(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      OS Support
                    </label>
                    <input
                      type="text"
                      value={osSupport}
                      onChange={(e) => setOsSupport(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      File Size
                    </label>
                    <input
                      type="text"
                      value={fileSize}
                      onChange={(e) => setFileSize(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optional Direct Download URL
                  </label>
                  <input
                    type="url"
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Describe which models and counters this AdjProg clears..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                    required
                  />
                </div>

                {formError && <p className="text-xs font-medium text-rose-700">{formError}</p>}
                {formSuccess && (
                  <p className="text-xs font-medium text-emerald-700">{formSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={savingResetter}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#003399] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#00287A] transition-colors disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  {savingResetter ? 'Publishing...' : 'Publish Resetter to Catalog'}
                </button>
              </form>

              <div className="lg:col-span-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Admin-Added Resetters ({customResetters.length})
                </h3>
                {customResetters.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    All 12 built-in Epson packages are live in the catalog. Any new resetters you
                    publish on the left will appear here and immediately in the public catalog.
                  </p>
                ) : (
                  customResetters.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{pkg.title}</p>
                        <p className="mt-0.5 font-mono text-xs text-slate-600">
                          {pkg.allSupportedModels.join(' · ')}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Resetter KSh {pkg.priceKsh} · AnyDesk KSh {pkg.remoteResetKsh}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => adminDeleteResetter(pkg.id)}
                        aria-label={`Delete ${pkg.title}`}
                        className="rounded-md border border-slate-200 p-2 text-slate-400 hover:text-rose-700 hover:border-rose-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
