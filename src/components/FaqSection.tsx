import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ANYDESK_RESET_PRICE_KSH, RESETTER_PRICE_KSH } from '../data/epsonResetters';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const EPSON_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'fix-ink-pad-error',
    question:
      'How do I fix "A printer\'s ink pad is at the end of its service life" on Epson L3210 or L3110?',
    answer:
      'Connect your Epson printer directly to a Windows PC via USB cable, cancel pending print jobs, extract the matching Epson Adjustment Program (AdjProg), run AdjProg.exe as Administrator, select Particular Adjustment Mode -> Waste Ink Pad Counter -> Check -> Initialize, then power cycle the printer off and back on.',
  },
  {
    id: 'pricing-kenya',
    question: 'How much does an Epson AdjProg resetter or AnyDesk remote reset cost?',
    answer: `Every standalone Epson Adjustment Program (AdjProg) utility is KSh ${RESETTER_PRICE_KSH} for unlimited offline resets on your Windows PC. If you prefer a technician to reset the waste ink pad counter for you live over AnyDesk, the remote reset service is KSh ${ANYDESK_RESET_PRICE_KSH}.`,
  },
  {
    id: 'antivirus-false-positive',
    question: 'Why does Windows Defender flag AdjProg.exe as a virus?',
    answer:
      'Epson Adjustment Programs use packed service-level executables and loader patches that trigger heuristic false positives in Windows Defender and third-party antivirus tools. Add a folder exclusion or temporarily pause Real-time protection while extracting and running AdjProg.exe, then turn protection back on immediately afterward.',
  },
  {
    id: 'wifi-reset',
    question: 'Can I reset an Epson waste ink pad counter over Wi-Fi or on a Mac?',
    answer:
      'No. Epson Adjustment Programs require a direct USB 2.0 cable connection to a Windows 7, 8, 10, or 11 PC with the official Epson printer driver installed. Wi-Fi, network sharing, and macOS cannot initialize the EEPROM waste ink counter.',
  },
  {
    id: 'comm-error-21000068',
    question: 'How do I fix Communication Error 21000068 in Epson Adjustment Program?',
    answer:
      'Communication Error 21000068 occurs when AdjProg cannot talk to the printer port. Plug the USB cable directly into a rear PC port (avoid USB hubs), cancel all stuck documents in the Windows print queue, and manually choose the active USB port (such as USB001) inside AdjProg Select settings.',
  },
  {
    id: 'physical-ink-pads',
    question: 'Do I still need to clean or replace the physical waste ink pads after resetting?',
    answer:
      'Yes. Running AdjProg resets the internal software counter back to 0% so the printer unlocks immediately, but it does not empty the physical ink sponges. After 1 to 2 software resets, wash and dry the pads, replace the sponge assembly, or install an external waste ink tank to prevent leaks.',
  },
];

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>(EPSON_FAQ_ITEMS[0].id);

  return (
    <section id="faq" className="border-t border-slate-200 bg-slate-50/80 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Epson Resetter Frequently Asked Questions
            </h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600">
              Answers to the most common waste ink pad counter, AdjProg Windows setup, USB
              communication error, and AnyDesk remote reset questions.
            </p>
          </div>

          <div className="lg:col-span-8 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {EPSON_FAQ_ITEMS.map((item) => {
              const isOpen = openId === item.id;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${item.id}`}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50/70 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#003399]"
                  >
                    <h3 className="text-sm sm:text-[15px] font-semibold text-slate-900 pr-4">
                      {item.question}
                    </h3>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-[#003399]' : ''
                      }`}
                    />
                  </button>
                  <div
                    id={`faq-panel-${item.id}`}
                    hidden={!isOpen}
                    className="px-6 pb-5 text-sm leading-relaxed text-slate-600"
                  >
                    {item.answer}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
