/**
 * Parses a Chimcare location page's WordPress body into the sections it actually contains.
 *
 * Every location URL on the site is one shape — a service in a city — but their bodies were written
 * in three different outlines over the years, and all three are still live. Measured on a random
 * cross-state sample (MA, IL, WI, WA, OR, OH):
 *
 *   A · service in city, the majority
 *        lead · Why {service} Is Important in {city} · Our {service} Process in {city}
 *        Why Choose Us for {service} in {city} · Areas We Serve Around {city} · FAQs
 *        Book Your {service} in {city}
 *
 *   B · city hub, the branch pages, and what the approved Spokane mock was drawn from
 *        lead · Why {city} Homeowners Trust Chimcare
 *        Our Full-Service Chimney, Fireplace & Vent Solutions in {city}   (the service directory)
 *        Your {city} Fireplace Experts · Serving Nearby Areas · FAQ
 *
 *   C · short legacy, the oldest Oregon and Washington pages
 *        About Chimcare Chimney Sweep {city} · lead · Services: · What Makes Us Different:
 *
 * The three are read into the same slots, so one template renders all of them and each page shows
 * only the sections its own body has.
 *
 * A page that does not have a section simply does not get one. Nothing is written here, nothing is
 * reworded, and no section is filled from another page. `sectionsFound` reports what was there, so a
 * template can render only what the source supports and a report can say what was missing.
 *
 * Pure and side-effect free: the same body always parses to the same result, and the stored content
 * is never modified. Shortcode stripping happens on a copy, at the parse boundary.
 */

export type ProcessStep = { title: string; body: string };
export type SourceFaq = { question: string; answer: string };

export type SourceSections = {
  /** The heading WordPress gives the page, when the body opens with one. */
  heading: string | null;
  /** The opening paragraph, before any section heading. */
  lead: string | null;
  /**
   * The same opening prose, still split the way the body wrote it. `lead` joins it into one string
   * for the hero lede; the introduction renders these, so a source that wrote two paragraphs keeps
   * two paragraphs in the copy column — which is what the approved mock shows.
   */
  leadParagraphs: string[];
  whyImportant: { heading: string; paragraphs: string[] } | null;
  /** Outline B's trust band: "Why {city} Homeowners Trust Chimcare". */
  whyTrust: { heading: string; paragraphs: string[] } | null;
  /** Outline B's service directory, and outline C's plain "Services:" list. */
  serviceDirectory: { heading: string; paragraphs: string[]; items: string[] } | null;
  /** Outline B's "Your {city} Fireplace Experts" lede, which introduces the areas. */
  localExperts: { heading: string; paragraphs: string[] } | null;
  process: { heading: string; steps: ProcessStep[]; paragraphs: string[] } | null;
  whyChooseUs: { heading: string; paragraphs: string[]; bullets: string[] } | null;
  areas: { heading: string; list: string[] } | null;
  faqs: { heading: string; items: SourceFaq[] } | null;
  bookCta: { heading: string; paragraphs: string[] } | null;
  /** Headings the outline above does not account for, kept so nothing is silently dropped. */
  otherSections: Array<{ heading: string; paragraphs: string[] }>;
  /** Which of the named sections were present. */
  sectionsFound: string[];
};

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'",
  '&nbsp;': ' ', '&#8217;': '’', '&#8216;': '‘', '&#8220;': '“', '&#8221;': '”',
  '&#8211;': '–', '&#8212;': '—', '&#8230;': '…', '&rsquo;': '’', '&ldquo;': '“', '&rdquo;': '”',
};

const decode = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|nbsp|#0?39|#8217|#8216|#8220|#8221|#8211|#8212|#8230|rsquo|ldquo|rdquo);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

const text = (s: string) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Shortcodes are stripped on a copy so the outline can be seen. The stored body is untouched. */
const stripShortcodes = (s: string) => s.replace(/\[\/?[a-zA-Z][a-zA-Z0-9_-]*(?:\s[^\]]*)?\]/g, ' ');

function paragraphsIn(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = text(m[1]);
    if (t.length > 2) out.push(t);
  }
  // Some pages set their prose in styled spans rather than paragraphs.
  if (!out.length) {
    for (const m of html.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)) {
      const t = text(m[1]);
      if (t.length > 40) out.push(t);
    }
  }
  if (!out.length) {
    const t = text(html);
    if (t.length > 2) out.push(t);
  }
  return out;
}

function listIn(html: string): string[] {
  return [...html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => text(m[1])).filter(Boolean);
}

/** "Inspection: We start with…" → a titled step. Without a colon the whole line is the body. */
function stepsFrom(items: string[]): ProcessStep[] {
  return items.map((raw) => {
    const m = /^([^:]{2,60}):\s*(.+)$/s.exec(raw);
    return m ? { title: m[1].trim(), body: m[2].trim() } : { title: '', body: raw };
  });
}

/**
 * FAQ answers survive the export but the questions live in shortcode attributes, so where a body
 * still carries them the question is read from the `title` attribute of its accordion section.
 */
function faqsFrom(rawSection: string, originalBody: string): SourceFaq[] {
  const out: SourceFaq[] = [];
  for (const m of originalBody.matchAll(/\[vc_tta_section[^\]]*title="([^"]+)"[^\]]*\]([\s\S]*?)\[\/vc_tta_section\]/gi)) {
    const q = decode(m[1]).trim();
    const a = text(m[2]);
    if (q && a) out.push({ question: q, answer: a });
  }
  if (out.length) return out;
  // No accordion markup: pair headings with the prose that follows them.
  for (const m of rawSection.matchAll(/<h[34][^>]*>([\s\S]*?)<\/h[34]>([\s\S]*?)(?=<h[34]|$)/gi)) {
    const q = text(m[1]);
    const a = paragraphsIn(m[2]).join(' ');
    if (q && a) out.push({ question: q, answer: a });
  }
  return out;
}

// Order matters: the first rule that matches a heading wins, so the more specific ones come first.
const RULES: Array<{ key: keyof SourceSections; test: RegExp }> = [
  // Outline B — the trust band and the service directory
  { key: 'whyTrust', test: /^why\b.*\bhomeowners?\b.*\b(trust|choose)\b|^why\b.*\b(trust|choose)\s+chimcare\b/i },
  { key: 'serviceDirectory', test: /^our\s+full[-\s]service\b|full[-\s]service\s+chimney|^services:?\s*$|^our\s+services\b/i },
  { key: 'localExperts', test: /\bexperts?\s*$|^your\b.*\bexperts?\b/i },
  // Outline A
  { key: 'whyImportant', test: /^why\b.*\bimportant\b/i },
  { key: 'process', test: /^our\b.*\bprocess\b|^the\s+process\b|\bprocess\s+in\b/i },
  { key: 'whyChooseUs', test: /^why\s+choose\b|^what\s+makes\s+us\s+different/i },
  { key: 'areas', test: /^areas\s+we\s+serve\b|^service\s+areas?\b|^areas\s+served\b|^serving\s+nearby\b|^nearby\s+areas\b/i },
  { key: 'faqs', test: /\bfaqs?\b|^frequently\s+asked/i },
  { key: 'bookCta', test: /^book\b|^schedule\b|^get\s+started\b|^contact\s+us\b|^ready\s+to\b/i },
];

export function parseSourceSections(postContent: string): SourceSections {
  const body = stripShortcodes(postContent);
  const parts = body.split(/(<h2\b[^>]*>[\s\S]*?<\/h2>)/i);

  const result: SourceSections = {
    heading: null, lead: null, leadParagraphs: [], whyImportant: null, whyTrust: null, serviceDirectory: null,
    localExperts: null, process: null, whyChooseUs: null, areas: null, faqs: null, bookCta: null,
    otherSections: [], sectionsFound: [],
  };

  const leadParas = paragraphsIn(parts[0] ?? '');
  // The body often opens with the page's own <h2> title before any prose.
  const firstHeading = /<h2\b[^>]*>([\s\S]*?)<\/h2>/i.exec(parts[1] ?? '');
  if (firstHeading) {
    const h = text(firstHeading[1]);
    if (!RULES.some((r) => r.test.test(h))) result.heading = h;
  }
  if (leadParas.length) {
    result.lead = leadParas.join(' ');
    result.leadParagraphs = leadParas;
  }

  for (let i = 1; i < parts.length; i += 2) {
    const heading = text(parts[i]);
    const section = parts[i + 1] ?? '';
    if (!heading) continue;
    if (result.heading === heading) {
      // The title heading: its prose is the lead when the body had none before it.
      const p = paragraphsIn(section);
      if (!result.lead && p.length) {
        result.lead = p.join(' ');
        result.leadParagraphs = p;
      }
      continue;
    }

    const rule = RULES.find((r) => r.test.test(heading));
    if (!rule) {
      const paragraphs = paragraphsIn(section);
      if (paragraphs.length) result.otherSections.push({ heading, paragraphs });
      continue;
    }

    switch (rule.key) {
      case 'whyImportant':
        result.whyImportant = { heading, paragraphs: paragraphsIn(section) };
        break;
      case 'whyTrust':
        result.whyTrust = { heading, paragraphs: paragraphsIn(section) };
        break;
      case 'serviceDirectory': {
        const items = listIn(section);
        // The directory's own <h3> per service, where it has them.
        const subs = [...section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) => text(m[1])).filter(Boolean);
        result.serviceDirectory = { heading, paragraphs: paragraphsIn(section), items: subs.length ? subs : items };
        break;
      }
      case 'localExperts':
        result.localExperts = { heading, paragraphs: paragraphsIn(section) };
        break;
      case 'process': {
        const items = listIn(section);
        result.process = { heading, steps: stepsFrom(items), paragraphs: items.length ? [] : paragraphsIn(section) };
        break;
      }
      case 'whyChooseUs':
        result.whyChooseUs = { heading, paragraphs: paragraphsIn(section), bullets: listIn(section) };
        break;
      case 'areas': {
        const list = listIn(section);
        result.areas = { heading, list: list.length ? list : paragraphsIn(section).flatMap((p) => p.split(/\s{2,}|·|,\s/)).map((s) => s.trim()).filter(Boolean) };
        break;
      }
      case 'faqs':
        result.faqs = { heading, items: faqsFrom(section, postContent) };
        break;
      case 'bookCta':
        result.bookCta = { heading, paragraphs: paragraphsIn(section) };
        break;
    }
    if (!result.sectionsFound.includes(rule.key)) result.sectionsFound.push(rule.key);
  }

  if (result.lead) result.sectionsFound.unshift('lead');
  return result;
}
