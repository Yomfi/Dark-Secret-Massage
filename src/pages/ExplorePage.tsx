import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ExploreFilters } from '../components/marketplace/ExploreFilters';
import { MarketplaceProfileCard } from '../components/marketplace/MarketplaceProfileCard';
import { findCityBySlug } from '../data/locations';
import {
  fetchMarketplaceProfiles,
  type MarketplaceProfile,
} from '../data/marketplaceProfiles';
import {
  buildExploreSearchParams,
  filterAndSortProfiles,
  parseExploreSearchParams,
  type MarketplaceFilters,
} from '../lib/marketplace';
import { useAuth } from '../auth/AuthContext';
import { Container } from '../components/ui/Layout';
import { Button, buttonClass } from '../components/ui/Button';

export const ExplorePage: React.FC = () => {
  const { citySlug = 'accra' } = useParams<{ citySlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const city = findCityBySlug(citySlug);
  const filters = useMemo(() => parseExploreSearchParams(searchParams), [searchParams]);

  const [profiles, setProfiles] = useState<MarketplaceProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProfiles(null);
    setError(null);
    fetchMarketplaceProfiles()
      .then((list) => {
        if (!cancelled) setProfiles(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load providers.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cityProfiles = useMemo(
    () =>
      (profiles ?? []).filter(
        (p) =>
          p.citySlug === citySlug.toLowerCase() ||
          p.city.toLowerCase().replace(/\s+/g, '-') === citySlug.toLowerCase(),
      ),
    [profiles, citySlug],
  );
  const results = useMemo(() => filterAndSortProfiles(cityProfiles, filters), [cityProfiles, filters]);

  useEffect(() => {
    const cityName = city?.name || citySlug;
    const title = filters.service
      ? `${filters.service} in ${cityName} | Massager Studio`
      : `Massage Professionals in ${cityName} | Massager Studio`;
    document.title = title;
  }, [city, citySlug, filters.service]);

  const updateFilters = (next: MarketplaceFilters) => {
    setSearchParams(buildExploreSearchParams(next), { replace: true });
  };

  const onCityChange = (slug: string) => {
    const qs = buildExploreSearchParams(filters).toString();
    navigate(qs ? `/explore/${slug}?${qs}` : `/explore/${slug}`);
  };

  return (
    <div className="min-h-screen bg-brand-surface text-zinc-200">
      <Navbar
        onOpenBooking={() => navigate('/book-massage')}
        onOpenDashboard={() => navigate(isAuthenticated ? '/account' : '/login?redirect=/account')}
        isAuthenticated={isAuthenticated}
      />

      <main className="pb-16 pt-24 sm:pt-28">
        <Container>
          <header className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold-light">
              Explore
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-3xl">
              Massage professionals in {city?.name || citySlug}
            </h1>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-zinc-400">
              Every profile below has completed identity review and been approved for publication.
            </p>
            <p className="mt-3 text-[12.5px] text-zinc-500">
              {profiles === null ? 'Loading providers…' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
              {filters.providerType && filters.providerType !== 'all' ? ` · ${filters.providerType}` : ''}
              {filters.service ? ` · ${filters.service}` : ''}
              {filters.gender && filters.gender !== 'all' ? ` · ${filters.gender}` : ''}
            </p>
          </header>

          <ExploreFilters
            citySlug={citySlug}
            filters={filters}
            onChange={updateFilters}
            onCityChange={onCityChange}
          />

          <div className="mt-6">
            {error ? (
              <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-10 text-center">
                <p className="text-[15px] font-semibold text-white">We could not load providers</p>
                <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-red-100/80">{error}</p>
                <Button variant="secondary" className="mt-5" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              </div>
            ) : profiles === null ? (
              <div className="space-y-3.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
                <p className="text-[15px] font-semibold text-white">
                  {cityProfiles.length === 0
                    ? `No approved providers in ${city?.name || citySlug} yet`
                    : 'No providers match these filters'}
                </p>
                <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-zinc-400">
                  {cityProfiles.length === 0
                    ? 'Profiles appear here once identity review and admin approval are complete. Check another city in the meantime.'
                    : 'Try another service, clear the price range, or widen your filters.'}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                  <Button variant="secondary" onClick={() => updateFilters({ sort: 'recommended' })}>
                    Clear filters
                  </Button>
                  <Link to="/explore/accra" className={buttonClass({})}>
                    Browse Accra
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {results.map((profile, i) => (
                  <MarketplaceProfileCard key={profile.id} profile={profile} index={i} />
                ))}
              </div>
            )}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};
