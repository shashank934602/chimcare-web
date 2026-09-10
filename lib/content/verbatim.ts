/**
 * Render-time cleanup for legacy WordPress content.
 *
 * THE SOURCE IS IMMUTABLE. Nothing in this file writes anywhere. It takes the raw `post_content`
 * exactly as WordPress holds it and returns a string safe to put in the DOM. The stored row is never
 * altered, so a cleanup rule can be changed and every page re-renders differently without any
 * migration, and the original is always recoverable.
 *
 * Every transformation is listed in `TRANSFORMS` and reported by `cleanVerbatim`, so a page can show
 * — and the migration can log — exactly what was done to the markup it displays. A transformation
 * that is not in that list does not happen.
 *
 * What this does NOT do: rewrite copy, fix grammar, add or remove a heading, insert a FAQ, generate
 * a meta description, change a link target, re-encode an image, or add structured data. Those would
 * be authoring, and a legacy page is published verbatim or not at all.
 */

export type VerbatimTransform = {
  id: string;
  /** What was wrong in the source. */
  defect: string;
  /** What is done at render time, and nothing more. */
  action: string;
  count: number;
};

export type VerbatimResult = {
  html: string;
  transforms: VerbatimTransform[];
  /** True when the source was already clean and the output is byte-identical to the input. */
  unchanged: boolean;
};

/** Tags that never survive into a rendered legacy page, whatever the source says. */
const STRIP_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta', 'base'];

type Rule = {
  id: string;
  defect: string;
  action: string;
  apply: (html: string) => { html: string; count: number };
};

const countReplace = (html: string, re: RegExp, to: string) => {
  let count = 0;
  const out = html.replace(re, () => {
    count++;
    return to;
  });
  return { html: out, count };
};

const RULES: Rule[] = [
  {
    id: 'wpbakery_unclosed_shortcode',
    defect:
      'WPBakery closing markup left in the post body as literal text — the audit counted 33,740 live pages carrying it (ISSUE-011).',
    action: 'The stray shortcode token is not printed. Its inner content, which is the page copy, is left untouched.',
    apply: (html) => countReplace(html, /\[\/?vc_[a-z_]*(?:\s[^\]]*)?\]/gi, ''),
  },
  {
    id: 'orphan_shortcode',
    defect: 'Any other shortcode whose plugin no longer runs, so WordPress emits it as literal text.',
    action: 'The bracketed token is not printed. Nothing is substituted for what the plugin would have rendered.',
    apply: (html) => countReplace(html, /\[(?!\/?vc_)[a-z][a-z0-9_-]*(?:\s[^\]]*)?\]/gi, ''),
  },
  {
    id: 'script_and_frame_tags',
    defect: 'Executable or embedding markup inside stored post content.',
    action: 'The element and its contents are dropped. A legacy page renders source text, never source code.',
    apply: (html) => {
      let count = 0;
      let out = html;
      for (const tag of STRIP_TAGS) {
        const paired = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
        const single = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
        out = out.replace(paired, () => { count++; return ''; });
        out = out.replace(single, () => { count++; return ''; });
      }
      return { html: out, count };
    },
  },
  {
    id: 'inline_event_handler',
    defect: 'An `on*` attribute stored in the post body.',
    action: 'The attribute is dropped. The element and its text are kept.',
    apply: (html) => countReplace(html, /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ''),
  },
  {
    id: 'javascript_url',
    defect: 'A `javascript:` URL in an href or src.',
    action: 'The URL is neutralised to `#`. The link text is kept exactly as written.',
    apply: (html) => countReplace(html, /(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"'),
  },
  {
    id: 'empty_paragraph',
    defect: 'Paragraphs left empty once a shortcode that filled them was removed.',
    action: 'The empty paragraph is not printed. No paragraph containing text is touched.',
    apply: (html) => countReplace(html, /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, ''),
  },
];

/**
 * Clean one legacy body for display. Pure: same input, same output, no I/O.
 *
 * The returned `transforms` list carries only the rules that actually fired, each with its count, so
 * the caller can render a provenance note and the migration can record what a page needed.
 */
export function cleanVerbatim(raw: string): VerbatimResult {
  let html = raw;
  const transforms: VerbatimTransform[] = [];
  for (const rule of RULES) {
    const { html: next, count } = rule.apply(html);
    if (count > 0) transforms.push({ id: rule.id, defect: rule.defect, action: rule.action, count });
    html = next;
  }
  return { html, transforms, unchanged: html === raw };
}

/** Every rule this module can apply, for documentation and for the admin's transformation report. */
export const VERBATIM_RULES = RULES.map(({ id, defect, action }) => ({ id, defect, action }));
