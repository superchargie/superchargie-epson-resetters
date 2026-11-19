import { useEffect, useState } from 'react';
import { Monitor, Download, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { type ResetterPackage } from '../data/epsonResetters';
import { type OrderItemType } from '../types/orders';

interface ResetterModalProps {
  pkg: ResetterPackage | null;
  onClose: () => void;
  onAddToCart: (pkg: ResetterPackage, model: string, type: OrderItemType, openDrawer: boolean) => void;
}

export function ResetterModal({ pkg, onClose, onAddToCart }: ResetterModalProps) {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [mode, setMode] = useState<OrderItemType>('download');

  useEffect(() => {
    if (pkg) {
      setSelectedModel(pkg.primaryModels[0] ?? pkg.allSupportedModels[0] ?? '');
      setMode('download');
    }
  }, [pkg]);

  useEffect(() => {
    if (!pkg) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pkg, onClose]);

  if (!pkg) return null;

  const activePrice = mode === 'download' ? pkg.priceKsh : pkg.remoteResetKsh;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 p-0 sm:p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resetter-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-t-2xl sm:rounded-xl border-t sm:border border-slate-200 bg-white shadow-xl overflow-hidden max-h-[92dvh] sm:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {pkg.seriesLabel} · {pkg.osSupport} · {pkg.fileSize}
            </p>
            <h3
              id="resetter-modal-title"
              className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-slate-900"
            >
              {pkg.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close package details"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 space-y-5 sm:space-y-6">
          <p className="text-sm sm:text-[15px] leading-relaxed text-slate-600">{pkg.notes}</p>

          <div>
            <p className="text-sm font-semibold text-slate-900 mb-2.5">
              Select your exact printer model
            </p>
            <div className="flex flex-wrap gap-2">
              {pkg.allSupportedModels.map((model) => {
                const isSelected = selectedModel === model;
                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setSelectedModel(model)}
                    className={`min-h-[40px] px-3 py-2 text-xs font-mono font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399] ${
                      isSelected
                        ? 'border-[#003399] bg-[#003399] text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    Epson {model}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900 mb-2.5">Choose service option</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('download')}
                className={`flex flex-col items-start text-left rounded-lg border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399] ${
                  mode === 'download'
                    ? 'border-[#003399] bg-[#003399]/[0.04]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Download className="h-4 w-4 text-[#003399] shrink-0" />
                    Printer Resetter (AdjProg)
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                    KSh {pkg.priceKsh}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Full offline utility ({pkg.fileSize}) for unlimited future resets on Windows via USB.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode('remote')}
                className={`flex flex-col items-start text-left rounded-lg border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399] ${
                  mode === 'remote'
                    ? 'border-[#003399] bg-[#003399]/[0.04]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Monitor className="h-4 w-4 text-[#003399] shrink-0" />
                    AnyDesk Remote Reset
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                    KSh {pkg.remoteResetKsh}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Live technician connects over AnyDesk and resets your counter to 0% in under 5 minutes.
                </p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-5 text-xs text-slate-600">
            <div>
              <p className="font-semibold text-slate-900 mb-1">Supported Counters</p>
              <p>{pkg.countersSupported.join(' · ')}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-1">Requirements</p>
              <p>
                {pkg.connection} · {pkg.osSupport} · Temporarily pause antivirus
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between sm:block">
            <p className="text-xs text-slate-500">
              Epson {selectedModel} · {mode === 'download' ? 'Resetter' : 'AnyDesk'}
            </p>
            <p className="font-mono text-base font-bold text-slate-900 tabular-nums">
              KSh {activePrice}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                onAddToCart(pkg, selectedModel, mode, false);
                onClose();
              }}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 sm:px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399]"
            >
              <ShoppingBag className="h-4 w-4" />
              Add to Cart
            </button>

            <button
              type="button"
              onClick={() => {
                onAddToCart(pkg, selectedModel, mode, true);
                onClose();
              }}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#003399] px-4 sm:px-5 py-2.5 text-sm font-medium text-white hover:bg-[#00287A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399]"
            >
              Checkout
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
