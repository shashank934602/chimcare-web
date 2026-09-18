/**
 * The saved WordPress nav's "About Us", "Contact Us" and "Services" items (desktop and mobile
 * copies both carry the same menu-item id — 337194, 337197 and 337191) still point at the old live
 * site — absolute URLs the export captured as-is, not routes this app can serve. HOME_HTML
 * (app/_home/content.ts) is generated and never hand-edited, so the fix is a literal string swap at
 * render time, the same pattern app/_home/hero.ts uses for the hero splice.
 */
const LEGACY_ABOUT_HREF = 'https://www.chimcare.com/about-us/';
const INTERNAL_ABOUT_HREF = '/about-us/';
const LEGACY_CONTACT_HREF = 'https://www.chimcare.com/contact-us-v1/';
const INTERNAL_CONTACT_HREF = '/contact-us/';
const LEGACY_SERVICES_HREF = 'https://www.chimcare.com/chimcare-services/';
const INTERNAL_SERVICES_HREF = '/chimcare-services/';

export function withInternalAboutLink(html: string): string {
  return html.split(LEGACY_ABOUT_HREF).join(INTERNAL_ABOUT_HREF);
}

export function withInternalContactLink(html: string): string {
  return html.split(LEGACY_CONTACT_HREF).join(INTERNAL_CONTACT_HREF);
}

export function withInternalServicesLink(html: string): string {
  return html.split(LEGACY_SERVICES_HREF).join(INTERNAL_SERVICES_HREF);
}
