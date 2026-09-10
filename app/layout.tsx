import './globals.css';
import { Sprite } from '@/components/chrome/Sprite';
import { Header } from '@/components/chrome/Header';
import { Footer } from '@/components/chrome/Footer';
import { StickyBar } from '@/components/chrome/StickyBar';
import { Reveal } from '@/components/islands/Reveal';
import { getStates } from '@/lib/data/states';
import { DESIGN } from '@/lib/content/design-assets';

const NATIONAL_PHONE = '1-800-362-4840';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const states = await getStates();
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Sprite />
        {/* One header for every template. The BBB badge renders only because the real approved asset
            exists in the design mocks; with no asset it is omitted, never drawn. */}
        <Header
          phone={NATIONAL_PHONE}
          phoneHref="tel:18003624840"
          bbb={DESIGN.bbbBadge ?? undefined}
          bookLabel="fast-online-booking"
        />
        {children}
        <Footer states={states} />
        <StickyBar phoneHref="tel:18003624840" />
        <Reveal />
      </body>
    </html>
  );
}
