import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  MessageCircle,
  Search,
  Printer,
  ShieldAlert,
  ShoppingBag,
  X,
} from 'lucide-react';
import {
  ANYDESK_RESET_PRICE_KSH,
  PRE_RESET_CHECKLIST,
  RESET_STEPS,
  RESETTER_CATALOG,
  RESETTER_PRICE_KSH,
  RESETTER_SERIES_TABS,
  TOTAL_SUPPORTED_MODELS,
  type ResetterPackage,
  type ResetterSeries,
} from './data/epsonResetters';
import {
  loadCart,
  loadOrders,
  saveCart,
  saveOrders,
  type CartItem,
  type CompletedOrder,
  type OrderItemType,
} from './types/orders';
import { ResetterModal } from './components/ResetterModal';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { RemoteRequestForm } from './components/RemoteRequestForm';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { FaqSection } from './components/FaqSection';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { useSeoHead } from './hooks/useSeoHead';
import { buildWhatsAppChatUrl } from './lib/paystack';
import {
  auth,
  db,
  isAdminUser,
  signInWithGoogle,
  signOutUser,
} from './lib/firebase';
import { saveOrderToFirestore } from './lib/firestoreStore';

const HERO_IMAGE = '/src/assets/images/hero_epson_workshop_1795069829394.jpg';
const GUIDE_IMAGE = '/src/assets/images/guide_usb_maintenance_1795069828830.jpg';
const REMOTE_IMAGE = '/src/assets/images/remote_anydesk_support_1795069829064.jpg';

function ImageFrame({
  src,
  alt,
  aspectClass,
  fallbackTitle,
  priority = false,
}: {
  src: string;
  alt: string;
  aspectClass: string;
  fallbackTitle: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${aspectClass} w-full rounded-xl border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-6 text-center`}
      >
        <Printer className="h-8 w-8 text-slate-400 mb-2" />
        <p className="text-sm font-medium text-slate-600">{fallbackTitle}</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${aspectClass} w-full rounded-xl border border-slate-200 object-cover bg-slate-100`}
    />
  );
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('model') ?? '';
  });
  const [heroQuickQuery, setHeroQuickQuery] = useState('');
  const [activeSeries, setActiveSeries] = useState<ResetterSeries>('all');
  const [selectedPackage, setSelectedPackage] = useState<ResetterPackage | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [formPrefill, setFormPrefill] = useState<{
    model: string;
    mode: OrderItemType;
  }>({ model: '', mode: 'remote' });

  const [cart, setCart] = useState<CartItem[]>(() => loadCart());
  const [orders, setOrders] = useState<CompletedOrder[]>(() => loadOrders());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'cart' | 'orders'>('cart');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [customResetters, setCustomResetters] = useState<ResetterPackage[]>([]);

  const isAdmin = isAdminUser(currentUser);
  const allResetters = useMemo(
    () => [...customResetters, ...RESETTER_CATALOG],
    [customResetters]
  );

  useSeoHead(searchQuery);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const unsubResetters = onSnapshot(
      collection(db, 'resetters'),
      (snap) => {
        const list: ResetterPackage[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: String(data.title || 'Epson AdjProg'),
            series: (data.series || 'ecotank-l') as Exclude<ResetterSeries, 'all'>,
            seriesLabel: String(data.seriesLabel || 'EcoTank'),
            primaryModels: Array.isArray(data.primaryModels) ? data.primaryModels : [],
            allSupportedModels: Array.isArray(data.allSupportedModels)
              ? data.allSupportedModels
              : [],
            priceKsh: Number(data.priceKsh) || RESETTER_PRICE_KSH,
            remoteResetKsh: Number(data.remoteResetKsh) || ANYDESK_RESET_PRICE_KSH,
            osSupport: String(data.osSupport || 'Windows 7 / 10 / 11'),
            connection: String(data.connection || 'Direct USB 2.0'),
            fileSize: String(data.fileSize || '3.8 MB (.zip)'),
            countersSupported: Array.isArray(data.countersSupported)
              ? data.countersSupported
              : ['Main pad counter'],
            notes: String(data.notes || ''),
            popular: Boolean(data.popular),
          };
        });
        setCustomResetters(list);
      },
      (err) => {
        console.warn('Resetters snapshot fallback to built-in catalog:', err.message);
      }
    );
    return () => unsubResetters();
  }, []);

  const selectModelForSearch = (model: string) => {
    setSearchQuery(model);
    setActiveSeries('all');
    const url = new URL(window.location.href);
    if (model.trim()) {
      url.searchParams.set('model', model.trim());
    } else {
      url.searchParams.delete('model');
    }
    window.history.replaceState({}, '', url.toString());
    scrollToSection('catalog');
  };

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allResetters.filter((pkg) => {
      const matchesSeries = activeSeries === 'all' || pkg.series === activeSeries;
      if (!matchesSeries) return false;
      if (!q) return true;
      return (
        pkg.title.toLowerCase().includes(q) ||
        pkg.seriesLabel.toLowerCase().includes(q) ||
        pkg.allSupportedModels.some((m) => m.toLowerCase().includes(q)) ||
        pkg.notes.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, activeSeries, allResetters]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const completedChecklistCount = Object.values(checkedItems).filter(Boolean).length;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleHeroSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(heroQuickQuery);
    setActiveSeries('all');
    scrollToSection('catalog');
  };

  const handleBookInForm = (model: string, mode: OrderItemType) => {
    setFormPrefill({ model, mode });
    scrollToSection('remote-reset');
  };

  const handleAddToCart = (
    pkg: ResetterPackage,
    model: string,
    type: OrderItemType,
    openDrawerAfter: boolean
  ) => {
    const key = `${pkg.id}:${model}:${type}`;
    const unitPriceKsh = type === 'download' ? pkg.priceKsh : pkg.remoteResetKsh;

    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          key,
          packageId: pkg.id,
          title: pkg.title,
          model,
          type,
          unitPriceKsh,
          quantity: 1,
        },
      ];
    });

    if (openDrawerAfter) {
      setDrawerTab('cart');
      setDrawerOpen(true);
    }
  };

  const handleUpdateQuantity = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const handleCompleteCartOrder = (order: CompletedOrder) => {
    setOrders((prev) => [order, ...prev]);
    setCart([]);
    if (currentUser) {
      void saveOrderToFirestore(currentUser, order, 'paystack');
    }
  };

  const handleDirectOrderCreated = (order: CompletedOrder) => {
    setOrders((prev) => [order, ...prev]);
    if (currentUser) {
      void saveOrderToFirestore(currentUser, order, 'paystack');
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign-in cancelled or failed:', err);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setAdminOpen(false);
  };

  const toggleChecklist = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar: Strict 3-Zone Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 h-16">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Epson Resetters
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
          >
            <a
              href="#catalog"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Catalog
            </a>
            <a
              href="#diagnostics"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Diagnostics
            </a>
            <a
              href="#how-it-works"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Reset Guide
            </a>
            <a
              href="#remote-reset"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Remote Reset
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setDrawerTab(cartItemCount > 0 ? 'cart' : orders.length > 0 ? 'orders' : 'cart');
                setDrawerOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#003399] px-4 py-2 text-sm font-medium text-white hover:bg-[#00287A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399]"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="tabular-nums">
                {cartItemCount > 0
                  ? `Cart (${cartItemCount})`
                  : orders.length > 0
                  ? `Orders (${orders.length})`
                  : 'Cart (0)'}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero Section */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="text-xs font-medium text-slate-500">
                  Independent Epson Adjustment Program Portal · Instant Checkout &amp; Downloads
                </p>

                <h1
                  className="mt-3 font-display font-bold tracking-tight text-slate-900 leading-[1.1] max-w-xl"
                  style={{
                    fontSize: 'clamp(2.25rem, 4vw, 3.25rem)',
                    textWrap: 'balance',
                  }}
                >
                  Reset locked Epson printers back to 0% in minutes
                </h1>

                <p className="mt-5 text-[15px] sm:text-base leading-relaxed text-slate-600 max-w-xl">
                  Clear alternating red lights and{' '}
                  <span className="font-mono text-sm text-slate-900">
                    “A printer&apos;s ink pad is at the end of its service life”
                  </span>{' '}
                  errors across {TOTAL_SUPPORTED_MODELS}+ Epson L-Series, M-Series, Photo, A3, and
                  EcoTank models. Every resetter utility is KSh {RESETTER_PRICE_KSH}, or book a live
                  AnyDesk remote reset for KSh {ANYDESK_RESET_PRICE_KSH}.
                </p>

                <form
                  onSubmit={handleHeroSearchSubmit}
                  className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-lg"
                >
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={heroQuickQuery}
                      onChange={(e) => setHeroQuickQuery(e.target.value)}
                      placeholder="Enter model (e.g. L3210, L3110, L805, M200)"
                      aria-label="Search Epson printer model"
                      className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#003399] px-5 py-3 text-sm font-medium text-white hover:bg-[#00287A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399]"
                  >
                    Find Resetter
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                  <span>Popular models:</span>
                  {['L3210', 'L3250', 'L3110', 'L805', 'L1800', 'M200'].map((model) => (
                    <a
                      key={model}
                      href={`/?model=${encodeURIComponent(model)}#catalog`}
                      onClick={(e) => {
                        e.preventDefault();
                        selectModelForSearch(model);
                      }}
                      className="font-mono font-medium text-slate-700 hover:text-[#003399] underline underline-offset-4 transition-colors"
                    >
                      {model}
                    </a>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6">
                <ImageFrame
                  src={HERO_IMAGE}
                  alt="Epson EcoTank L3210 and L3110 inkjet printer connected via USB to a Windows laptop for AdjProg waste ink pad counter reset"
                  aspectClass="aspect-[16/10] lg:h-full lg:aspect-auto"
                  fallbackTitle="Epson EcoTank USB Diagnostic Workstation"
                  priority
                />
              </div>
            </div>

            {/* Full-width 4-column specification & proof strip below hero split */}
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-6 border-t border-slate-200 pt-8">
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  {TOTAL_SUPPORTED_MODELS}+
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Epson L, M, ET, Photo &amp; A3 models supported
                </p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  KSh {RESETTER_PRICE_KSH}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Flat price per AdjProg resetter (unlimited resets)
                </p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  KSh {ANYDESK_RESET_PRICE_KSH}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Live technician remote reset via AnyDesk
                </p>
              </div>
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
                  Win 7–11
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Direct USB 2.0 connection required (no Wi-Fi)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Interactive AdjProg Resetter Catalog */}
        <section id="catalog" className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Complete Epson Adjustment Program Catalog
              </h2>
              <p className="mt-2 text-[15px] text-slate-600 max-w-2xl">
                Every Adjustment Program utility is KSh {RESETTER_PRICE_KSH} for instant download,
                or add an AnyDesk remote reset session at KSh {ANYDESK_RESET_PRICE_KSH}.
              </p>
            </div>
            <p className="text-xs font-mono text-slate-500 tabular-nums shrink-0">
              Showing {filteredCatalog.length} of {allResetters.length} packages
            </p>
          </div>

          {/* Filter Bar */}
          <div className="mt-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div
              className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-200/70 p-1"
              role="tablist"
              aria-label="Filter resetters by printer series"
            >
              {RESETTER_SERIES_TABS.map((tab) => {
                const isActive = activeSeries === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveSeries(tab.id)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399] ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by model number..."
                aria-label="Filter catalog by model number"
                className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#003399] focus:outline-none focus:ring-2 focus:ring-[#003399]/15"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search filter"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Catalog Grid */}
          {filteredCatalog.length === 0 ? (
            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-base font-semibold text-slate-900">
                No resetter package matched “{searchQuery}”
              </p>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                You can still place a direct custom order for your exact Epson model below at KSh{' '}
                {RESETTER_PRICE_KSH} (resetter) or KSh {ANYDESK_RESET_PRICE_KSH} (AnyDesk remote).
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveSeries('all');
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={() => handleBookInForm(searchQuery, 'download')}
                  className="rounded-lg bg-[#003399] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#00287A] transition-colors"
                >
                  Order Custom Model
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredCatalog.map((pkg) => (
                <article
                  key={pkg.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 transition-colors hover:border-slate-300"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>
                        {pkg.seriesLabel} · {pkg.osSupport} · {pkg.fileSize}
                      </span>
                      {pkg.popular && (
                        <span className="font-medium text-[#003399] whitespace-nowrap shrink-0">
                          Most Requested
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2.5 text-lg font-bold tracking-tight text-slate-900">
                      {pkg.title}
                    </h3>

                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{pkg.notes}</p>

                    <div className="mt-4 border-t border-slate-100 pt-3.5">
                      <p className="text-xs text-slate-500 mb-1">Supported Models</p>
                      <p className="font-mono text-xs leading-relaxed text-slate-800">
                        {pkg.allSupportedModels.join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
                    <div>
                      <span className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                        KSh {pkg.priceKsh}
                      </span>
                      <p className="text-xs text-slate-500">
                        Resetter · AnyDesk KSh {pkg.remoteResetKsh}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleAddToCart(pkg, pkg.primaryModels[0], 'download', true)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#003399] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#00287A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399]"
                      >
                        Buy KSh {pkg.priceKsh}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPackage(pkg)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 hover:border-[#003399] hover:text-[#003399] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399]"
                      >
                        Models &amp; Remote
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Crawlable Supported Epson Model Index */}
          <div className="mt-12 border-t border-slate-200 pt-8">
            <h3 className="text-sm font-semibold text-slate-900">
              Direct Model Quick Index ({TOTAL_SUPPORTED_MODELS} Supported Epson Resetters)
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Click any model code to jump straight to its verified Adjustment Program (AdjProg)
              package.
            </p>
            <div className="mt-3.5 flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
              {allResetters.flatMap((pkg) => pkg.allSupportedModels).map((model, idx) => (
                <a
                  key={`${model}-${idx}`}
                  href={`/?model=${encodeURIComponent(model)}#catalog`}
                  onClick={(e) => {
                    e.preventDefault();
                    selectModelForSearch(model);
                  }}
                  className="font-mono text-slate-600 hover:text-[#003399] hover:underline underline-offset-4 transition-colors"
                >
                  Epson {model}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2: Interactive Error & Light Diagnostics */}
        <section id="diagnostics" className="border-y border-slate-200 bg-slate-50/80 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Verify Your Error Before Resetting
              </h2>
              <p className="mt-2 text-[15px] text-slate-600">
                Not every flashing red light is a waste ink counter lock. Select the symptom
                matching your Epson printer to confirm whether AdjProg will resolve it.
              </p>
            </div>

            <DiagnosticPanel
              onJumpToCatalog={() => scrollToSection('catalog')}
              onJumpToRemote={() => handleBookInForm('', 'remote')}
            />
          </div>
        </section>

        {/* Section 3: Step-by-Step AdjProg Guide & Pre-Reset Checklist */}
        <section id="how-it-works" className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-7">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                How to Run the Epson Adjustment Program
              </h2>
              <p className="mt-2 text-[15px] text-slate-600">
                Follow these six steps on a Windows PC connected via USB. The entire counter reset
                takes under three minutes once extracted.
              </p>

              <ol className="mt-8 divide-y divide-slate-200 border-t border-b border-slate-200">
                {RESET_STEPS.map((step) => (
                  <li key={step.number} className="py-5">
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-sm font-bold text-[#003399] tabular-nums pt-0.5 shrink-0">
                        {step.number}
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{step.title}</h3>
                        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
                          {step.detail}
                        </p>
                        {step.caution && (
                          <p className="mt-2 text-xs font-medium text-amber-800">
                            Note: {step.caution}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <ImageFrame
                src={GUIDE_IMAGE}
                alt="Close-up of Epson EcoTank front ink reservoirs and direct USB cable connection on a clean desk"
                aspectClass="aspect-[4/3]"
                fallbackTitle="Direct USB Cable & EcoTank Reservoir Setup"
              />

              {/* Interactive Pre-Reset Checklist */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Pre-Reset Checklist</h3>
                  <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
                    {completedChecklistCount}/{PRE_RESET_CHECKLIST.length} Ready
                  </span>
                </div>

                <ul className="mt-4 space-y-3">
                  {PRE_RESET_CHECKLIST.map((item) => {
                    const checked = Boolean(checkedItems[item.id]);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => toggleChecklist(item.id)}
                          aria-pressed={checked}
                          className="flex w-full items-start gap-3 text-left group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399] rounded"
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              checked
                                ? 'border-[#003399] bg-[#003399] text-white'
                                : 'border-slate-300 bg-white group-hover:border-slate-400'
                            }`}
                          >
                            {checked && <Check className="h-3.5 w-3.5" />}
                          </span>
                          <span
                            className={`text-sm leading-snug ${
                              checked ? 'text-slate-400 line-through' : 'text-slate-700'
                            }`}
                          >
                            {item.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Hardware Pad Advisory */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5">
                <div className="flex items-center gap-2 text-amber-900">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <h3 className="text-sm font-bold">Physical Waste Ink Pad Advisory</h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-amber-950/85">
                  AdjProg resets the printer&apos;s internal software counter back to 0%, allowing
                  you to print again immediately. It does not empty the physical sponge pads inside
                  the chassis. After 1–2 software resets, clean or replace the waste ink pads—or fit
                  an external waste ink bottle—to prevent ink leaks onto your desk.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Remote Reset via AnyDesk & Direct Booking */}
        <section id="remote-reset" className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    Printer Resetter or AnyDesk Remote Reset
                  </h2>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600">
                    Download the standalone AdjProg resetter for KSh {RESETTER_PRICE_KSH}, or have a
                    technician connect live via AnyDesk and clear the waste ink counter for KSh{' '}
                    {ANYDESK_RESET_PRICE_KSH}.
                  </p>
                </div>

                <ImageFrame
                  src={REMOTE_IMAGE}
                  alt="Technical support workstation with laptop and inkjet printer outputting a crisp CMYK color test page"
                  aspectClass="aspect-[4/3]"
                  fallbackTitle="AnyDesk Remote Reset Support Workstation"
                />

                <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">Printer Resetter</p>
                    <p className="font-mono text-base font-bold text-[#003399] mt-1 tabular-nums">
                      KSh {RESETTER_PRICE_KSH}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Offline Windows AdjProg utility for unlimited resets on your PC.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">AnyDesk Remote Reset</p>
                    <p className="font-mono text-base font-bold text-[#003399] mt-1 tabular-nums">
                      KSh {ANYDESK_RESET_PRICE_KSH}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Guided live remote session where a technician clears the lockout for you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <RemoteRequestForm
                  prefillModel={formPrefill.model}
                  prefillMode={formPrefill.mode}
                  onOrderCreated={handleDirectOrderCreated}
                  onOpenOrdersDrawer={() => {
                    setDrawerTab('orders');
                    setDrawerOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Frequently Asked Questions (Matches FAQPage Schema) */}
        <FaqSection />
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-[#F8FAFC] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-display text-base font-bold text-slate-900">Epson Resetters</p>
            <p className="mt-1 text-xs text-slate-500">
              Independent Epson Adjustment Programs (KSh {RESETTER_PRICE_KSH}) &amp; AnyDesk Remote
              Resets (KSh {ANYDESK_RESET_PRICE_KSH})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-slate-600">
            <a href="#catalog" className="hover:text-slate-900 transition-colors">
              Catalog
            </a>
            <a href="#diagnostics" className="hover:text-slate-900 transition-colors">
              Diagnostics
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              Reset Guide
            </a>
            <a href="#remote-reset" className="hover:text-slate-900 transition-colors">
              Remote Reset
            </a>
            <button
              type="button"
              onClick={() => {
                setDrawerTab('orders');
                setDrawerOpen(true);
              }}
              className="hover:text-slate-900 transition-colors"
            >
              My Downloads ({orders.length})
            </button>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setAdminOpen(true)}
                className="font-semibold text-[#003399] hover:underline transition-colors"
              >
                Admin Console
              </button>
            ) : currentUser ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="hover:text-slate-900 transition-colors"
              >
                Sign Out ({currentUser.email})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="hover:text-slate-900 transition-colors"
              >
                Admin / Customer Sign In
              </button>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-6 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            Epson and EcoTank are trademarks of Seiko Epson Corporation. Independent printer
            maintenance utility storefront.
          </p>
          <p className="tabular-nums">© {new Date().getFullYear()} Epson Resetters</p>
        </div>
      </footer>

      <ResetterModal
        pkg={selectedPackage}
        onClose={() => setSelectedPackage(null)}
        onAddToCart={handleAddToCart}
      />

      <CartCheckoutDrawer
        isOpen={drawerOpen}
        initialTab={drawerTab}
        onClose={() => setDrawerOpen(false)}
        cart={cart}
        orders={orders}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenAdmin={() => setAdminOpen(true)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCompleteOrder={handleCompleteCartOrder}
      />

      {isAdmin && currentUser?.email && (
        <AdminDashboardModal
          isOpen={adminOpen}
          adminEmail={currentUser.email}
          customResetters={customResetters}
          onClose={() => setAdminOpen(false)}
        />
      )}

      {/* Admin quick-access trigger when signed in as admin */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => setAdminOpen(true)}
          className="fixed bottom-5 left-5 z-40 inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-xs font-semibold text-white shadow-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          Admin Console
        </button>
      )}

      {/* Floating Chat with us WhatsApp Button */}
      <a
        href={buildWhatsAppChatUrl(
          'Hello, I need help with an Epson printer resetter or AnyDesk remote reset.'
        )}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-5 right-5 z-40 inline-flex h-11 items-center gap-2 rounded-full bg-[#15803D] px-4 text-sm font-semibold text-white shadow-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#15803D]"
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        Chat with us
      </a>
    </div>
  );
}
