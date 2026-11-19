export type ResetterSeries =
  | 'all'
  | 'ecotank-l'
  | 'photo-wide'
  | 'monochrome-m'
  | 'et-wf-legacy';

export interface ResetterPackage {
  id: string;
  title: string;
  primaryModels: string[];
  allSupportedModels: string[];
  series: Exclude<ResetterSeries, 'all'>;
  seriesLabel: string;
  priceKsh: number;
  remoteResetKsh: number;
  osSupport: string;
  connection: string;
  fileSize: string;
  countersSupported: string[];
  notes: string;
  popular?: boolean;
}

export interface DiagnosticSymptom {
  id: string;
  label: string;
  errorText: string;
  lightPattern: string;
  severity: 'reset-fixes' | 'setup-issue' | 'hardware-check';
  severityLabel: string;
  cause: string;
  resolution: string[];
  recommendedAction: string;
}

export interface ResetStep {
  number: string;
  title: string;
  detail: string;
  caution?: string;
}

export const RESETTER_PRICE_KSH = 300;
export const ANYDESK_RESET_PRICE_KSH = 500;

export const RESETTER_SERIES_TABS: { id: ResetterSeries; label: string }[] = [
  { id: 'all', label: 'All Models' },
  { id: 'ecotank-l', label: 'EcoTank L-Series' },
  { id: 'photo-wide', label: 'Photo & A3 Wide' },
  { id: 'monochrome-m', label: 'Monochrome M-Series' },
  { id: 'et-wf-legacy', label: 'ET / WF / Legacy' },
];

export const RESETTER_CATALOG: ResetterPackage[] = [
  {
    id: 'l3210-l3250-pack',
    title: 'Epson L3210 / L3250 / L1210 Series AdjProg',
    primaryModels: ['L3210', 'L3250', 'L3260', 'L5290'],
    allSupportedModels: [
      'L1210',
      'L1211',
      'L1250',
      'L3210',
      'L3211',
      'L3216',
      'L3250',
      'L3251',
      'L3256',
      'L3260',
      'L5290',
    ],
    series: 'ecotank-l',
    seriesLabel: 'EcoTank Gen-3',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '4.2 MB (.zip)',
    countersSupported: ['Main pad counter', 'Platen pad counter'],
    notes:
      'Complete Gen-3 EcoTank adjustment utility covering L1210, L3210, L3250, L3260, and L5290 mainboards. Unlimited offline resets on Windows.',
    popular: true,
  },
  {
    id: 'l3110-l3150-pack',
    title: 'Epson L3110 / L3150 / L1110 Series AdjProg',
    primaryModels: ['L3110', 'L3150', 'L1110', 'L5190'],
    allSupportedModels: [
      'L1110',
      'L3100',
      'L3101',
      'L3110',
      'L3116',
      'L3150',
      'L3151',
      'L3156',
      'L5190',
    ],
    series: 'ecotank-l',
    seriesLabel: 'EcoTank Gen-2',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 8 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '3.6 MB (.zip)',
    countersSupported: ['Main pad counter', 'Platen pad counter', 'Head cleaning & EEPROM'],
    notes:
      'Most widely used office EcoTank resetter. Instantly clears alternating red ink and paper LEDs on L3110, L3150, and L5190 units.',
    popular: true,
  },
  {
    id: 'l380-l486-pack',
    title: 'Epson L380 / L382 / L386 / L486 AdjProg',
    primaryModels: ['L380', 'L382', 'L386', 'L486'],
    allSupportedModels: ['L380', 'L382', 'L385', 'L386', 'L485', 'L486'],
    series: 'ecotank-l',
    seriesLabel: 'EcoTank Classic',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 8 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '2.9 MB (.zip)',
    countersSupported: ['Main pad counter', 'Platen pad counter'],
    notes:
      'Verified adjustment program for the L380 and L486 multi-function series. Runs offline with no license expiration.',
  },
  {
    id: 'l4150-l6190-pack',
    title: 'Epson L4150 / L4160 / L4260 / L6190 AdjProg',
    primaryModels: ['L4150', 'L4160', 'L4260', 'L6190'],
    allSupportedModels: ['L4150', 'L4160', 'L4260', 'L6160', 'L6170', 'L6190', 'L6270'],
    series: 'ecotank-l',
    seriesLabel: 'Duplex EcoTank',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '4.8 MB (.zip)',
    countersSupported: ['Main pad counter', 'Borderless / Platen pad counter'],
    notes:
      'Designed for auto-duplex business EcoTank models. Clears internal platen and main pad counters via direct USB connection.',
  },
  {
    id: 'l455-l565-office-pack',
    title: 'Epson L455 / L550 / L565 / L655 Office AdjProg',
    primaryModels: ['L455', 'L550', 'L565', 'L655'],
    allSupportedModels: ['L455', 'L550', 'L555', 'L565', 'L605', 'L655'],
    series: 'ecotank-l',
    seriesLabel: 'Office ADF',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '3.1 MB (.zip)',
    countersSupported: ['Main pad counter', 'Platen pad counter'],
    notes:
      'Supports ADF scan/fax office EcoTank models. Always connect via USB rather than Ethernet or Wi-Fi when initializing the counter.',
  },
  {
    id: 'l-series-all-in-one-pack',
    title: 'Epson L-Series Classic All-in-One AdjProg',
    primaryModels: ['L110', 'L120', 'L210', 'L360'],
    allSupportedModels: [
      'L110',
      'L120',
      'L130',
      'L210',
      'L220',
      'L300',
      'L310',
      'L350',
      'L355',
      'L360',
      'L365',
    ],
    series: 'ecotank-l',
    seriesLabel: 'L-Series Bundle',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 8 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '3.4 MB (.zip)',
    countersSupported: ['Main pad counter'],
    notes:
      'Multi-model classic L-Series utility covering first-generation ink tank printers widely used in cyber cafes, offices, and schools.',
    popular: true,
  },
  {
    id: 'l805-photo-pack',
    title: 'Epson L805 / L800 / L850 / L8050 Photo AdjProg',
    primaryModels: ['L805', 'L800', 'L850', 'L8050'],
    allSupportedModels: ['L800', 'L805', 'L810', 'L850', 'L8050'],
    series: 'photo-wide',
    seriesLabel: '6-Color Photo',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '3.9 MB (.zip)',
    countersSupported: ['Main pad counter', 'Ink charge & Printhead ID'],
    notes:
      'Built for 6-color photo studios and PVC ID card printers. Resets waste ink lockouts and supports initial ink charge routines.',
    popular: true,
  },
  {
    id: 'l1800-l1300-pack',
    title: 'Epson L1800 / L1300 / L1455 / L18050 A3 AdjProg',
    primaryModels: ['L1800', 'L1300', 'L1455', 'L18050'],
    allSupportedModels: ['L1300', 'L1455', 'L1800', 'L15150', 'L18050'],
    series: 'photo-wide',
    seriesLabel: 'A3 Wide-Format',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '4.5 MB (.zip)',
    countersSupported: ['Main pad counter', 'Platen pad counter', 'Initial ink charge'],
    notes:
      'Essential for DTF, sublimation, and architectural A3 printers. Clears the 100% service required counter safely without firmware flashing.',
  },
  {
    id: 'm100-m200-mono-pack',
    title: 'Epson M100 / M105 / M200 Monochrome AdjProg',
    primaryModels: ['M100', 'M105', 'M200'],
    allSupportedModels: ['M100', 'M105', 'M200', 'M205'],
    series: 'monochrome-m',
    seriesLabel: 'Monochrome Gen-1',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 8 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '2.7 MB (.zip)',
    countersSupported: ['Main pad counter'],
    notes:
      'Dedicated monochrome pigment tank resetter for high-volume document printers in offices and print shops.',
  },
  {
    id: 'm1100-m2140-mono-pack',
    title: 'Epson M1100 / M1120 / M2140 / M3170 AdjProg',
    primaryModels: ['M1100', 'M1120', 'M2140', 'M3170'],
    allSupportedModels: ['M1100', 'M1120', 'M1140', 'M1180', 'M2140', 'M2170', 'M3170'],
    series: 'monochrome-m',
    seriesLabel: 'Monochrome Gen-2',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '3.8 MB (.zip)',
    countersSupported: ['Main pad counter', 'Platen pad counter'],
    notes:
      'Covers the newer EcoTank monochrome series including duplex M2140 and M3170 models over direct USB.',
  },
  {
    id: 'et-series-pack',
    title: 'Epson EcoTank ET-2500 / ET-2720 / ET-2810 AdjProg',
    primaryModels: ['ET-2710', 'ET-2720', 'ET-2810', 'ET-2850'],
    allSupportedModels: [
      'ET-2500',
      'ET-2550',
      'ET-2600',
      'ET-2650',
      'ET-2710',
      'ET-2720',
      'ET-2750',
      'ET-2810',
      'ET-2850',
      'ET-4500',
    ],
    series: 'et-wf-legacy',
    seriesLabel: 'EcoTank ET-Series',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '4.1 MB (.zip)',
    countersSupported: ['Main pad counter', 'Platen pad counter'],
    notes:
      'For imported EU/UK/US EcoTank ET-Series printers displaying waste ink pad service life lockouts.',
  },
  {
    id: 'stylus-wf-xp-pack',
    title: 'Epson Stylus T50 / T60 / 1390 & WF / XP AdjProg',
    primaryModels: ['T50', 'T60', '1390', 'WF-2630'],
    allSupportedModels: [
      'T50',
      'T60',
      'P50',
      'R290',
      '1390',
      '1430',
      'WF-2510',
      'WF-2630',
      'WF-2750',
      'XP-235',
      'XP-332',
      'XP-432',
    ],
    series: 'et-wf-legacy',
    seriesLabel: 'Stylus / WF / XP',
    priceKsh: RESETTER_PRICE_KSH,
    remoteResetKsh: ANYDESK_RESET_PRICE_KSH,
    osSupport: 'Windows 7 / 8 / 10 / 11',
    connection: 'Direct USB 2.0',
    fileSize: '3.5 MB (.zip)',
    countersSupported: ['Main pad counter', 'Printhead alignment & EEPROM'],
    notes:
      'Covers classic Stylus Photo printers (T50, T60, P50, R290, 1390, 1430) alongside WorkForce WF and Expression XP desktop models.',
  },
];

export const TOTAL_SUPPORTED_MODELS = RESETTER_CATALOG.reduce(
  (sum, pkg) => sum + pkg.allSupportedModels.length,
  0
);

export const DIAGNOSTIC_SYMPTOMS: DiagnosticSymptom[] = [
  {
    id: 'service-required',
    label: 'Ink pad at end of service life',
    errorText: "A printer's ink pad is at the end of its service life. Please contact Epson Support.",
    lightPattern: 'Power solid, Ink & Paper red LEDs blinking alternately',
    severity: 'reset-fixes',
    severityLabel: 'Fixed by AdjProg Resetter',
    cause:
      'The internal waste ink pad counter stored on the printer mainboard has reached 100% of its factory threshold. Epson locks printing automatically as a precaution against ink overflow.',
    resolution: [
      'Connect the printer directly to a Windows PC using a USB cable (disconnect Wi-Fi printing).',
      'Cancel any stuck print jobs in the Windows print queue.',
      'Run the matching AdjProg utility as Administrator and initialize the Main Pad Counter back to 0%.',
      'Power cycle the printer off for 10 seconds, then turn it back on to resume printing.',
    ],
    recommendedAction:
      'Download the model-specific AdjProg resetter (KSh 300) or book an AnyDesk remote reset (KSh 500).',
  },
  {
    id: 'blinking-lights',
    label: 'Alternating red ink & paper lights',
    errorText: 'Service Required — Printer refuses to pull paper or print test pages',
    lightPattern: 'Ink drop and Paper red lights flashing back and forth',
    severity: 'reset-fixes',
    severityLabel: 'Fixed by AdjProg Resetter',
    cause:
      'On Epson L110–L3260 models without LCD screens, alternating red ink and paper LEDs are the hardware signal for a full waste ink pad counter (Main Pad or Platen Pad at 100%).',
    resolution: [
      'Open Epson Status Monitor 3 on Windows to confirm the "Service Required" message.',
      'Select your exact model in the catalog above and run Waste Ink Pad Counter -> Check -> Initialize.',
      'Inspect the rear waste pad sponge after resetting; clean or install an external waste ink bottle if saturated.',
    ],
    recommendedAction: 'Confirm model number on the front bezel and run AdjProg via USB.',
  },
  {
    id: 'comm-error',
    label: 'Communication Error 21000068 / 20000010',
    errorText: 'Communication error! Error Code: 21000068',
    lightPattern: 'AdjProg cannot read or initialize counter',
    severity: 'setup-issue',
    severityLabel: 'Connection / Queue Issue',
    cause:
      'AdjProg is trying to reach the printer over Wi-Fi, through a blocked print queue, or on the wrong USB port number.',
    resolution: [
      'Unplug any USB hubs and connect the printer directly to a rear motherboard USB port.',
      'Open Devices and Printers -> See what is printing -> Cancel all pending documents.',
      'In AdjProg, click Select and manually choose the exact USB port (e.g., USB001 or USB002) instead of Auto selection.',
      'Ensure the official Epson printer driver for your model is installed on Windows.',
    ],
    recommendedAction: 'Clear the print spooler and switch to a direct USB port.',
  },
  {
    id: 'antivirus-block',
    label: 'Windows Defender blocks AdjProg.exe',
    errorText: 'Operation did not complete successfully because the file contains a virus',
    lightPattern: 'Executable disappears immediately after extracting .zip',
    severity: 'setup-issue',
    severityLabel: 'False Positive Exclusion Needed',
    cause:
      'Because Epson Adjustment Programs use packed service-level executables and keygen loaders, Windows Defender and third-party antivirus suites frequently quarantine AdjProg.exe as a false positive.',
    resolution: [
      'Open Windows Security -> Virus & threat protection -> Manage settings.',
      'Temporarily toggle Real-time protection Off, or add an Exclusion folder for your extracted resetter directory.',
      'Re-extract the .zip/.rar archive using WinRAR or 7-Zip so AdjProg.exe is restored.',
      'Right-click AdjProg.exe -> Run as Administrator, complete the reset, then re-enable Real-time protection.',
    ],
    recommendedAction: 'Add a folder exclusion in Windows Security before extracting.',
  },
  {
    id: 'simultaneous-blink',
    label: 'All lights blinking together rapidly',
    errorText: 'Fatal Error / Paper Jam / Encoder Strip Fault',
    lightPattern: 'Power, Ink, and Paper lights flashing simultaneously',
    severity: 'hardware-check',
    severityLabel: 'Mechanical Check Required',
    cause:
      'Simultaneous flashing of all lights usually points to a physical obstruction—such as a jammed scrap of paper, dirty transparent encoder strip, or stalled carriage—rather than the waste ink counter.',
    resolution: [
      'Power off and unplug the printer, then open the scanner lid to inspect for torn paper or foreign objects.',
      'Check if the printhead carriage slides smoothly and clean the clear timing strip gently with a lint-free tissue.',
      'Do not purchase a resetter until you verify Epson Status Monitor says "Ink pad is at the end of its service life".',
    ],
    recommendedAction: 'Inspect physical paper path before running any software reset.',
  },
];

export const RESET_STEPS: ResetStep[] = [
  {
    number: '01.',
    title: 'Connect via Direct USB Cable',
    detail:
      'Connect your Epson printer directly to a Windows 7, 10, or 11 PC with a USB cable. Adjustment Programs cannot reset counters over Wi-Fi or shared network printers.',
  },
  {
    number: '02.',
    title: 'Pause Antivirus & Extract Archive',
    detail:
      'Temporarily pause Windows Defender Real-time protection (or whitelist the folder) so AdjProg.exe is not quarantined, then extract the .zip or .rar package with WinRAR.',
    caution: 'Re-enable antivirus protection immediately after your printer counter is cleared.',
  },
  {
    number: '03.',
    title: 'Launch AdjProg as Administrator',
    detail:
      'Open the extracted folder, right-click AdjProg.exe, and choose Run as Administrator. Accept the service agreement prompt if displayed.',
  },
  {
    number: '04.',
    title: 'Select Model Name & USB Port',
    detail:
      'Click Select at the top right, choose your exact Epson model (e.g., L3210 or L3110), and select the active USB port (such as USB001) instead of Auto if multiple printers are installed.',
  },
  {
    number: '05.',
    title: 'Check & Initialize Waste Ink Counter',
    detail:
      'Open Particular Adjustment Mode -> Waste Ink Pad Counter -> click OK. Tick the Main pad counter checkbox, click Check to read the current percentage, then click Initialize.',
  },
  {
    number: '06.',
    title: 'Power Cycle the Printer',
    detail:
      'When the confirmation dialog appears ("Please turn off the printer"), press the printer power button to shut it down completely, wait 10 seconds, and turn it back on. The red lights will clear.',
  },
];

export const PRE_RESET_CHECKLIST = [
  { id: 'usb', label: 'Printer connected directly to Windows PC via USB cable (not Wi-Fi)' },
  { id: 'queue', label: 'All pending documents cancelled in the Windows print queue' },
  { id: 'av', label: 'Windows Defender / Antivirus temporarily paused or folder excluded' },
  { id: 'driver', label: 'Official Epson driver installed and printer powered on' },
];
