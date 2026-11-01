import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ExploreFilters } from '../components/marketplace/ExploreFilters';
import { MarketplaceProfileCard } from '../components/marketplace/MarketplaceProfileCard';
import { findCityBySlug } from '../data/locations';
import { profilesForCity } from '../data/marketplaceProfiles';
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

  const cityProfiles = useMemo(() => profilesForCity(citySlug), [citySlug]);
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
        onOpenDashboard={() =>
          navigate(isAuthenticated ? '/dashboard' : '/login?redirect=/dashboard')
        }
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
              Discover massage professionals available near you, then review the profile that suits
              your session.
            </p>
            <p className="mt-3 text-[12.5px] text-zinc-500">
              {results.length} {results.length === 1 ? 'result' : 'results'}
              {filters.providerType && filters.providerType !== 'all' ? ` · ${filters.providerType}` : ''}
              {filters.service ? ` · ${filters.service}` : ''}
              {filters.gender && filters.gender !== 'all' ? ` · ${filters.gender}` : ''}
              <span className="ml-2 text-zinc-600">(demo profiles)</span>
            </p>
          </header>

          <ExploreFilters
            citySlug={citySlug}
            filters={filters}
            onChange={updateFilters}
            onCityChange={onCityChange}
          />

          <div className="mt-6">
            {results.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-14 text-center">
                <p className="text-[15px] font-semibold text-white">No matches in this city yet</p>
                <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-zinc-400">
                  Try another service filter, clear the price range, or explore a nearby city.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                  <Button
                    variant="secondary"
                    onClick={() => updateFilters({ sort: 'recommended' })}
                  >
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
