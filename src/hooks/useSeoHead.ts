import { useEffect } from 'react';
import {
  ANYDESK_RESET_PRICE_KSH,
  RESETTER_PRICE_KSH,
  TOTAL_SUPPORTED_MODELS,
  type ResetterPackage,
} from '../data/epsonResetters';

const DEFAULT_TITLE = 'Epson Resetters – Working AdjProg (KSh 300) & Remote Reset';
const DEFAULT_DESCRIPTION = `Download 100% working Epson Adjustment Program (AdjProg) resetters for L3210, L3110, L3250, L805 & ${TOTAL_SUPPORTED_MODELS}+ models at KSh ${RESETTER_PRICE_KSH}, or book AnyDesk remote reset at KSh ${ANYDESK_RESET_PRICE_KSH}.`;

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertDynamicModelJsonLd(schema: Record<string, unknown> | null) {
  const id = 'dynamic-model-jsonld';
  const existing = document.getElementById(id);
  if (!schema) {
    if (existing) existing.remove();
    return;
  }
  let script = existing as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schema);
}

export function useSeoHead(activeModelQuery: string, allResetters: ResetterPackage[] = []) {
  useEffect(() => {
    const cleanModel = activeModelQuery.trim().toUpperCase().replace(/^EPSON\s+/, '');
    const isSpecificModel = /^[A-Z0-9-]{3,12}$/.test(cleanModel);

    const matchedPkg = isSpecificModel
      ? allResetters.find((pkg) =>
          pkg.allSupportedModels.some((m) => m.toUpperCase() === cleanModel)
        )
      : undefined;

    const price = matchedPkg?.priceKsh ?? RESETTER_PRICE_KSH;
    const remotePrice = matchedPkg?.remoteResetKsh ?? ANYDESK_RESET_PRICE_KSH;

    const title = isSpecificModel
      ? `Epson ${cleanModel} Resetter (AdjProg) – KSh ${price} Instant Download`
      : DEFAULT_TITLE;

    const description = isSpecificModel
      ? `Reset Epson ${cleanModel} waste ink pad counter and Service Required blinking red lights back to 0%. Download verified AdjProg + PDF guide for KSh ${price} or book AnyDesk remote reset for KSh ${remotePrice}.`
      : DEFAULT_DESCRIPTION;

    const baseUrl = window.location.origin + window.location.pathname;
    const canonicalUrl = isSpecificModel
      ? `${baseUrl}?model=${encodeURIComponent(cleanModel)}`
      : baseUrl;

    document.title = title;
    upsertCanonical(canonicalUrl);
    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);

    if (isSpecificModel) {
      upsertDynamicModelJsonLd({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'SoftwareApplication',
            name: `Epson ${cleanModel} Adjustment Program (AdjProg) Resetter`,
            applicationCategory: 'UtilitiesApplication',
            operatingSystem: matchedPkg?.osSupport || 'Windows 7, Windows 10, Windows 11',
            fileSize: matchedPkg?.fileSize || '3.8 MB',
            url: canonicalUrl,
            description,
            offers: {
              '@type': 'Offer',
              price: String(price),
              priceCurrency: 'KES',
              availability: 'https://schema.org/InStock',
              url: canonicalUrl,
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Epson Resetters Catalog',
                item: baseUrl,
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: `Epson ${cleanModel} Resetter`,
                item: canonicalUrl,
              },
            ],
          },
        ],
      });
    } else {
      upsertDynamicModelJsonLd(null);
    }
  }, [activeModelQuery, allResetters]);
}
