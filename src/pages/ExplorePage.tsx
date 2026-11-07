import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ExploreFilters } from '../components/marketplace/ExploreFilters';
import { MarketplaceProfileCard } from '../components/marketplace/MarketplaceProfileCard';
import {
  MARKETPLACE_CITIES,
  findCityBySlug,
  nearestCity,
  regionNameForCity,
} from '../data/locations';
import {
  searchMarketplaceProviders,
  type DiscoveryTarget,
  type MarketplaceProfile,
} from '../data/marketplaceProfiles';
import {
  buildExploreSearchParams,
  filterAndSortProfiles,
  parseExploreSearchParams,
  type MarketplaceFilters,
} from '../lib/marketplace';
import { useAuth } from '../auth/AuthContext';
import { customerApi, type CustomerLocationDto } from '../lib/customerApi';
import { Container } from '../components/ui/Layout';
import { Button, buttonClass } from '../components/ui/Button';

type ActiveLocation = {
  region: string;
  city: string;
  area?: string;
  latitude?: number | null;
  longitude?: number | null;
  source: 'saved' | 'manual' | 'general';
};

function fromSaved(location: CustomerLocationDto | null): ActiveLocation | null {
  if (!location || (!location.region && !location.city)) return null;
  return {
    region: location.region ?? '',
    city: location.city ?? '',
    area: location.area ?? '',
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
    source: 'saved',
  };
}

function locationLabel(location: ActiveLocation | null): string | null {
  if (!location) return null;
  const parts = [location.area, location.city, location.region].filter(Boolean);
  if (parts.length === 0) return null;
  return `Near ${parts.join(', ')}`;
}

export const ExplorePage: React.FC = () => {
  const { citySlug = 'accra' } = useParams<{ citySlug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const city = findCityBySlug(citySlug);
  const filters = useMemo(() => parseExploreSearchParams(searchParams), [searchParams]);

  const [profiles, setProfiles] = useState<MarketplaceProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetMeta, setTargetMeta] = useState<DiscoveryTarget | null>(null);
  const [distanceNote, setDistanceNote] = useState<string | null>(null);

  const [savedLocation, setSavedLocation] = useState<ActiveLocation | null>(null);
  const [override, setOverride] = useState<ActiveLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedLocation(null);
      return;
    }
    let cancelled = false;
    customerApi
      .getLocation()
      .then((data) => {
        if (!cancelled) setSavedLocation(fromSaved(data.location));
      })
      .catch(() => {
        if (!cancelled) setSavedLocation(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const activeLocation = useMemo<ActiveLocation | null>(() => {
    if (override) return override;
    if (savedLocation) return savedLocation;
    if (city) {
      return {
        region: regionNameForCity(city),
        city: city.name,
        source: 'general',
        latitude: null,
        longitude: null,
      };
    }
    return null;
  }, [override, savedLocation, city]);

  const hasCoordinates = activeLocation?.latitude != null && activeLocation?.longitude != null;
  const effectiveRadius = hasCoordinates ? filters.radiusKm ?? null : null;

  useEffect(() => {
    let cancelled = false;
    setProfiles(null);
    setError(null);

    if (!activeLocation) {
      searchMarketplaceProviders({})
        .then(({ providers, target, distanceNote: note }) => {
          if (cancelled) return;
          setProfiles(providers);
          setTargetMeta(target);
          setDistanceNote(note ?? null);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load providers.');
        });
      return () => {
        cancelled = true;
      };
    }

    const body: Record<string, unknown> = {
      region: activeLocation.region,
      city: activeLocation.city,
      area: activeLocation.area ?? '',
      providerType: filters.providerType && filters.providerType !== 'all' ? filters.providerType : '',
      gender: filters.gender && filters.gender !== 'all' ? filters.gender : '',
      availability: filters.availability && filters.availability !== 'any' ? filters.availability : '',
      service: filters.service ?? '',
      mode: filters.mode && filters.mode !== 'any' ? filters.mode : '',
      sort: filters.sort === 'recommended' && activeLocation.source !== 'general' ? 'nearest' : filters.sort,
      radiusKm: effectiveRadius,
    };
    if (activeLocation.latitude != null && activeLocation.longitude != null) {
      body.latitude = activeLocation.latitude;
      body.longitude = activeLocation.longitude;
    }

    searchMarketplaceProviders(body)
      .then(({ providers, target, distanceNote: note }) => {
        if (cancelled) return;
        setProfiles(providers);
        setTargetMeta(target);
        setDistanceNote(note ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load providers.');
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeLocation,
    effectiveRadius,
    filters.providerType,
    filters.gender,
    filters.availability,
    filters.service,
    filters.mode,
    filters.sort,
  ]);

  const results = useMemo(() => {
    if (!profiles) return [];
    const sort = activeLocation && activeLocation.source !== 'general'
      ? filters.sort === 'recommended' || filters.sort === 'nearest'
        ? 'nearest'
        : filters.sort
      : filters.sort;
    return filterAndSortProfiles(profiles, { ...filters, sort });
  }, [profiles, filters, activeLocation]);

  useEffect(() => {
    const cityName = activeLocation?.city || city?.name || citySlug;
    const title = filters.service
      ? `${filters.service} in ${cityName} | Massager Studio`
      : `Massage Professionals in ${cityName} | Massager Studio`;
    document.title = title;
  }, [activeLocation, city, citySlug, filters.service]);

  const updateFilters = (next: MarketplaceFilters) => {
    setSearchParams(buildExploreSearchParams(next), { replace: true });
  };

  const onCityChange = (slug: string) => {
    const picked = findCityBySlug(slug);
    setOverride(
      picked
        ? {
            region: regionNameForCity(picked),
            city: picked.name,
            source: 'manual',
            latitude: null,
            longitude: null,
          }
        : null,
    );
    const qs = buildExploreSearchParams(filters).toString();
    navigate(qs ? `/explore/${slug}?${qs}` : `/explore/${slug}`);
  };

  const onRegionChange = (regionId: string) => {
    if (!regionId) {
      setOverride(null);
      return;
    }
    const region = regionId;
    const first = findCityBySlug(citySlug);
    if (first && first.regionId === region) return;
    // Move to the region's first listed town; the location field remains editable.
    const candidate = MARKETPLACE_CITIES.find((c) => c.regionId === region);
    if (candidate) onCityChange(candidate.slug);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoMessage('This browser cannot share a location. Choose a town instead.');
      return;
    }
    setLocating(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        const nearest = nearestCity(latitude, longitude);
        setOverride({
          region: nearest ? regionNameForCity(nearest) : activeLocation?.region ?? '',
          city: nearest?.name ?? activeLocation?.city ?? '',
          latitude,
          longitude,
          source: 'manual',
        });
        setGeoMessage(
          nearest
            ? `Showing providers near ${nearest.name}. Distance is approximate straight-line, not travel distance.`
            : 'Location shared. Choose your region and town to refine results.',
        );
        setLocating(false);
      },
      (err) => {
        setGeoMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. All results remain available by town.'
            : 'We could not read your location. Choose a town instead.',
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  };

  const label = locationLabel(activeLocation);

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
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple-light">
              Explore
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-3xl">
              Massage professionals in {activeLocation?.city || city?.name || citySlug}
            </h1>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-zinc-400">
              {activeLocation && activeLocation.source !== 'general'
                ? 'Eligible providers serving your location are ranked nearest first. Every profile below has completed identity review and been approved for publication.'
                : 'General results for this town. Set your location or share your current location for nearest-first matching.'}
            </p>
            <p className="mt-3 text-[12.5px] text-zinc-500">
              {profiles === null ? 'Loading providers…' : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
              {label ? ` · ${label}` : ''}
              {effectiveRadius != null ? ` · within ${effectiveRadius} km` : ''}
              {filters.providerType && filters.providerType !== 'all' ? ` · ${filters.providerType}` : ''}
              {filters.service ? ` · ${filters.service}` : ''}
              {filters.gender && filters.gender !== 'all' ? ` · ${filters.gender}` : ''}
            </p>
            {geoMessage ? (
              <p role="status" className="mt-2 text-[12px] text-brand-purple-light">{geoMessage}</p>
            ) : null}
          </header>

          <ExploreFilters
            citySlug={citySlug}
            filters={filters}
            onChange={updateFilters}
            onCityChange={onCityChange}
            onRegionChange={onRegionChange}
            onUseCurrentLocation={useCurrentLocation}
            locating={locating}
            locationLabel={label}
            hasCoordinates={hasCoordinates}
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
                  {effectiveRadius != null
                    ? `No eligible providers within ${effectiveRadius} km`
                    : `No approved providers match ${activeLocation?.city || city?.name || citySlug} yet`}
                </p>
                <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-zinc-400">
                  {effectiveRadius != null
                    ? 'Providers outside this radius are not mixed into the results. Widen the radius or search a nearby town.'
                    : 'Profiles appear here once identity review and admin approval are complete. Try another town or clear a filter.'}
                </p>
                {effectiveRadius != null ? (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {[5, 10, 20, 50].filter((km) => km > effectiveRadius).map((km) => (
                      <button
                        key={km}
                        type="button"
                        onClick={() => updateFilters({ ...filters, radiusKm: km })}
                        className="inline-flex min-h-10 items-center rounded-lg border border-brand-purple/40 px-3 text-[12.5px] font-semibold text-brand-purple-light hover:bg-brand-purple/10"
                      >
                        Widen to {km} km
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateFilters({ ...filters, radiusKm: null })}
                      className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-3 text-[12.5px] font-semibold text-zinc-300 hover:bg-white/[0.05]"
                    >
                      Any distance
                    </button>
                  </div>
                ) : null}
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <Button variant="secondary" onClick={() => updateFilters({ sort: 'recommended' })}>
                    Clear filters
                  </Button>
                  <Link to="/explore/accra" className={buttonClass({})}>
                    Browse Accra
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3.5">
                  {results.map((profile, i) => (
                    <MarketplaceProfileCard key={profile.id} profile={profile} index={i} />
                  ))}
                </div>
                {distanceNote ? (
                  <p className="mt-4 text-[11.5px] leading-relaxed text-zinc-500">{distanceNote}</p>
                ) : null}
              </>
            )}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
};
