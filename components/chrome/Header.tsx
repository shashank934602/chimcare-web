import { Icon } from './Icon';
import { HeaderMenu } from '@/components/islands/HeaderMenu';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '#' },
  { label: 'Locations', href: '/locations/' },
  { label: 'About Us', href: '#' },
  { label: 'Contact', href: '#' },
];

export function Header({ phone, phoneHref, current = 'Locations' }: { phone: string; phoneHref: string; current?: string }) {
  return (
    <header className="hdr" id="hdr">
      <div className="wrap">
        <a className="logo" href="/">
          <span className="sr-only">Chimcare home</span>
          <img src="/img/logo.svg" alt="Chimcare" width={202} height={62} />
        </a>
        <div className="hdr-menu" id="hdr-menu">
          <nav className="nav" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.label} href={n.href} aria-current={n.label === current ? 'page' : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <a className="phone" href={phoneHref}>
            <Icon name="phone" />
            {phone}
          </a>
        </div>
        <a className="btn btn-primary" href="#booking" data-book>
          Schedule Service
        </a>
        <HeaderMenu />
      </div>
    </header>
  );
}
