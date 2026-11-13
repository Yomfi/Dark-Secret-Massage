import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Button, Container, IconButton } from '../components/ui';
import { Footer } from '../components/Footer';
import {
  findMarketplaceProfile,
  mapApiProvider,
  providerImageSources,
  setMarketplaceProfiles,
  siblingProfiles,
  type MarketplaceProfile,
  type MarketplaceProviderKind,
} from '../data/marketplaceProfiles';
import {
  availabilityLabel,
  formatPrice,
  genderLabel,
  providerKindLabel,
  serviceSettingLabel,
  whatsappEnquiryUrl,
} from '../lib/marketplace';
import { marketplaceEnquireMailto } from '../lib/companyEmails';
import { useAuth } from '../auth/AuthContext';
import { ProviderImage, ProviderImageFallback } from '../components/marketplace/ProviderImage';
import { VerifiedBadge, VerifiedNameCheck } from '../components/marketplace/VerifiedBadge';
import { isAdultService } from '../data/serviceCategories';
import {
  UnverifiedContactModal,
  acknowledgeUnverified,
  hasAcknowledgedUnverified,
} from '../components/marketplace/UnverifiedContactModal';

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 py-2.5 border-b border-white/[0.06] last:border-0">
      <dt className="sm:w-40 shrink-0 text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-200">{value}</dd>
    </div>
  );
}

type PendingContact = 'call' | 'whatsapp' | 'enquire';

function ContactPanel({
  profile,
  stickyMobile,
}: {
  profile: MarketplaceProfile;
  stickyMobile?: boolean;
}) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const price = formatPrice(profile.startingPrice, profile.currency);
  const canCall = profile.publicContactEnabled && Boolean(profile.phone);
  const canWhatsApp = profile.publicContactEnabled && Boolean(profile.whatsapp);
  const [warnOpen, setWarnOpen] = useState(false);
  const [pending, setPending] = useState<PendingContact | null>(null);

  const runContact = (action: PendingContact) => {
    if (action === 'call' && profile.phone) {
      window.location.href = `tel:${profile.phone}`;
      return;
    }
    if (action === 'whatsapp' && profile.whatsapp) {
      window.open(whatsappEnquiryUrl(profile.whatsapp), '_blank', 'noopener,noreferrer');
      return;
    }
    if (action === 'enquire') {
      window.location.href = marketplaceEnquireMailto(profile.displayName, profile.city);
    }
  };

  const requestContact = (action: PendingContact) => {
    if (profile.verified || hasAcknowledgedUnverified(profile.id)) {
      runContact(action);
      return;
    }
    setPending(action);
    setWarnOpen(true);
  };

  const saveProfile = () => {
    if (!isAuthenticated || !user) {
      navigate(`/login?redirect=${encodeURIComponent(`/profile/${profile.slug}`)}`);
      return;
    }
    window.alert('Saved profiles will sync to your account in a coming update.');
  };

  const modal = (
    <UnverifiedContactModal
      open={warnOpen}
      onCancel={() => {
        setWarnOpen(false);
        setPending(null);
      }}
      onContinue={() => {
        acknowledgeUnverified(profile.id);
        setWarnOpen(false);
        if (pending) runContact(pending);
        setPending(null);
      }}
    />
  );

  if (stickyMobile) {
    return (
      <>
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#060608]/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-lg gap-2">
            {canCall && (
              <Button
                variant="secondary"
                onClick={() => requestContact('call')}
                iconLeft={<Phone className="h-4 w-4" aria-hidden />}
                className="flex-1 px-3"
              >
                Call
              </Button>
            )}
            {canWhatsApp && (
              <Button
                onClick={() => requestContact('whatsapp')}
                iconLeft={<MessageCircle className="h-4 w-4" aria-hidden />}
                className="flex-1 border border-emerald-500/40 bg-emerald-600 px-3 text-white hover:bg-emerald-500"
              >
                WhatsApp
              </Button>
            )}
            <Button onClick={() => requestContact('enquire')} className="flex-1 px-3">
              Enquire
            </Button>
          </div>
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      <aside
        id="contact"
        className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:sticky lg:top-28 space-y-4"
      >
        <div>
          <div className="mb-2">
            <VerifiedBadge verified={profile.verified} size="md" />
          </div>
          <p className="text-[12px] font-medium text-zinc-500">
            {price ? 'From' : 'Contact'}
          </p>
          {price ? (
            <p className="mt-1 text-2xl font-semibold text-brand-purple-light tracking-tight">{price}</p>
          ) : (
            <p className="mt-1 text-lg font-semibold text-white">Get in touch</p>
          )}
          {!profile.verified && (
            <p className="mt-2 text-xs text-amber-200/80">
              Unverified profile — browsing and enquiries are available; paid bookings are disabled.
            </p>
          )}
          {!profile.publicContactEnabled && (
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Direct phone and WhatsApp are private for this profile. Use Enquire to reach Massager Studio.
            </p>
          )}
          {profile.verified && profile.publicContactEnabled && profile.phone && (
            <p className="mt-2 text-sm text-zinc-300 tabular-nums">{profile.phone}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {canWhatsApp && (
            <Button
              fullWidth
              onClick={() => requestContact('whatsapp')}
              iconLeft={<MessageCircle className="h-4 w-4" aria-hidden />}
              className="border border-emerald-500/40 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              WhatsApp
            </Button>
          )}
          {canCall && (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => requestContact('call')}
              iconLeft={<Phone className="h-4 w-4" aria-hidden />}
            >
              Call
            </Button>
          )}
          <Button fullWidth onClick={() => requestContact('enquire')}>
            Enquire
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={saveProfile}
            iconLeft={<Heart className="h-4 w-4" aria-hidden />}
          >
            Save
          </Button>
        </div>

        {profile.isDemo && (
          <p className="text-[12px] text-zinc-600">
            Demo profile · contact numbers are placeholders
          </p>
        )}
      </aside>
      {modal}
    </>
  );
}

function ProfileGallery({
  images,
  displayName,
  isDemo,
  providerKind,
}: {
  images: string[];
  displayName: string;
  isDemo: boolean;
  providerKind: MarketplaceProviderKind;
}) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [lightboxFailed, setLightboxFailed] = useState(false);

  const go = (dir: -1 | 1) => {
    setLightboxFailed(false);
    setIndex((i) => (i + dir + images.length) % images.length);
  };

  if (images.length === 0) {
    return (
      <section className="relative">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0f]">
          <ProviderImage
            name={displayName}
            kind={providerKind}
            aspectClassName="aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5]"
            size="profile"
          />
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="relative">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0f] group">
          <button
            type="button"
            onClick={() => {
              setLightboxFailed(false);
              setLightbox(true);
            }}
            className="block w-full text-left"
            aria-label="Open gallery lightbox"
          >
            <ProviderImage
              src={images[index]}
              name={displayName}
              kind={providerKind}
              alt={displayName}
              aspectClassName="aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5]"
              size="profile"
              hoverZoom
            />
          </button>

          {images.length > 1 && (
            <>
              <IconButton
                variant="overlay"
                onClick={() => go(-1)}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </IconButton>
              <IconButton
                variant="overlay"
                onClick={() => go(1)}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2"
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </IconButton>
            </>
          )}

          {isDemo && (
            <span className="absolute top-3 left-3 z-10 text-[9px] uppercase tracking-[0.18em] px-2 py-1 rounded-full bg-black/70 border border-white/15 text-zinc-300">
              Demo
            </span>
          )}
          <span className="absolute bottom-3 right-3 z-10 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-black/60 border border-white/10 text-zinc-400">
            {index + 1} / {images.length}
          </span>
        </div>

        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setIndex(i)}
                className={`shrink-0 w-[4.75rem] h-[5.75rem] rounded-xl overflow-hidden border bg-[#0a0a0f] transition-opacity ${
                  i === index ? 'border-brand-purple opacity-100' : 'border-white/10 opacity-75 hover:opacity-100'
                }`}
              >
                <ProviderImage
                  src={src}
                  name={displayName}
                  kind={providerKind}
                  alt=""
                  aspectClassName="w-full h-full"
                  size="thumb"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4">
          <IconButton
            variant="overlay"
            aria-label="Close"
            className="absolute right-4 top-4 z-10"
            onClick={() => setLightbox(false)}
          >
            <X className="h-5 w-5" aria-hidden />
          </IconButton>
          {images.length > 1 && (
            <>
              <IconButton
                variant="overlay"
                onClick={() => go(-1)}
                className="absolute left-3 z-10 sm:left-6"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </IconButton>
              <IconButton
                variant="overlay"
                onClick={() => go(1)}
                className="absolute right-3 z-10 sm:right-6"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" aria-hidden />
              </IconButton>
            </>
          )}
          {lightboxFailed ? (
            <ProviderImageFallback
              name={displayName}
              kind={providerKind}
              aspectClassName="aspect-[4/5]"
              className="w-[min(90vw,520px)] rounded-2xl"
              size="profile"
            />
          ) : (
            <img
              src={images[index]}
              alt={displayName}
              onError={() => setLightboxFailed(true)}
              className="max-h-[90vh] max-w-full w-auto object-contain rounded-lg"
            />
          )}
        </div>
      )}
    </>
  );
}

export const MarketplaceProfilePage: React.FC = () => {
  const { profileSlug = '' } = useParams<{ profileSlug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<MarketplaceProfile | null>(() =>
    findMarketplaceProfile(profileSlug) ?? null,
  );
  const [loading, setLoading] = useState(!profile);

  // Deep links must work without coming from Explore: load the published record.
  useEffect(() => {
    if (profile || !profileSlug) return;
    let cancelled = false;
    fetch(`/api/public/providers.php?slug=${encodeURIComponent(profileSlug)}`)
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        const list = Array.isArray(payload?.data?.providers) ? payload.data.providers : [];
        const mapped = list.map((p: Record<string, unknown>) => mapApiProvider(p));
        if (mapped.length > 0) setMarketplaceProfiles(mapped);
        setProfile(mapped[0] ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile, profileSlug]);

  const navProps = {
    onOpenBooking: () => navigate('/book-massage'),
    onOpenDashboard: () =>
      navigate(isAuthenticated ? '/dashboard' : '/login?redirect=/dashboard'),
    isAuthenticated,
  };

  const filterService = searchParams.get('service');
  const backCity = searchParams.get('from') || profile?.citySlug || 'accra';

  const siblings = useMemo(() => {
    if (!profile) return [];
    return siblingProfiles(profile.citySlug, profile.slug, filterService);
  }, [profile, filterService]);

  const siblingIndex = siblings.findIndex((p) => p.slug === profile?.slug);
  const prev = siblingIndex > 0 ? siblings[siblingIndex - 1] : null;
  const next = siblingIndex >= 0 && siblingIndex < siblings.length - 1 ? siblings[siblingIndex + 1] : null;

  const navQs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('from', backCity);
    if (filterService) p.set('service', filterService);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [backCity, filterService]);

  useEffect(() => {
    if (!profile) {
      document.title = 'Profile not found | Massager Studio';
      return;
    }
    document.title = `${profile.displayName} — Massage in ${profile.city} | Massager Studio`;
  }, [profile]);

  if (!profile && loading) {
    return (
      <div className="min-h-screen bg-[#050508] text-zinc-100">
        <Navbar {...navProps} />
        <main className="flex min-h-[70vh] items-center justify-center px-4 pt-24">
          <p className="text-sm text-zinc-400">Loading provider…</p>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col">
        <Navbar {...navProps} />
        <main className="flex-1 flex items-center justify-center px-4 pt-24">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile not found</h1>
            <Link to="/explore/accra" className="mt-4 inline-block text-brand-purple-light hover:text-brand-purple-light text-sm">
              Back to explore
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const images = providerImageSources(profile);
  const isProvider =
    profile.profileType === 'massage_provider' || profile.profileType === 'wellness_provider';

  const backHref = (() => {
    const p = new URLSearchParams();
    if (filterService) p.set('service', filterService);
    const qs = p.toString();
    return qs ? `/explore/${backCity}?${qs}` : `/explore/${backCity}`;
  })();

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 pb-28 lg:pb-0">
      <Navbar {...navProps} />

      <Container as="main" className="relative z-10 pb-16 pt-28">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <Link
            to={backHref}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back to results
          </Link>
          <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
            {prev && (
              <Link
                to={`/profile/${prev.slug}${navQs}`}
                className="inline-flex items-center gap-1 font-medium hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </Link>
            )}
            {next && (
              <Link
                to={`/profile/${next.slug}${navQs}`}
                className="inline-flex items-center gap-1 font-medium hover:text-white"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Desktop: gallery left + sticky contact; Mobile: gallery → identity → contact summary */}
        <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] gap-8 lg:gap-10 items-start">
          <ProfileGallery
            images={images}
            displayName={profile.displayName}
            isDemo={profile.isDemo}
            providerKind={profile.providerKind}
          />

          <div className="space-y-5">
            <header>
              <p className="text-[12px] font-semibold text-brand-purple-light">
                {profile.providerKind === 'agency' ? 'Agency' : 'Individual'}
                {profile.providerKind !== 'agency' && genderLabel(profile.gender)
                  ? ` · ${genderLabel(profile.gender)}`
                  : ''}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {providerKindLabel(profile.providerKind)}
                {profile.providerKind === 'agency' ? ` · ${profile.city}` : ''}
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-white tracking-tight uppercase inline-flex items-center gap-2 flex-wrap">
                {profile.displayName}
                <VerifiedNameCheck verified={profile.verified} />
              </h1>
              <div className="mt-2">
                <VerifiedBadge verified={profile.verified} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-400">
                <MapPin className="w-4 h-4 text-brand-purple-light shrink-0" />
                {[profile.area, profile.city, profile.region].filter(Boolean).join(', ') || profile.country}
              </p>
              {profile.distanceKm != null ? (
                <p className="mt-1 text-xs text-brand-purple-light/90">
                  ~{profile.distanceKm} km straight-line from your saved location · approximate, not travel distance
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.services.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-brand-purple/25 bg-brand-purple/10 text-brand-lavender-soft"
                  >
                    {tag}
                    {isAdultService(tag) ? (
                      <span
                        className="rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.06em] text-amber-200"
                        title="Adults-only (18+) service"
                      >
                        18+
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{profile.shortBio}</p>
            </header>

            {!profile.verified ? (
              <div role="status" className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                  Unverified provider
                </p>
                <p className="mt-2 text-sm leading-relaxed text-amber-100">
                  This provider has not completed identity verification and is not currently accepting bookings.
                </p>
              </div>
            ) : null}

            <div className="hidden lg:block">
              <ContactPanel profile={profile} />
            </div>

            {/* Mobile contact teaser (full sticky bar below) */}
            <div className="lg:hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              {formatPrice(profile.startingPrice, profile.currency) ? (
                <p className="text-lg font-semibold text-brand-purple-light">
                  From {formatPrice(profile.startingPrice, profile.currency)}
                </p>
              ) : (
                <p className="text-sm text-zinc-300">Public enquiry available</p>
              )}
              <p className="mt-1 text-xs text-zinc-500 uppercase tracking-wider">
                {availabilityLabel(profile.availability)} · {serviceSettingLabel(profile.serviceSetting)}
              </p>
            </div>
          </div>
        </div>

        {/* Detailed sections */}
        <div className="mt-10 space-y-6 max-w-4xl">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <h2 className="mb-3 text-base font-semibold text-white">About</h2>
            <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{profile.about}</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <h2 className="mb-1 text-base font-semibold text-white">
              Profile details
            </h2>
            <dl>
              <DetailRow label="Display name" value={profile.displayName} />
              <DetailRow label="Provider type" value={providerKindLabel(profile.providerKind)} />
              {profile.providerKind !== 'agency' && (
                <DetailRow label="Gender" value={genderLabel(profile.gender)} />
              )}
              <DetailRow label="Age" value={profile.age} />
              <DetailRow label="City" value={profile.city} />
              <DetailRow label="District" value={profile.district} />
              <DetailRow label="Country" value={profile.country} />
              <DetailRow label="Languages" value={profile.languages?.join(', ')} />
              <DetailRow label="Massage services" value={profile.services.join(', ')} />
              <DetailRow label="Experience" value={profile.yearsExperience != null ? `${profile.yearsExperience} years` : null} />
              <DetailRow label="Availability" value={availabilityLabel(profile.availability)} />
              <DetailRow label="Available days" value={profile.availableDays} />
              <DetailRow label="Opening hours" value={profile.workingHours} />
              <DetailRow label="Service setting" value={serviceSettingLabel(profile.serviceSetting)} />
              <DetailRow label="Service area" value={profile.serviceArea} />
              <DetailRow
                label="Areas served"
                value={(profile.serviceAreas ?? []).length > 0
                  ? (profile.serviceAreas ?? []).map((area) => [area.area, area.city, area.region].filter(Boolean).join(', ')).join(' · ')
                  : null}
              />
              <DetailRow label="Offers home visits" value={profile.offersHomeVisit ? 'Yes, within published service areas' : 'In-studio only'} />
              <DetailRow
                label="Rates"
                value={formatPrice(profile.startingPrice, profile.currency)}
              />
              <DetailRow
                label="Verification status"
                value={profile.verified ? 'Verified' : 'Unverified'}
              />
              <DetailRow
                label="Public contact"
                value={profile.publicContactEnabled ? 'Enabled' : 'Not published'}
              />
            </dl>
          </section>

          {profile.providerKind === 'agency' && profile.teamMembers && profile.teamMembers.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-white">
                Meet our massage professionals
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {profile.teamMembers
                  .filter((m) => m.status !== 'inactive')
                  .map((member) => (
                    <article
                      key={member.id}
                      className="rounded-xl border border-white/10 bg-black/20 overflow-hidden"
                    >
                      <ProviderImage
                        src={member.profileImage}
                        name={member.displayName}
                        kind="individual"
                        alt={member.displayName}
                        aspectClassName="aspect-[4/3]"
                        size="team"
                      />
                      <div className="p-4">
                        <p className="text-sm font-semibold text-white">
                          {member.displayName}
                        </p>
                        <p className="mt-1 text-[12px] text-zinc-500">
                          {genderLabel(member.gender)}
                          {member.yearsExperience != null ? ` · ${member.yearsExperience} yrs` : ''}
                        </p>
                        {member.bio && (
                          <p className="mt-2 text-xs text-zinc-400 leading-relaxed">{member.bio}</p>
                        )}
                        {member.services && member.services.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {member.services.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-brand-purple/25 text-brand-lavender-soft"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
              </div>
            </section>
          )}

          {isProvider && profile.serviceOfferings && profile.serviceOfferings.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-white">
                Services offered
              </h2>
              <ul className="space-y-3">
                {profile.serviceOfferings.map((offering) => (
                  <li
                    key={offering.name}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-white/[0.06] last:border-0"
                  >
                    <div>
                      <p className="text-sm text-white">{offering.name}</p>
                      {offering.durationMinutes != null && (
                        <p className="text-xs text-zinc-500 mt-0.5">{offering.durationMinutes} minutes</p>
                      )}
                    </div>
                    {offering.priceFrom != null && (
                      <p className="text-sm text-brand-purple-light font-medium">
                        From {formatPrice(offering.priceFrom, profile.currency)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <h2 className="mb-2 text-base font-semibold text-white">Reviews</h2>
            <p className="text-sm text-zinc-500">No reviews yet.</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <h2 className="mb-2 text-base font-semibold text-white">Questions</h2>
            <p className="text-sm text-zinc-500">No questions yet. Use Enquire to ask privately.</p>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs text-zinc-500">
            <button
              type="button"
              onClick={() => window.alert('Report received. Our team will review this profile.')}
              className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-4 hover:text-zinc-300"
            >
              <Flag className="w-3.5 h-3.5" /> Report Profile
            </button>
            <div className="flex gap-4">
              {prev && (
                <Link to={`/profile/${prev.slug}${navQs}`} className="inline-flex items-center gap-1 hover:text-white">
                  <ArrowLeft className="w-3.5 h-3.5" /> {prev.displayName}
                </Link>
              )}
              {next && (
                <Link to={`/profile/${next.slug}${navQs}`} className="inline-flex items-center gap-1 hover:text-white">
                  {next.displayName} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </Container>

      <ContactPanel profile={profile} stickyMobile />
      <Footer />
    </div>
  );
};
