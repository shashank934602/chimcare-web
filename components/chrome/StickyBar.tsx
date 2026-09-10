import { Icon } from './Icon';

/** Mobile-only sticky Call / Book bar (CSS hides it on desktop). */
export function StickyBar({ phoneHref }: { phoneHref: string }) {
  return (
    <div className="sfoot" id="sfoot" aria-label="Call or book service">
      <a className="sfoot-btn sfoot-call" href={phoneHref}>
        <Icon name="phone" />Call Now
      </a>
      <a className="sfoot-btn sfoot-book" href="#booking" data-book-sheet>
        <Icon name="cal" />Book Online
      </a>
    </div>
  );
}
