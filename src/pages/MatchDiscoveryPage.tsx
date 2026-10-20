import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Bell, SlidersHorizontal, ArrowLeft, Users, MessageCircle } from 'lucide-react';
import { MatchSidebar } from '../components/matchmaking/MatchSidebar';
import { MobileMatchNav } from '../components/matchmaking/MobileMatchNav';
import { SwipeDeck, useSwipeTriggers } from '../components/matchmaking/SwipeDeck';
import { SwipeActions } from '../components/matchmaking/SwipeActions';
import { ProfileDetail } from '../components/matchmaking/ProfileDetail';
import { DiscoveryFilters } from '../components/matchmaking/DiscoveryFilters';
import { MatchModal } from '../components/matchmaking/MatchModal';
import { EmptyDiscoveryState } from '../components/matchmaking/EmptyDiscoveryState';
import {
  ConnectionsPanel,
  InterestsPanel,
  MessagesPanel,
  MyProfilePanel,
  PreferencesPanel,
  SavedProfilesPanel,
} from '../components/matchmaking/DiscoveryLists';
import type { DiscoveryProfile } from '../data/discoveryProfiles';
import {
  acceptReceivedInterest,
  applyInterest,
  applyPass,
  applySave,
  blockProfile,
  createInitialDiscoveryState,
  declineReceivedInterest,
  defaultFilters,
  filterDeck,
  getProfile,
  type DiscoveryFiltersState,
  type DiscoveryView,
  type MatchDiscoveryState,
} from '../lib/matchDiscovery';

/**
 * Discovery UI still uses isolated demo profile data until the matchmaking
 * data milestone. Authentication is enforced by ProtectedRoute (real auth).
 */
export const MatchDiscoveryPage: React.FC = () => {
  const [view, setView] = useState<DiscoveryView>('discover');
  const [state, setState] = useState<MatchDiscoveryState>(() => createInitialDiscoveryState());
  const [draftFilters, setDraftFilters] = useState<DiscoveryFiltersState>(state.filters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailProfile, setDetailProfile] = useState<DiscoveryProfile | null>(null);
  const [matchProfile, setMatchProfile] = useState<DiscoveryProfile | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const sync = () => setIsMobile(window.innerWidth < 1024);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const deck = useMemo(() => filterDeck(state), [state]);
  const triggers = useSwipeTriggers(deck, {
    onPass: (p) => handlePass(p),
    onSave: (p) => handleSave(p),
    onInterested: (p) => handleInterested(p),
  });

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handlePass = (profile: DiscoveryProfile) => {
    setState((s) => applyPass(s, profile.id));
    setDetailProfile(null);
  };

  const handleSave = (profile: DiscoveryProfile) => {
    setState((s) => applySave(s, profile.id));
    showToast(`${profile.firstName} saved to your shortlist`);
  };

  const handleInterested = (profile: DiscoveryProfile) => {
    setState((s) => {
      const result = applyInterest(s, profile.id);
      if (result.mutual) {
        queueMicrotask(() => setMatchProfile(profile));
      } else {
        queueMicrotask(() => showToast(`Interest sent to ${profile.firstName}`));
      }
      return result.state;
    });
    setDetailProfile(null);
  };

  const pendingInterestCount = state.receivedInterests.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9] flex flex-col">
      {/* App header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#060608]/92 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 h-14 sm:h-16">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Dark Secret home">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs sm:text-sm font-bold tracking-[0.24em] uppercase text-white">
                Dark Secret
              </span>
            </Link>
            <span className="hidden sm:block h-4 w-px bg-white/15" />
            <p className="text-sm font-semibold text-zinc-300 truncate">Find a Life Partner</p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              to="/"
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white mr-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
            <IconBtn label="Filters" onClick={() => setFiltersOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Connections" onClick={() => setView('connections')}>
              <Users className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Messages" onClick={() => setView('messages')}>
              <MessageCircle className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Notifications" onClick={() => setView('interests')}>
              <Bell className="h-4 w-4" />
              {pendingInterestCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-purple-500" />
              )}
            </IconBtn>
            <IconBtn label="Profile" onClick={() => setView('profile')}>
              <span className="text-[11px] font-bold tracking-wide">KM</span>
            </IconBtn>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <MatchSidebar
          active={view}
          onChange={setView}
          counts={{
            interests: pendingInterestCount,
            connections: state.connections.length,
            saved: state.savedIds.length,
          }}
        />

        <main className="flex-1 min-w-0 overflow-y-auto pb-24 lg:pb-8">
          {view === 'discover' && (
            <div className="relative px-4 sm:px-6 py-6 sm:py-8">
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_50%_20%,rgba(88,28,135,0.18),transparent_60%)]"
                aria-hidden
              />
              <div className="relative max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-8 flex flex-col items-center">
                  <p className="mb-4 text-sm font-medium text-zinc-400 text-center">
                    Based on your marriage preferences
                  </p>

                  {deck.length === 0 ? (
                    <EmptyDiscoveryState
                      onAdjustPreferences={() => setFiltersOpen(true)}
                      onViewSaved={() => setView('saved')}
                    />
                  ) : (
                    <>
                      <SwipeDeck
                        profiles={deck}
                        onPass={handlePass}
                        onSave={handleSave}
                        onInterested={handleInterested}
                        onOpenProfile={setDetailProfile}
                      />
                      <div className="mt-7 sm:mt-8">
                        <SwipeActions
                          onPass={triggers.pass}
                          onSave={triggers.save}
                          onInterested={triggers.interested}
                          disabled={!deck[0]}
                        />
                      </div>
                      <p className="mt-4 text-xs sm:text-sm text-zinc-500 text-center font-medium">
                        Pass · Save · Interested — or use ← ↑ → keys
                      </p>
                    </>
                  )}
                </div>

                {/* Desktop contextual panel */}
                <div className="hidden xl:block xl:col-span-4">
                  <div className="sticky top-24 rounded-2xl border border-white/[0.08] bg-[#0c0c12] p-5 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
                      Today
                    </h3>
                    {deck[0] ? (
                      <>
                        <p className="text-lg font-semibold text-white">
                          {deck[0].firstName}, {deck[0].age}
                        </p>
                        <p className="text-base text-zinc-300 font-normal leading-relaxed">
                          {deck[0].about.slice(0, 140)}…
                        </p>
                        <button
                          type="button"
                          onClick={() => setDetailProfile(deck[0])}
                          className="text-sm font-semibold text-purple-300 hover:text-purple-200 cursor-pointer"
                        >
                          Open full profile
                        </button>
                      </>
                    ) : (
                      <p className="text-base text-zinc-500">No profiles in your deck.</p>
                    )}
                    <div className="pt-3 border-t border-white/[0.06] text-sm text-zinc-400 space-y-1.5 font-medium">
                      <p>Saved: {state.savedIds.length}</p>
                      <p>Interests sent: {state.sentInterests.length}</p>
                      <p>Connections: {state.connections.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'interests' && (
            <div className="px-4 sm:px-6 py-8">
              <InterestsPanel
                received={state.receivedInterests}
                sent={state.sentInterests}
                onView={(id) => {
                  const p = getProfile(id);
                  if (p) setDetailProfile(p);
                }}
                onAccept={(id) => {
                  const p = getProfile(id);
                  setState((s) => acceptReceivedInterest(s, id));
                  if (p) setMatchProfile(p);
                }}
                onDecline={(id) => setState((s) => declineReceivedInterest(s, id))}
              />
            </div>
          )}

          {view === 'connections' && (
            <div className="px-4 sm:px-6 py-8">
              <ConnectionsPanel
                connections={state.connections}
                onView={(id) => {
                  const p = getProfile(id);
                  if (p) setDetailProfile(p);
                }}
                onMessage={() => setView('messages')}
              />
            </div>
          )}

          {view === 'saved' && (
            <div className="px-4 sm:px-6 py-8">
              <SavedProfilesPanel
                savedIds={state.savedIds}
                onView={(id) => {
                  const p = getProfile(id);
                  if (p) setDetailProfile(p);
                }}
                onInterested={(id) => {
                  const p = getProfile(id);
                  if (p) handleInterested(p);
                }}
              />
            </div>
          )}

          {view === 'messages' && (
            <div className="px-4 sm:px-6 py-8">
              <MessagesPanel
                connections={state.connections}
                onOpen={() =>
                  showToast('Messaging UI ready — opens after mutual connection only')
                }
              />
            </div>
          )}

          {view === 'profile' && (
            <div className="px-4 sm:px-6 py-8">
              <MyProfilePanel />
            </div>
          )}

          {view === 'preferences' && (
            <div className="px-4 sm:px-6 py-8">
              <PreferencesPanel
                onOpenFilters={() => {
                  setDraftFilters(state.filters);
                  setFiltersOpen(true);
                }}
              />
            </div>
          )}
        </main>
      </div>

      <MobileMatchNav
        active={view}
        onChange={setView}
        interestCount={pendingInterestCount}
      />

      <DiscoveryFilters
        open={filtersOpen}
        filters={draftFilters}
        onChange={setDraftFilters}
        onApply={() => setState((s) => ({ ...s, filters: draftFilters }))}
        onReset={() => {
          const reset = defaultFilters();
          setDraftFilters(reset);
          setState((s) => ({ ...s, filters: reset }));
        }}
        onClose={() => setFiltersOpen(false)}
      />

      <AnimatePresence>
        {detailProfile && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/50 cursor-default hidden lg:block"
              aria-label="Close"
              onClick={() => setDetailProfile(null)}
            />
            <ProfileDetail
              profile={detailProfile}
              variant={isMobile ? 'fullscreen' : 'panel'}
              onClose={() => setDetailProfile(null)}
              onReport={(reason) => showToast(`Report submitted: ${reason}`)}
              onBlock={() => {
                setState((s) => blockProfile(s, detailProfile.id));
                setDetailProfile(null);
                showToast(`${detailProfile.firstName} blocked`);
              }}
              onSave={() => handleSave(detailProfile)}
              onInterested={() => handleInterested(detailProfile)}
            />
          </>
        )}
      </AnimatePresence>

      {matchProfile && (
        <MatchModal
          profile={matchProfile}
          onMessage={() => {
            setMatchProfile(null);
            setView('messages');
          }}
          onKeepExploring={() => {
            setMatchProfile(null);
            setView('discover');
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[80] rounded-full border border-white/10 bg-[#12121a] px-5 py-2.5 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
};

function IconBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="relative h-9 w-9 sm:h-10 sm:w-10 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-300 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
    >
      {children}
    </button>
  );
}
