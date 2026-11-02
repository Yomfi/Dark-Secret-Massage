import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { MassageHero } from '../components/massage/MassageHero';
import { MassageServiceGrid } from '../components/massage/MassageServiceGrid';
import { MassageServiceDetails } from '../components/massage/MassageServiceDetails';
import { MassageHowItWorks } from '../components/massage/MassageHowItWorks';
import { MassageTrustStrip } from '../components/massage/MassageTrustStrip';
import { MassageFinalCTA } from '../components/massage/MassageFinalCTA';
import { Container } from '../components/ui/Layout';
import { buttonClass } from '../components/ui/Button';
import { buildMassagePresentations } from '../lib/massageServicePresentation';
import { mapCmsService, usePublicCatalogue } from '../lib/cmsCatalogue';
import { useSite } from '../components/PublicSite';

export const MassagePage: React.FC = () => {
  const { services, loading } = usePublicCatalogue();
  const { faqs } = useSite();
  // Rebuild from the CMS-backed registry once the catalogue resolves.
  const items = useMemo(
    () => buildMassagePresentations(services.map(mapCmsService)),
    [services]
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? items.find((item) => item.service.id === selectedId) ?? null
    : null;

  const scrollToServices = () => {
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-brand-surface text-zinc-200">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-brand-surface/90 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg"
            aria-label="Massager Studio home"
          >
            <BrandLogo variant="plate" withWordmark markHeight={26} />
          </Link>
          <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Primary">
            <a
              href="#services"
              onClick={(e) => {
                e.preventDefault();
                scrollToServices();
              }}
              className="hidden h-11 items-center rounded-lg px-3 text-[13.5px] font-medium text-zinc-400 transition-colors hover:text-white sm:inline-flex"
            >
              Services
            </a>
            <Link
              to="/book-massage"
              className={buttonClass({ size: 'sm' }) + ' whitespace-nowrap'}
            >
              Book A Massage
            </Link>
          </nav>
        </Container>
      </header>

      <main>
        <MassageHero onViewServices={scrollToServices} />
        <MassageServiceGrid items={items} loading={loading} onViewDetails={setSelectedId} />
        <MassageHowItWorks />
        <FaqSection faqs={faqs} />
        <MassageTrustStrip />
        <MassageFinalCTA />
      </main>

      <footer className="border-t border-white/[0.07]">
        <Container className="flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
          <BrandLogo variant="plate" withWordmark markHeight={22} compact />
          <p className="text-[13px] text-zinc-500">
            © {new Date().getFullYear()} Massager Studio · Accra, Ghana
          </p>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center text-[13px] font-medium text-zinc-400 transition-colors hover:text-white"
          >
            Back to home
          </Link>
        </Container>
      </footer>

      <MassageServiceDetails item={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
};

/** FAQs published from the admin CMS. Nothing renders when none are active. */
function FaqSection({ faqs }: { faqs: Array<{ id: string; question: string; answer: string }> }) {
  if (faqs.length === 0) return null;
  return (
    <section id="faqs" className="border-t border-white/[0.07]">
      <Container className="py-14 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Questions clients ask
        </h2>
        <dl className="mt-8 divide-y divide-white/[0.07]">
          {faqs.map((faq) => (
            <div key={faq.id} className="py-5">
              <dt className="text-base font-semibold text-white">{faq.question}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-zinc-400">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
