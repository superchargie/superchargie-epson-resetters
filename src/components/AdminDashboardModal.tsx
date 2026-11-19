import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  Check,
  FileText,
  Link2,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
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
  RESETTER_CATALOG,
  RESETTER_PRICE_KSH,
  type ResetterPackage,
  type ResetterSeries,
} from '../data/epsonResetters';

interface AdminDashboardModalProps {
  isOpen: boolean;
  adminEmail: string;
  allResetters: ResetterPackage[];
  firestoreResetterIds: Set<string>;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const BUILT_IN_IDS = new Set(RESETTER_CATALOG.map((pkg) => pkg.id));

export function AdminDashboardModal({
  isOpen,
  adminEmail,
  allResetters,
  firestoreResetterIds,
  onClose,
}: AdminDashboardModalProps) {
  const [tab, setTab] = useState<'orders' | 'customers' | 'resetters'>('orders');
  const [orders, setOrders] = useState<FirestoreOrderRecord[]>([]);
  const [customers, setCustomers] = useState<FirestoreCustomerRecord[]>([]);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  // Add / Edit Resetter Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [title, setTitle] = useState('');
  const [series, setSeries] = useState<Exclude<ResetterSeries, 'all'>>('ecotank-l');
  const [seriesLabel, setSeriesLabel] = useState('EcoTank');
  const [modelsInput, setModelsInput] = useState('');
  const [priceKsh, setPriceKsh] = useState(String(RESETTER_PRICE_KSH));
  const [remoteResetKsh, setRemoteResetKsh] = useState(String(ANYDESK_RESET_PRICE_KSH));
  const [osSupport, setOsSupport] = useState('Windows 7 / 10 / 11');
  const [fileSize, setFileSize] = useState('3.8 MB (.zip)');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [instructionsPdfUrl, setInstructionsPdfUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [popular, setPopular] = useState(false);
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

  const filteredAdminCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return allResetters;
    return allResetters.filter(
      (pkg) =>
        pkg.title.toLowerCase().includes(q) ||
        pkg.seriesLabel.toLowerCase().includes(q) ||
        pkg.allSupportedModels.some((m) => m.toLowerCase().includes(q))
    );
  }, [allResetters, catalogSearch]);

  if (!isOpen) return null;

  const totalRevenueKsh = orders
    .filter((o) => o.status === 'paid' || o.status === 'completed' || o.status === 'in_progress')
    .reduce((sum, o) => sum + (o.totalKsh || 0), 0);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSeries('ecotank-l');
    setSeriesLabel('EcoTank');
    setModelsInput('');
    setPriceKsh(String(RESETTER_PRICE_KSH));
    setRemoteResetKsh(String(ANYDESK_RESET_PRICE_KSH));
    setOsSupport('Windows 7 / 10 / 11');
    setFileSize('3.8 MB (.zip)');
    setDownloadUrl('');
    setInstructionsPdfUrl('');
    setNotes('');
    setPopular(false);
    setFormError(null);
  };

  const handleStartEdit = (pkg: ResetterPackage) => {
    setEditingId(pkg.id);
    setTitle(pkg.title);
    setSeries(pkg.series);
    setSeriesLabel(pkg.seriesLabel);
    setModelsInput(pkg.allSupportedModels.join(', '));
    setPriceKsh(String(pkg.priceKsh));
    setRemoteResetKsh(String(pkg.remoteResetKsh));
    setOsSupport(pkg.osSupport);
    setFileSize(pkg.fileSize);
    setDownloadUrl(pkg.downloadUrl ?? '');
    setInstructionsPdfUrl(pkg.instructionsPdfUrl ?? '');
    setNotes(pkg.notes);
    setPopular(Boolean(pkg.popular));
    setFormError(null);
    setFormSuccess(null);
  };

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

  const handleSaveResetter = async (e: FormEvent) => {
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

    const existingPkg = editingId ? allResetters.find((p) => p.id === editingId) : undefined;
    const targetId = editingId ?? `${parsedModels[0].toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const isNewFirestoreDoc = !firestoreResetterIds.has(targetId);

    setSavingResetter(true);
    try {
      await adminSaveResetter(
        {
          id: targetId,
          title: title.trim(),
          series,
          seriesLabel: seriesLabel.trim() || 'EcoTank',
          primaryModels: parsedModels.slice(0, 4),
          allSupportedModels: parsedModels,
          priceKsh: Number(priceKsh) || RESETTER_PRICE_KSH,
          remoteResetKsh: Number(remoteResetKsh) || ANYDESK_RESET_PRICE_KSH,
          osSupport: osSupport.trim() || 'Windows 7 / 10 / 11',
          connection: existingPkg?.connection || 'Direct USB 2.0',
          fileSize: fileSize.trim() || '3.8 MB (.zip)',
          countersSupported: existingPkg?.countersSupported || [
            'Main pad counter',
            'Platen pad counter',
          ],
          notes: notes.trim(),
          downloadUrl: downloadUrl.trim(),
          instructionsPdfUrl: instructionsPdfUrl.trim(),
          popular,
        },
        isNewFirestoreDoc
      );

      setFormSuccess(
        editingId
          ? `Saved changes to "${title.trim()}". Live catalog & automated links updated.`
          : `Added "${title.trim()}" to the live storefront catalog.`
      );
      resetForm();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Admin dashboard"
      onClick={onClose}
    >
      <div
        className="flex h-[100dvh] sm:h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-none sm:rounded-xl border-0 sm:border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 truncate">Admin Console · {adminEmail}</p>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                Orders, Customers &amp; Catalog
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin dashboard"
              className="flex sm:hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 max-w-full">
            <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setTab('orders')}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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
                className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
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
                className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  tab === 'resetters'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Edit Catalog &amp; Links ({allResetters.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close admin dashboard"
              className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-3 text-xs">
          <div>
            <span className="text-[11px] sm:text-xs text-slate-500">Orders</span>
            <p className="font-mono text-sm sm:text-base font-bold text-slate-900 tabular-nums">
              {orders.length}
            </p>
          </div>
          <div>
            <span className="text-[11px] sm:text-xs text-slate-500">Paid Revenue</span>
            <p className="font-mono text-sm sm:text-base font-bold text-[#003399] tabular-nums">
              KSh {totalRevenueKsh.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-[11px] sm:text-xs text-slate-500">Catalog Linked</span>
            <p className="font-mono text-sm sm:text-base font-bold text-slate-900 tabular-nums">
              {allResetters.filter((r) => Boolean(r.downloadUrl)).length}/{allResetters.length}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
              {/* Left Form: Add or Edit Any Catalog Package */}
              <form
                onSubmit={handleSaveResetter}
                className="lg:col-span-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5 h-fit"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingId ? 'Edit Catalog Package & Automation Links' : 'Add New Epson Resetter'}
                  </h3>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Package Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Epson L3210 / L3250 / L1210 Series AdjProg"
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
                    Supported Models (comma-separated, up to 30)
                  </label>
                  <input
                    type="text"
                    value={modelsInput}
                    onChange={(e) => setModelsInput(e.target.value)}
                    placeholder="e.g. L3210, L3250, L3251, L3260, L5290"
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

                {/* Automation Delivery Links */}
                <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-3">
                  <p className="text-xs font-bold text-slate-900">
                    Automated Post-Payment Delivery Links
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Resetter Download URL (.zip / Google Drive / MediaFire)
                    </label>
                    <input
                      type="url"
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      PDF Instructions URL (optional custom PDF guide)
                    </label>
                    <input
                      type="url"
                      value={instructionsPdfUrl}
                      onChange={(e) => setInstructionsPdfUrl(e.target.value)}
                      placeholder="https://.../epson-reset-guide.pdf (blank = auto-generated PDF)"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Unlocked automatically in &ldquo;My Downloads&rdquo; right after Paystack
                      verifies payment. If PDF URL is blank, customers get an auto-generated PDF
                      guide.
                    </p>
                  </div>
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

                <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={popular}
                    onChange={(e) => setPopular(e.target.checked)}
                    className="rounded border-slate-300 text-[#003399] focus:ring-[#003399]"
                  />
                  Mark as &ldquo;Most Requested&rdquo; in public catalog
                </label>

                {formError && <p className="text-xs font-medium text-rose-700">{formError}</p>}
                {formSuccess && (
                  <p className="text-xs font-medium text-emerald-700">{formSuccess}</p>
                )}

                <button
                  type="submit"
                  disabled={savingResetter}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#003399] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#00287A] transition-colors disabled:opacity-60"
                >
                  {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {savingResetter
                    ? 'Saving...'
                    : editingId
                    ? 'Save Package Changes'
                    : 'Publish Resetter to Catalog'}
                </button>
              </form>

              {/* Right Column: Full Existing + Custom Catalog with Edit & Automation Indicators */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">
                    All Catalog Packages ({filteredAdminCatalog.length})
                  </h3>
                  <div className="relative w-full sm:w-56">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Filter catalog to edit..."
                      className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                  {filteredAdminCatalog.map((pkg) => {
                    const isBuiltIn = BUILT_IN_IDS.has(pkg.id);
                    const isSavedInDb = firestoreResetterIds.has(pkg.id);
                    const isEditingThis = editingId === pkg.id;

                    return (
                      <div
                        key={pkg.id}
                        className={`flex items-start justify-between gap-3 rounded-lg border p-3.5 transition-colors ${
                          isEditingThis
                            ? 'border-[#003399] bg-[#003399]/5'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {pkg.title}
                            </p>
                            <span className="text-[11px] font-mono text-slate-500">
                              {isBuiltIn ? (isSavedInDb ? 'Edited' : 'Built-in') : 'Custom'}
                            </span>
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-600 line-clamp-1">
                            {pkg.allSupportedModels.join(' · ')}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                            <span className="font-mono font-medium text-slate-700">
                              KSh {pkg.priceKsh} / AnyDesk KSh {pkg.remoteResetKsh}
                            </span>
                            {pkg.downloadUrl ? (
                              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                                <Link2 className="h-3 w-3" />
                                Download linked
                              </span>
                            ) : (
                              <span className="text-amber-700">No download URL</span>
                            )}
                            {pkg.instructionsPdfUrl && (
                              <span className="inline-flex items-center gap-1 font-medium text-[#003399]">
                                <FileText className="h-3 w-3" />
                                Custom PDF
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(pkg)}
                            aria-label={`Edit ${pkg.title}`}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:border-[#003399] hover:text-[#003399]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          {isSavedInDb && (
                            <button
                              type="button"
                              onClick={() => {
                                if (editingId === pkg.id) resetForm();
                                void adminDeleteResetter(pkg.id);
                              }}
                              title={
                                isBuiltIn
                                  ? 'Revert to built-in default'
                                  : 'Delete custom resetter'
                              }
                              aria-label={
                                isBuiltIn ? `Revert ${pkg.title}` : `Delete ${pkg.title}`
                              }
                              className="rounded-md border border-slate-200 p-1.5 text-slate-400 hover:text-rose-700 hover:border-rose-200"
                            >
                              {isBuiltIn ? (
                                <RotateCcw className="h-3.5 w-3.5" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
