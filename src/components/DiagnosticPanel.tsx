import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import { DIAGNOSTIC_SYMPTOMS } from '../data/epsonResetters';

interface DiagnosticPanelProps {
  onJumpToCatalog: () => void;
  onJumpToRemote: () => void;
}

export function DiagnosticPanel({ onJumpToCatalog, onJumpToRemote }: DiagnosticPanelProps) {
  const [activeId, setActiveId] = useState<string>(DIAGNOSTIC_SYMPTOMS[0].id);
  const current =
    DIAGNOSTIC_SYMPTOMS.find((item) => item.id === activeId) ?? DIAGNOSTIC_SYMPTOMS[0];

  const renderSeverityIndicator = (severity: typeof current.severity, label: string) => {
    if (severity === 'reset-fixes') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
          {label}
        </span>
      );
    }
    if (severity === 'setup-issue') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800">
          <Wrench className="h-4 w-4 shrink-0 text-amber-700" />
          {label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800">
        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-700" />
        {label}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-5 space-y-2" role="tablist" aria-label="Epson printer symptoms">
        {DIAGNOSTIC_SYMPTOMS.map((symptom, index) => {
          const isActive = symptom.id === current.id;
          return (
            <button
              key={symptom.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(symptom.id)}
              className={`w-full text-left rounded-lg border px-4 py-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399] ${
                isActive
                  ? 'border-[#003399] bg-white shadow-xs'
                  : 'border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">
                  0{index + 1}. {symptom.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 line-clamp-1">{symptom.lightPattern}</p>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          {renderSeverityIndicator(current.severity, current.severityLabel)}
          <span className="text-xs text-slate-500">{current.lightPattern}</span>
        </div>

        <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
          {current.label}
        </h3>

        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-xs font-medium text-slate-500 mb-1">Reported Status Message</p>
          <p className="font-mono text-xs sm:text-sm text-slate-900 leading-relaxed">
            {current.errorText}
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Why this happens</h4>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{current.cause}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Verified recovery steps</h4>
            <ol className="mt-2.5 space-y-2.5 text-[15px] leading-relaxed text-slate-700">
              {current.resolution.map((step, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-mono text-xs font-semibold text-[#003399] mt-1 tabular-nums shrink-0">
                    0{idx + 1}.
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
          <p className="text-xs text-slate-600 max-w-md">{current.recommendedAction}</p>
          <div className="flex items-center gap-3">
            {current.severity === 'reset-fixes' ? (
              <button
                type="button"
                onClick={onJumpToCatalog}
                className="rounded-lg bg-[#003399] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#00287A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399]"
              >
                Browse Resetters
              </button>
            ) : (
              <button
                type="button"
                onClick={onJumpToRemote}
                className="rounded-lg bg-[#003399] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#00287A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003399]"
              >
                Book Remote Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
