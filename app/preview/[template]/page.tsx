import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NationalHub } from '@/components/templates/NationalHub';
import { StateHub } from '@/components/templates/StateHub';
import { CityPage } from '@/components/templates/CityPage';
import { ServicePage } from '@/components/templates/ServicePage';
import { LegacyPage } from '@/components/templates/LegacyPage';
import {
  FIXTURE_BANNER,
  cityPageFixture,
  legacyPageFixture,
  nationalHubFixture,
  servicePageFixture,
  stateHubFixture,
} from '@/lib/fixtures/templates';

/**
 * Template preview — the harness for the template foundation.
 *
 * Renders each of the five templates from fixture data so structure, responsive behaviour and
 * interactions can be checked before any real content is migrated. This is development scaffolding:
 *
 *   · it refuses to run when NODE_ENV is production, so it cannot be reached on a deployed site;
 *   · every page it renders is noindex, nofollow;
 *   · every page carries a visible banner saying the content is fixture data;
 *   · it reads only `lib/fixtures/templates.ts` and never touches the database.
 */
export const dynamic = 'force-dynamic';

const TEMPLATES = ['national', 'state', 'city', 'service', 'legacy'] as const;
type Name = (typeof TEMPLATES)[number];

export function generateStaticParams() {
  return TEMPLATES.map((template) => ({ template }));
}

export const metadata: Metadata = {
  title: 'Template preview (fixture data)',
  robots: { index: false, follow: false },
};

export default async function Preview({ params }: { params: Promise<{ template: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { template } = await params;
  if (!TEMPLATES.includes(template as Name)) notFound();

  return (
    <>
      <p
        data-fixture-banner
        style={{
          margin: 0,
          padding: '10px 16px',
          background: '#8A1A12',
          color: '#fff',
          font: '700 13px/1.4 system-ui, sans-serif',
          textAlign: 'center',
          position: 'relative',
          zIndex: 60,
        }}
      >
        {FIXTURE_BANNER} Template: <code>{template}</code>
      </p>
      {template === 'national' && <NationalHub {...nationalHubFixture} />}
      {template === 'state' && <StateHub {...stateHubFixture} query="" />}
      {template === 'city' && <CityPage {...cityPageFixture} />}
      {template === 'service' && <ServicePage {...servicePageFixture} />}
      {template === 'legacy' && <LegacyPage {...legacyPageFixture} />}
    </>
  );
}
