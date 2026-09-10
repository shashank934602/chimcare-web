import './globals.css';
import { Sprite } from '@/components/chrome/Sprite';
import { Header } from '@/components/chrome/Header';
import { Footer } from '@/components/chrome/Footer';
import { StickyBar } from '@/components/chrome/StickyBar';
import { Reveal } from '@/components/islands/Reveal';
import { getStates } from '@/lib/data/states';

const NATIONAL_PHONE = '1-800-362-4840';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const states = await getStates();
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Sprite />
        <Header phone={NATIONAL_PHONE} phoneHref="tel:18003624840" />
        {children}
        <Footer states={states} />
        <StickyBar phoneHref="tel:18003624840" />
        <Reveal />
      </body>
    </html>
  );
}
