interface VercelReq {
  method?: string;
}

interface VercelRes {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelRes;
  send: (body: string) => void;
}

const BASE_URL = 'https://resetepson.mwashcyber.co.ke';
const LASTMOD = '2026-11-19';

const MODEL_PRIORITY_LIST: { model: string; priority: string }[] = [
  { model: 'L3210', priority: '0.95' },
  { model: 'L3250', priority: '0.95' },
  { model: 'L3110', priority: '0.95' },
  { model: 'L3150', priority: '0.95' },
  { model: 'L805', priority: '0.95' },
  { model: 'L1800', priority: '0.95' },
  { model: 'L3251', priority: '0.9' },
  { model: 'L3256', priority: '0.9' },
  { model: 'L3260', priority: '0.9' },
  { model: 'L1210', priority: '0.9' },
  { model: 'L1250', priority: '0.9' },
  { model: 'L1110', priority: '0.9' },
  { model: 'L3100', priority: '0.85' },
  { model: 'L3101', priority: '0.85' },
  { model: 'L3151', priority: '0.85' },
  { model: 'L5190', priority: '0.9' },
  { model: 'L5290', priority: '0.9' },
  { model: 'L4150', priority: '0.85' },
  { model: 'L4160', priority: '0.85' },
  { model: 'L4260', priority: '0.85' },
  { model: 'L6160', priority: '0.85' },
  { model: 'L6170', priority: '0.85' },
  { model: 'L6190', priority: '0.85' },
  { model: 'L6270', priority: '0.85' },
  { model: 'L800', priority: '0.85' },
  { model: 'L850', priority: '0.85' },
  { model: 'L8050', priority: '0.9' },
  { model: 'L18050', priority: '0.9' },
  { model: 'L1300', priority: '0.85' },
  { model: 'L1455', priority: '0.85' },
  { model: 'L14150', priority: '0.85' },
  { model: 'L15150', priority: '0.85' },
  { model: 'L120', priority: '0.8' },
  { model: 'L210', priority: '0.8' },
  { model: 'L220', priority: '0.8' },
  { model: 'L360', priority: '0.8' },
  { model: 'L380', priority: '0.8' },
  { model: 'L486', priority: '0.8' },
  { model: 'M100', priority: '0.85' },
  { model: 'M105', priority: '0.85' },
  { model: 'M200', priority: '0.85' },
  { model: 'M1100', priority: '0.85' },
  { model: 'M1120', priority: '0.85' },
  { model: 'M2140', priority: '0.85' },
  { model: 'M2170', priority: '0.85' },
  { model: 'M3170', priority: '0.85' },
  { model: 'ET-2710', priority: '0.85' },
  { model: 'ET-2720', priority: '0.85' },
  { model: 'ET-2750', priority: '0.85' },
  { model: 'ET-2810', priority: '0.85' },
  { model: 'ET-2850', priority: '0.85' },
  { model: 'WF-2860', priority: '0.8' },
  { model: 'XP-2100', priority: '0.8' },
  { model: 'T60', priority: '0.8' },
  { model: 'R290', priority: '0.8' },
];

export default function handler(_req: VercelReq, res: VercelRes) {
  const urls = [
    `  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
    ...MODEL_PRIORITY_LIST.map(
      ({ model, priority }) =>
        `  <url>
    <loc>${BASE_URL}/?model=${encodeURIComponent(model)}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`
    ),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
