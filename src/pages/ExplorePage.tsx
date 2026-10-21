import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ExploreFilters } from '../components/marketplace/ExploreFilters';
import { MarketplaceProfileCard } from '../components/marketplace/MarketplaceProfileCard';
import { findCityBySlug } from '../data/locations';
import { profilesForCity } from '../data/marketplaceProfiles';
import { findServiceCategory } from '../data/serviceCategories';
import {
  buildExploreSearchParams,
  filterAndSortProfiles,
  parseExploreSearchParams,
  type MarketplaceFilters,
} from '../lib/marketplace';
import { useAuth } from '../auth/AuthContext';

export const ExplorePage: React.FC = () => {
  const { citySlug = 'accra' } = useParams<{ citySlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const city = findCityBySlug(citySlug);
  const filters = useMemo(() => parseExploreSearchParams(searchParams), [searchParams]);

  const cityProfiles = useMemo(() => profilesForCity(citySlug), [citySlug]);
  const results = useMemo(() => filterAndSortProfiles(cityProfiles, filters), [cityProfiles, filters]);

  const serviceMeta = findServiceCategory(filters.service);

  useEffect(() => {
    const cityName = city?.name || citySlug;
    const title = serviceMeta
      ? `${serviceMeta.label} in ${cityName} | Dark Secret`
      : `Available Services in ${cityName} | Dark Secret`;
    document.title = title;
  }, [city, citySlug, serviceMeta]);

  const updateFilters = (next: MarketplaceFilters) => {
    setSearchParams(buildExploreSearchParams(next), { replace: true });
  };

  const onCityChange = (slug: string) => {
    const qs = buildExploreSearchParams(filters).toString();
    navigate(qs ? `/explore/${slug}?${qs}` : `/explore/${slug}`);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/30 via-transparent to-transparent" />
      </div>

      <Navbar
        onOpenBooking={() => navigate('/book-massage')}
        onOpenMatchmaking={() => navigate('/find-a-life-partner')}
        onOpenDashboard={() =>
          navigate(isAuthenticated ? '/dashboard' : '/login?redirect=/dashboard')
        }
        isAuthenticated={isAuthenticated}
      />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <ExploreFilters
          citySlug={citySlug}
          filters={filters}
          onChange={updateFilters}
          onCityChange={onCityChange}
        />

        <header className="mt-8 mb-6">
          <p className="text-[11px] uppercase tracking-[0.28em] text-purple-300/80 mb-2">Explore</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Available in {city?.name || citySlug}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-2xl">
            Discover massage, wellness and meaningful connections near you.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            {results.length} {results.length === 1 ? 'result' : 'results'}
            {serviceMeta ? ` · ${serviceMeta.label}` : ''}
            <span className="ml-2 text-zinc-600">(demo profiles)</span>
          </p>
        </header>

        {results.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
            <p className="text-lg text-white font-medium">No matches in this city yet</p>
            <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
              Try another service filter, clear the price range, or explore a nearby city.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => updateFilters({ sort: 'recommended' })}
                className="px-5 py-2.5 rounded-full border border-white/15 text-xs uppercase tracking-widest text-zinc-200 hover:border-purple-400/40"
              >
                Clear filters
              </button>
              <Link
                to="/explore/accra"
                className="px-5 py-2.5 rounded-full bg-purple-600 text-xs uppercase tracking-widest text-white"
              >
                Browse Accra
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((profile, i) => (
              <MarketplaceProfileCard key={profile.id} profile={profile} index={i} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
