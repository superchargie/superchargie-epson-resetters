import { useEffect } from 'react';
import { ANYDESK_RESET_PRICE_KSH, RESETTER_PRICE_KSH } from '../data/epsonResetters';

const DEFAULT_TITLE = 'Epson Resetters – Working AdjProg (KSh 300) & Remote Reset';
const DEFAULT_DESCRIPTION = `Download 100% working Epson Adjustment Program (AdjProg) resetters for L3210, L3110, L3250, L805 & 85+ models at KSh ${RESETTER_PRICE_KSH}, or book AnyDesk remote reset at KSh ${ANYDESK_RESET_PRICE_KSH}.`;

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

export function useSeoHead(activeModelQuery: string) {
  useEffect(() => {
    const cleanModel = activeModelQuery.trim().toUpperCase().replace(/^EPSON\s+/, '');
    const isSpecificModel = /^[A-Z0-9-]{3,10}$/.test(cleanModel);

    const title = isSpecificModel
      ? `Epson ${cleanModel} Resetter (AdjProg) – KSh ${RESETTER_PRICE_KSH} Download`
      : DEFAULT_TITLE;

    const description = isSpecificModel
      ? `Reset Epson ${cleanModel} waste ink pad counter and Service Required red lights back to 0%. Download verified AdjProg for KSh ${RESETTER_PRICE_KSH} or AnyDesk remote reset for KSh ${ANYDESK_RESET_PRICE_KSH}.`
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
  }, [activeModelQuery]);
}
