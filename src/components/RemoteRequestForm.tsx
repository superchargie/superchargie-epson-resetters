import { useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import {
  ANYDESK_RESET_PRICE_KSH,
  RESETTER_PRICE_KSH,
} from '../data/epsonResetters';
import {
  generateOrderId,
  triggerResetterPackageDownload,
  type CartItem,
  type CompletedOrder,
  type OrderItemType,
} from '../types/orders';
import {
  buildWhatsAppChatUrl,
  buildWhatsAppOrderMessage,
  fetchPaystackConfig,
  initializePaystackPayment,
  verifyPaystackPayment,
  type PaystackInitResult,
} from '../lib/paystack';
import { markOrderForwardedToWhatsApp } from '../lib/firestoreStore';

interface RemoteRequestFormProps {
  prefillModel: string;
  prefillMode: OrderItemType;
  onOrderCreated: (order: CompletedOrder) => void;
  onOpenOrdersDrawer: () => void;
}

export function RemoteRequestForm({
  prefillModel,
  prefillMode,
  onOrderCreated,
  onOpenOrdersDrawer,
}: RemoteRequestFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [printerModel, setPrinterModel] = useState(prefillModel || '');
  const [serviceMode, setServiceMode] = useState<OrderItemType>(prefillMode);
  const [anydeskId, setAnydeskId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [pendingPaystack, setPendingPaystack] = useState<PaystackInitResult | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CompletedOrder | null>(null);

  useEffect(() => {
    fetchPaystackConfig().then((cfg) => setPaystackPublicKey(cfg.publicKey));
  }, []);

  useEffect(() => {
    if (prefillModel) setPrinterModel(prefillModel);
  }, [prefillModel]);

  useEffect(() => {
    setServiceMode(prefillMode);
  }, [prefillMode]);

  const activePrice =
    serviceMode === 'remote' ? ANYDESK_RESET_PRICE_KSH : RESETTER_PRICE_KSH;

  const cleanModel = printerModel.trim().replace(/^epson\s+/i, '') || 'L3210';

  const singleItem: CartItem = {
    key: `${cleanModel}-${serviceMode}`,
    packageId: 'direct-order',
    title:
      serviceMode === 'remote'
        ? `AnyDesk Remote Reset — Epson ${cleanModel}`
        : `Epson ${cleanModel} Adjustment Program (AdjProg)`,
    model: cleanModel,
    type: serviceMode,
    unitPriceKsh: activePrice,
    quantity: 1,
  };

  const whatsappUrl = buildWhatsAppChatUrl(
    buildWhatsAppOrderMessage({
      customerName: name.trim() || undefined,
      phone: phone.trim() || undefined,
      anydeskId: serviceMode === 'remote' ? anydeskId.trim() || undefined : undefined,
      items: [singleItem],
      totalKsh: activePrice,
    })
  );

  const finalizeOrder = (reference: string) => {
    const order: CompletedOrder = {
      orderId: generateOrderId(),
      createdAt: new Date().toISOString(),
      customerName: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      mpesaRef: reference,
      anydeskId: serviceMode === 'remote' ? anydeskId.trim() : undefined,
      totalKsh: activePrice,
      items: [singleItem],
    };

    onOrderCreated(order);
    setPendingPaystack(null);
    setCreatedOrder(order);
  };

  const handleVerify = async (reference: string) => {
    setIsVerifying(true);
    setError(null);
    try {
      const result = await verifyPaystackPayment(reference);
      if (result.verified) {
        finalizeOrder(result.reference || reference);
      } else {
        setError(
          result.error ||
            'Payment not yet confirmed. Complete payment in Paystack then click Verify Payment.'
        );
      }
    } catch {
      setError('Unable to verify Paystack payment right now.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePaystackOrder = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Please enter your name.');
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

    if (printerModel.trim().length < 3) {
      setError('Please enter your exact Epson model number (e.g. L3210, L3110, L805).');
      return;
    }

    if (serviceMode === 'remote' && anydeskId.trim().length < 6) {
      setError('Please enter your AnyDesk ID so the technician can connect.');
      return;
    }

    setIsProcessing(true);
    try {
      const init = await initializePaystackPayment({
        email: email.trim(),
        customerName: name.trim(),
        phone: phone.trim(),
        anydeskId: serviceMode === 'remote' ? anydeskId.trim() : undefined,
        items: [singleItem],
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
            void handleVerify(response.reference);
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
          : 'Paystack could not start right now. Use Order via WhatsApp below.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (createdOrder) {
    const primaryItem = createdOrder.items[0];
    const paidForwardMsg = [
      `PAID ORDER — ${createdOrder.orderId}`,
      `Paystack Ref: ${createdOrder.mpesaRef}`,
      `Customer: ${createdOrder.customerName} (${createdOrder.phone})`,
      `Item: Epson ${primaryItem.model} (${
        primaryItem.type === 'remote' ? 'AnyDesk Remote Reset' : 'AdjProg Resetter'
      })`,
      `Total Paid: KSh ${createdOrder.totalKsh}`,
      createdOrder.anydeskId ? `AnyDesk ID: ${createdOrder.anydeskId}` : null,
      `Please confirm and process my order.`,
    ]
      .filter(Boolean)
      .join('\n');

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5">
        <div>
          <div className="flex items-center gap-2.5 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
            <span className="text-sm font-semibold">
              Payment Verified · Order {createdOrder.orderId} · KSh {createdOrder.totalKsh}
            </span>
          </div>

          <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
            Forward Your Paid Order via WhatsApp
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
            Your Paystack payment for{' '}
            <span className="font-mono font-semibold text-slate-900">
              Epson {primaryItem.model}
            </span>{' '}
            (Ref <span className="font-mono text-slate-900">{createdOrder.mpesaRef}</span>) is
            confirmed. Click below to forward your paid order straight to our WhatsApp so we can
            deliver your file or connect on AnyDesk immediately.
          </p>
        </div>

        {createdOrder.anydeskId && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            Keep AnyDesk open on address{' '}
            <span className="font-mono font-bold text-slate-900">{createdOrder.anydeskId}</span>{' '}
            with your Epson {primaryItem.model} connected via USB cable.
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={buildWhatsAppChatUrl(paidForwardMsg)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void markOrderForwardedToWhatsApp(createdOrder.orderId)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#15803D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0"
          >
            <MessageCircle className="h-4 w-4" />
            Forward Order via WhatsApp
          </a>

          <button
            type="button"
            onClick={() => triggerResetterPackageDownload(createdOrder, primaryItem)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#003399] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#00287A] transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            {primaryItem.type === 'remote' ? 'Download Ticket' : 'Download Setup Guide'}
          </button>

          <button
            type="button"
            onClick={onOpenOrdersDrawer}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            View Orders
          </button>

          <button
            type="button"
            onClick={() => setCreatedOrder(null)}
            className="px-3 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            New Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handlePaystackOrder}
      noValidate
      className="rounded-xl border border-slate-200 bg-white p-4 sm:p-8 space-y-5"
    >
      <div>
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
          Pay Online with Paystack or Order via WhatsApp
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          M-Pesa &amp; Card accepted online · Total{' '}
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            KSh {activePrice}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-1 p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          onClick={() => setServiceMode('remote')}
          className={`min-h-[42px] px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            serviceMode === 'remote'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          AnyDesk Remote (KSh {ANYDESK_RESET_PRICE_KSH})
        </button>
        <button
          type="button"
          onClick={() => setServiceMode('download')}
          className={`min-h-[42px] px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            serviceMode === 'download'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Printer Resetter (KSh {RESETTER_PRICE_KSH})
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="req-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Your Name
          </label>
          <input
            id="req-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Brian Kamau"
            className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
            required
          />
        </div>

        <div>
          <label htmlFor="req-phone" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Phone / WhatsApp Number
          </label>
          <input
            id="req-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="req-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Email Address
          </label>
          <input
            id="req-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
            required
          />
        </div>

        <div>
          <label htmlFor="req-model" className="block text-xs font-semibold text-slate-700 mb-1.5">
            Exact Epson Printer Model
          </label>
          <input
            id="req-model"
            type="text"
            value={printerModel}
            onChange={(e) => setPrinterModel(e.target.value)}
            placeholder="e.g. L3210, L3110, L805, M200"
            className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
            required
          />
        </div>
      </div>

      {serviceMode === 'remote' && (
        <div>
          <label
            htmlFor="req-anydesk"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            AnyDesk Address (Required for Remote Reset)
          </label>
          <input
            id="req-anydesk"
            type="text"
            value={anydeskId}
            onChange={(e) => setAnydeskId(e.target.value)}
            placeholder="e.g. 482 910 331"
            className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm font-mono text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
          />
        </div>
      )}

      {pendingPaystack && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5">
          <p className="text-xs text-slate-700">
            Paystack payment ready (Ref:{' '}
            <span className="font-mono font-semibold">{pendingPaystack.reference}</span>). Open
            Paystack checkout below if the window did not appear, then click Verify Payment.
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
              onClick={() => handleVerify(pendingPaystack.reference)}
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

      <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="submit"
          disabled={isProcessing}
          className="min-h-[46px] flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#003399] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#00287A] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting Paystack...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              Pay KSh {activePrice} Online
            </>
          )}
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-white px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          Order via WhatsApp
        </a>
      </div>
    </form>
  );
}
