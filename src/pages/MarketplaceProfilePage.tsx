import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  X,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import {
  findMarketplaceProfile,
  MARKETPLACE_PROFILES,
  type MarketplaceProfile,
} from '../data/marketplaceProfiles';
import { findServiceCategory } from '../data/serviceCategories';
import {
  availabilityLabel,
  formatPrice,
  serviceSettingLabel,
  whatsappEnquiryUrl,
} from '../lib/marketplace';
import { useAuth } from '../auth/AuthContext';
import { PortraitMedia } from '../components/marketplace/PortraitMedia';

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

  const saveProfile = () => {
    if (!isAuthenticated || !user) {
      navigate(`/login?redirect=${encodeURIComponent(`/profile/${profile.slug}`)}`);
      return;
    }
    // Favourites storage arrives with MySQL-backed accounts; acknowledge intent for now.
    window.alert('Saved profiles will sync to your account in a coming update.');
  };

  const enquire = () => {
    const subject = encodeURIComponent(`Enquiry: ${profile.displayName} on Dark Secret`);
    const body = encodeURIComponent(
      `Hello, I found your profile on Dark Secret and would like to enquire about your services.\n\nProfile: ${profile.displayName}\nCity: ${profile.city}`,
    );
    window.location.href = `mailto:hello@darksecret.app?subject=${subject}&body=${body}`;
  };

  const actions = (
    <div className={`flex flex-col gap-2 ${stickyMobile ? 'flex-row' : ''}`}>
      {profile.publicContactEnabled && profile.phone && (
        <a
          href={`tel:${profile.phone}`}
          className="inline-flex flex-1 items-center justify-center gap-2 min-h-[44px] px-4 rounded-full border border-white/15 text-xs uppercase tracking-widest text-zinc-100 hover:border-purple-400/40"
        >
          <Phone className="w-4 h-4" /> Call
        </a>
      )}
      {profile.publicContactEnabled && profile.whatsapp && (
        <a
          href={whatsappEnquiryUrl(profile.whatsapp, profile.displayName)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 min-h-[44px] px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-xs uppercase tracking-widest text-white"
        >
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </a>
      )}
      <button
        type="button"
        onClick={enquire}
        className="inline-flex flex-1 items-center justify-center gap-2 min-h-[44px] px-4 rounded-full bg-purple-600 hover:bg-purple-500 text-xs uppercase tracking-widest text-white"
      >
        Enquire
      </button>
      <button
        type="button"
        onClick={saveProfile}
        className="inline-flex flex-1 items-center justify-center gap-2 min-h-[44px] px-4 rounded-full border border-white/15 text-xs uppercase tracking-widest text-zinc-200"
      >
        <Heart className="w-4 h-4" /> Save
      </button>
    </div>
  );

  if (stickyMobile) {
    return (
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {actions}
      </div>
    );
  }

  return (
    <aside
      id="contact"
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:sticky lg:top-28 space-y-4"
    >
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Contact</p>
        {price && <p className="mt-1 text-lg font-semibold text-purple-200">From {price}</p>}
        {!profile.publicContactEnabled && (
          <p className="mt-2 text-sm text-zinc-400">
            Direct phone/WhatsApp is private for this profile. Use Enquire to reach the Dark Secret team.
          </p>
        )}
      </div>
      {actions}
      {profile.isDemo && (
        <p className="text-[10px] uppercase tracking-widest text-zinc-600">Demo profile · contact numbers are placeholders</p>
      )}
    </aside>
  );
}

export const MarketplaceProfilePage: React.FC = () => {
  const { profileSlug = '' } = useParams<{ profileSlug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const profile = findMarketplaceProfile(profileSlug);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const navProps = {
    onOpenBooking: () => navigate('/book-massage'),
    onOpenMatchmaking: () => navigate('/find-a-life-partner'),
    onOpenDashboard: () =>
      navigate(isAuthenticated ? '/dashboard' : '/login?redirect=/dashboard'),
    isAuthenticated,
  };

  const category = profile ? findServiceCategory(profile.primaryCategory) : undefined;

  const siblings = useMemo(() => {
    if (!profile) return [];
    return MARKETPLACE_PROFILES.filter((p) => p.citySlug === profile.citySlug);
  }, [profile]);

  const siblingIndex = siblings.findIndex((p) => p.slug === profile?.slug);
  const prev = siblingIndex > 0 ? siblings[siblingIndex - 1] : null;
  const next = siblingIndex >= 0 && siblingIndex < siblings.length - 1 ? siblings[siblingIndex + 1] : null;

  useEffect(() => {
    if (!profile) {
      document.title = 'Profile not found | Dark Secret';
      return;
    }
    document.title = `${profile.displayName} — ${category?.label || 'Profile'} in ${profile.city} | Dark Secret`;
  }, [profile, category]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col">
        <Navbar {...navProps} />
        <main className="flex-1 flex items-center justify-center px-4 pt-24">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile not found</h1>
            <Link to="/explore/accra" className="mt-4 inline-block text-purple-300 hover:text-purple-200 text-sm">
              Back to explore
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const images = profile.gallery.length ? profile.gallery : [profile.primaryImage];
  const backCity = searchParams.get('from') || profile.citySlug;

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 pb-24 lg:pb-0">
      <Navbar {...navProps} />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <Link
          to={`/explore/${backCity}`}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to results
        </Link>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-8">
            {/* Gallery — photography-led, full subject visible */}
            <section>
              <button
                type="button"
                onClick={() => setLightbox(images[galleryIndex])}
                className="relative w-full max-w-xl mx-auto lg:mx-0 rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0f] group block"
              >
                <PortraitMedia
                  src={images[galleryIndex]}
                  alt={profile.displayName}
                  aspectClassName="aspect-[4/5] sm:aspect-[3/4] max-h-[70vh]"
                  hoverZoom
                />
                {profile.isDemo && (
                  <span className="absolute top-3 left-3 z-10 text-[9px] uppercase tracking-[0.18em] px-2 py-1 rounded-full bg-black/70 border border-white/15 text-zinc-300">
                    Demo
                  </span>
                )}
              </button>
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 max-w-xl">
                  {images.map((src, i) => (
                    <button
                      key={src + i}
                      type="button"
                      onClick={() => setGalleryIndex(i)}
                      className={`shrink-0 w-[4.5rem] h-[5.5rem] rounded-xl overflow-hidden border bg-[#0a0a0f] ${
                        i === galleryIndex ? 'border-purple-400' : 'border-white/10 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <PortraitMedia src={src} alt="" aspectClassName="w-full h-full" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <p className="text-[11px] uppercase tracking-[0.25em] text-purple-300/80">
                {category?.label || 'Profile'}
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-semibold text-white tracking-tight">
                {profile.displayName}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-400">
                <MapPin className="w-4 h-4 text-purple-300" />
                {profile.city}, {profile.region}, {profile.country}
              </p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">About</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">{profile.about}</p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-300">Services & rates</h2>
              <div className="flex flex-wrap gap-2">
                {profile.services.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-purple-400/25 bg-purple-500/10 text-purple-100"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Availability</dt>
                  <dd className="text-zinc-200 mt-1">{availabilityLabel(profile.availability)}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Setting</dt>
                  <dd className="text-zinc-200 mt-1">{serviceSettingLabel(profile.serviceSetting)}</dd>
                </div>
                {profile.startingPrice != null && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Starting rate</dt>
                    <dd className="text-zinc-200 mt-1">
                      {formatPrice(profile.startingPrice, profile.currency)}
                    </dd>
                  </div>
                )}
                {profile.languages && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Languages</dt>
                    <dd className="text-zinc-200 mt-1">{profile.languages.join(', ')}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
              <button
                type="button"
                onClick={() => window.alert('Report received. Our team will review this profile.')}
                className="underline underline-offset-4 hover:text-zinc-300"
              >
                Report Profile
              </button>
              <div className="flex gap-3">
                {prev && (
                  <Link to={`/profile/${prev.slug}`} className="inline-flex items-center gap-1 hover:text-white">
                    <ArrowLeft className="w-3.5 h-3.5" /> {prev.displayName}
                  </Link>
                )}
                {next && (
                  <Link to={`/profile/${next.slug}`} className="inline-flex items-center gap-1 hover:text-white">
                    {next.displayName} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </section>
          </div>

          <div className="hidden lg:block">
            <ContactPanel profile={profile} />
          </div>
        </div>
      </main>

      <ContactPanel profile={profile} stickyMobile />

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute top-4 right-4 p-2 rounded-full border border-white/20 text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-full w-auto object-contain rounded-lg"
          />
        </div>
      )}

      <Footer />
    </div>
  );
};
