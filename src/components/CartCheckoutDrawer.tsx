import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  generateOrderId,
  triggerResetterPackageDownload,
  type CartItem,
  type CompletedOrder,
} from '../types/orders';
import { type User } from 'firebase/auth';
import {
  buildWhatsAppChatUrl,
  buildWhatsAppOrderMessage,
  fetchPaystackConfig,
  initializePaystackPayment,
  SUPPORT_WHATSAPP_LOCAL,
  verifyPaystackPayment,
  type PaystackInitResult,
} from '../lib/paystack';
import { markOrderForwardedToWhatsApp } from '../lib/firestoreStore';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  initialTab: 'cart' | 'orders';
  onClose: () => void;
  cart: CartItem[];
  orders: CompletedOrder[];
  currentUser: User | null;
  isAdmin: boolean;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onOpenAdmin: () => void;
  onUpdateQuantity: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onCompleteOrder: (order: CompletedOrder) => void;
}

export function CartCheckoutDrawer({
  isOpen,
  initialTab,
  onClose,
  cart,
  orders,
  currentUser,
  isAdmin,
  onSignIn,
  onSignOut,
  onOpenAdmin,
  onUpdateQuantity,
  onRemoveItem,
  onCompleteOrder,
}: CartCheckoutDrawerProps) {
  const [activeTab, setActiveTab] = useState<'cart' | 'orders'>(initialTab);
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'whatsapp'>('paystack');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [anydeskId, setAnydeskId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingPaystack, setPendingPaystack] = useState<PaystackInitResult | null>(null);
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setError(null);
      if (currentUser?.email && !email) setEmail(currentUser.email);
      if (currentUser?.displayName && !customerName) setCustomerName(currentUser.displayName);
      fetchPaystackConfig().then((cfg) => {
        setPaystackPublicKey(cfg.publicKey);
      });
    }
  }, [isOpen, initialTab, currentUser]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotalKsh = cart.reduce((sum, item) => sum + item.unitPriceKsh * item.quantity, 0);
  const hasRemoteItem = cart.some((item) => item.type === 'remote');

  const whatsappMessage = buildWhatsAppOrderMessage({
    customerName: customerName.trim() || undefined,
    phone: phone.trim() || undefined,
    anydeskId: hasRemoteItem ? anydeskId.trim() || undefined : undefined,
    items: cart,
    totalKsh: subtotalKsh,
  });
  const whatsappUrl = buildWhatsAppChatUrl(whatsappMessage);

  const finalizeVerifiedOrder = (reference: string) => {
    const newOrder: CompletedOrder = {
      orderId: generateOrderId(),
      createdAt: new Date().toISOString(),
      customerName: customerName.trim() || 'Online Customer',
      phone: phone.trim() || 'N/A',
      email: email.trim(),
      mpesaRef: reference,
      anydeskId: hasRemoteItem ? anydeskId.trim() : undefined,
      items: cart.map((item) => ({ ...item })),
      totalKsh: subtotalKsh,
    };

    onCompleteOrder(newOrder);
    setPendingPaystack(null);
    setJustCompletedId(newOrder.orderId);
    setActiveTab('orders');
    setAnydeskId('');
  };

  const handleVerifyReference = async (reference: string) => {
    setIsVerifying(true);
    setError(null);
    try {
      const result = await verifyPaystackPayment(reference);
      if (result.verified) {
        finalizeVerifiedOrder(result.reference || reference);
      } else {
        setError(
          result.error ||
            'Payment has not been completed yet. Complete payment in Paystack and click Verify Payment.'
        );
      }
    } catch {
      setError('Could not verify payment right now. Please retry.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePaystackSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cart.length === 0) {
      setError('Your cart is empty. Add a resetter or remote session first.');
      return;
    }

    if (customerName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    const cleanedPhone = phone.replace(/[\s-]/g, '');
    if (cleanedPhone.length < 9) {
      setError('Please enter a valid phone number (e.g. 0712 345 678).');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address for your Paystack receipt.');
      return;
    }

    if (hasRemoteItem && anydeskId.trim().length < 6) {
      setError('Please enter your 9-digit AnyDesk address for the remote reset session.');
      return;
    }

    setIsProcessing(true);
    try {
      const init = await initializePaystackPayment({
        email: email.trim(),
        customerName: customerName.trim(),
        phone: phone.trim(),
        anydeskId: hasRemoteItem ? anydeskId.trim() : undefined,
        items: cart,
      });

      setPendingPaystack(init);

      if (window.PaystackPop && paystackPublicKey) {
        const handler = window.PaystackPop.setup({
          key: paystackPublicKey,
          email: email.trim(),
          amount: init.amountKsh * 100,
          currency: 'KES',
          ref: init.reference,
          callback: (response) => {
            void handleVerifyReference(response.reference);
          },
          onClose: () => {
            setIsProcessing(false);
          },
        });
        handler.openIframe();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to start Paystack checkout. You can order via WhatsApp instead.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedWhatsApp(true);
      window.setTimeout(() => setCopiedWhatsApp(false), 2200);
    } catch {
      setCopiedWhatsApp(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Cart and orders drawer"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('cart')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'cart'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cart ({cart.reduce((s, i) => s + i.quantity, 0)})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Downloads ({orders.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Account Bar inside Drawer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-6 py-2.5 text-xs">
          {currentUser ? (
            <>
              <span className="text-slate-600 truncate max-w-[230px]">
                Signed in as <strong className="text-slate-900">{currentUser.email}</strong>
              </span>
              <div className="flex items-center gap-2.5 shrink-0">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdmin();
                    }}
                    className="font-semibold text-[#003399] hover:underline"
                  >
                    Admin Dashboard
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onSignOut()}
                  className="text-slate-500 hover:text-slate-900"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-slate-600">Sign in to sync orders &amp; admin access</span>
              <button
                type="button"
                onClick={() => void onSignIn()}
                className="font-semibold text-[#003399] hover:underline whitespace-nowrap"
              >
                Sign in with Google
              </button>
            </>
          )}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === 'cart' ? (
            cart.length === 0 ? (
              <div className="py-16 text-center">
                <ShoppingBag className="mx-auto h-9 w-9 text-slate-300" />
                <h3 className="mt-4 text-base font-semibold text-slate-900">Your cart is empty</h3>
                <p className="mt-1.5 text-sm text-slate-600 max-w-xs mx-auto">
                  Select any Epson Adjustment Program (KSh 300) or AnyDesk Remote Reset (KSh 500)
                  from the catalog to pay online or order via WhatsApp.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 rounded-lg bg-[#003399] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#00287A] transition-colors"
                >
                  Browse Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cart Line Items */}
                <ul className="divide-y divide-slate-200 border-b border-slate-200">
                  {cart.map((item) => (
                    <li
                      key={item.key}
                      className="py-4 first:pt-0 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          Epson {item.model} ·{' '}
                          {item.type === 'download'
                            ? 'Self-Download AdjProg'
                            : 'AnyDesk Remote Reset'}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
                          {item.title}
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.key, -1)}
                            aria-label="Decrease quantity"
                            className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-mono text-xs font-semibold text-slate-900 w-5 text-center tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.key, 1)}
                            aria-label="Increase quantity"
                            className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.key)}
                            aria-label={`Remove ${item.title}`}
                            className="ml-2 text-slate-400 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <p className="font-mono text-sm font-bold text-slate-900 tabular-nums shrink-0">
                        KSh {item.unitPriceKsh * item.quantity}
                      </p>
                    </li>
                  ))}
                </ul>

                {/* Order Total */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">Order Total</span>
                  <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                    KSh {subtotalKsh}
                  </span>
                </div>

                {/* Payment Method Switcher */}
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('paystack');
                      setError(null);
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      paymentMethod === 'paystack'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Pay Online (Paystack)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('whatsapp');
                      setError(null);
                    }}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      paymentMethod === 'whatsapp'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Order via WhatsApp
                  </button>
                </div>

                {paymentMethod === 'paystack' ? (
                  <form
                    onSubmit={handlePaystackSubmit}
                    noValidate
                    className="space-y-4 border-t border-slate-200 pt-5"
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Paystack Online Checkout (M-Pesa &amp; Card)
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        Secure KES payment via Paystack. Supports M-Pesa STK Push, Visa, and
                        Mastercard with instant download unlock.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="co-name"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Full Name
                      </label>
                      <input
                        id="co-name"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Grace Wanjiku"
                        className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="co-phone"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Phone Number
                        </label>
                        <input
                          id="co-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0712 345 678"
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900 placeholder:font-sans focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="co-email"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Email Address
                        </label>
                        <input
                          id="co-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
                        />
                      </div>
                    </div>

                    {hasRemoteItem && (
                      <div>
                        <label
                          htmlFor="co-anydesk"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          AnyDesk Address (Required for Remote Reset)
                        </label>
                        <input
                          id="co-anydesk"
                          type="text"
                          value={anydeskId}
                          onChange={(e) => setAnydeskId(e.target.value)}
                          placeholder="e.g. 482 910 331"
                          className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono text-slate-900 placeholder:font-sans focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
                        />
                      </div>
                    )}

                    {pendingPaystack && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <p className="text-xs font-medium text-slate-800">
                          Paystack session initialized (Ref:{' '}
                          <span className="font-mono">{pendingPaystack.reference}</span>). If the
                          payment window did not open automatically, use the hosted checkout link
                          below and then verify.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={pendingPaystack.authorizationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                          >
                            Open Paystack Checkout
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            disabled={isVerifying}
                            onClick={() => handleVerifyReference(pendingPaystack.reference)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#003399] bg-white px-3.5 py-2 text-xs font-medium text-[#003399] hover:bg-[#003399]/5 transition-colors disabled:opacity-60"
                          >
                            {isVerifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Verify Payment
                          </button>
                        </div>
                      </div>
                    )}

                    {error && (
                      <p role="alert" className="text-xs font-medium text-rose-700">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#003399] px-5 py-3 text-sm font-semibold text-white hover:bg-[#00287A] transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399]"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Connecting to Paystack...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          Pay KSh {subtotalKsh} with Paystack
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4 border-t border-slate-200 pt-5">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Order via WhatsApp</h3>
                      <p className="mt-1 text-xs text-slate-600">
                        Send your itemized cart directly to{' '}
                        <span className="font-mono font-medium text-slate-900">
                          {SUPPORT_WHATSAPP_LOCAL}
                        </span>{' '}
                        for fast manual M-Pesa confirmation and immediate file delivery or AnyDesk
                        support.
                      </p>
                    </div>

                    <pre className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                      {whatsappMessage}
                    </pre>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#15803D] px-5 py-3 text-sm font-semibold text-white hover:bg-[#166534] transition-colors whitespace-nowrap"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Send Order on WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyWhatsApp}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                      >
                        {copiedWhatsApp ? (
                          <Check className="h-4 w-4 text-emerald-700" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedWhatsApp ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          ) : orders.length === 0 ? (
            <div className="py-16 text-center">
              <Download className="mx-auto h-9 w-9 text-slate-300" />
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No completed orders yet
              </h3>
              <p className="mt-1.5 text-sm text-slate-600 max-w-xs mx-auto">
                Verified Paystack purchases and AnyDesk session tickets are stored right here for
                instant access.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {justCompletedId && (() => {
                const latestOrder = orders.find((o) => o.orderId === justCompletedId);
                const forwardText = latestOrder
                  ? [
                      `PAID ORDER — ${latestOrder.orderId}`,
                      `Paystack Ref: ${latestOrder.mpesaRef}`,
                      `Customer: ${latestOrder.customerName} (${latestOrder.phone})`,
                      ...latestOrder.items.map(
                        (i) =>
                          `- Epson ${i.model} (${
                            i.type === 'remote' ? 'AnyDesk Remote Reset' : 'AdjProg Resetter'
                          }) x${i.quantity} — KSh ${i.unitPriceKsh * i.quantity}`
                      ),
                      `Total Paid: KSh ${latestOrder.totalKsh}`,
                      latestOrder.anydeskId ? `AnyDesk ID: ${latestOrder.anydeskId}` : null,
                      `Please confirm and send my file / connect on AnyDesk.`,
                    ]
                      .filter(Boolean)
                      .join('\n')
                  : '';

                return (
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
                      <div className="text-xs text-emerald-950">
                        <p className="font-bold">Payment verified · Order {justCompletedId}</p>
                        <p className="mt-1 text-emerald-900/90 leading-relaxed">
                          Final step: forward your paid order receipt to our WhatsApp so we receive
                          it immediately and deliver your resetter or start your AnyDesk session.
                        </p>
                      </div>
                    </div>

                    {latestOrder && (
                      <a
                        href={buildWhatsAppChatUrl(forwardText)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => void markOrderForwardedToWhatsApp(latestOrder.orderId)}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#15803D] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#166534] transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Forward Paid Order via WhatsApp
                      </a>
                    )}
                  </div>
                );
              })()}

              {orders.map((order) => {
                const orderForwardMsg = [
                  `PAID ORDER — ${order.orderId}`,
                  `Paystack Ref: ${order.mpesaRef}`,
                  `Customer: ${order.customerName} (${order.phone})`,
                  ...order.items.map(
                    (i) =>
                      `- Epson ${i.model} (${
                        i.type === 'remote' ? 'AnyDesk Remote Reset' : 'AdjProg Resetter'
                      }) x${i.quantity}`
                  ),
                  `Total: KSh ${order.totalKsh}`,
                  order.anydeskId ? `AnyDesk ID: ${order.anydeskId}` : null,
                ]
                  .filter(Boolean)
                  .join('\n');

                return (
                  <div
                    key={order.orderId}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-900">{order.orderId}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()} · Ref {order.mpesaRef}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                        KSh {order.totalKsh}
                      </span>
                    </div>

                    {order.anydeskId && (
                      <p className="text-xs text-slate-700">
                        AnyDesk ID:{' '}
                        <span className="font-mono font-semibold">{order.anydeskId}</span>
                      </p>
                    )}

                    <ul className="space-y-2">
                      {order.items.map((item) => (
                        <li
                          key={`${order.orderId}-${item.key}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              Epson {item.model}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {item.type === 'download'
                                ? 'Self-Download AdjProg'
                                : 'AnyDesk Remote Ticket'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => triggerResetterPackageDownload(order, item)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#003399] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#00287A] transition-colors whitespace-nowrap shrink-0"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {item.type === 'download' ? 'Download' : 'Ticket'}
                          </button>
                        </li>
                      ))}
                    </ul>

                    <a
                      href={buildWhatsAppChatUrl(orderForwardMsg)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => void markOrderForwardedToWhatsApp(order.orderId)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-700 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Forward Order via WhatsApp
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
