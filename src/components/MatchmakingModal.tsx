import React, { useState } from 'react';
import { X, Search, Filter, ShieldCheck, Heart, MapPin, Briefcase, GraduationCap, Clock, CheckCircle } from 'lucide-react';
import { MATCHMAKING_PROFILES } from '../data/mockData';
import { filterProfiles, MatchmakingProfile } from '../lib/bookingAndMatchmaking';
import { VisualMedia } from './VisualMedia';

interface MatchmakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestIntro: (profile: MatchmakingProfile, note: string) => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  isOpen,
  onClose,
  onRequestIntro,
}) => {
  const [search, setSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedFaith, setSelectedFaith] = useState('all');
  const [activeProfile, setActiveProfile] = useState<MatchmakingProfile | null>(null);
  const [introNote, setIntroNote] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  if (!isOpen) return null;

  const filtered = filterProfiles(MATCHMAKING_PROFILES, {
    searchQuery: search,
    location: selectedLocation === 'all' ? undefined : selectedLocation,
    faith: selectedFaith === 'all' ? undefined : selectedFaith,
  });

  const handleSendIntro = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeProfile) {
      onRequestIntro(activeProfile, introNote);
      setRequestSent(true);
      setTimeout(() => {
        setRequestSent(false);
        setActiveProfile(null);
        setIntroNote('');
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-[#09090e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-white/[0.08] bg-[#0c0c14]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.25em] text-purple-400">
                PRIVATE MATRIMONIAL GUILD
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified Profiles</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Find a Life Partner
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-6 sm:px-8 py-4 border-b border-white/[0.06] bg-[#07070a] flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by career, city, or values..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Location:</span>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">All Locations</option>
              <option value="Accra">Accra (Airport/Cantonments)</option>
              <option value="London">London & Diaspora</option>
              <option value="Kumasi">Kumasi</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Faith:</span>
            <select
              value={selectedFaith}
              onChange={(e) => setSelectedFaith(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="all">All Faiths</option>
              <option value="Christian">Christian</option>
            </select>
          </div>
        </div>

        {/* Profile List & Detail View */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {activeProfile ? (
            /* Detailed Profile View */
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-150">
              <button
                onClick={() => setActiveProfile(null)}
                className="text-xs font-semibold uppercase tracking-wider text-purple-400 hover:text-purple-300 cursor-pointer inline-flex items-center gap-1.5 mb-2"
              >
                <span>← Back to all candidate profiles</span>
              </button>

              <div className="rounded-3xl bg-[#0e0e16] border border-white/10 p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <VisualMedia
                      type={`avatar-${activeProfile.avatarSeed}` as any}
                      className="w-16 h-16 text-xl"
                      alt={activeProfile.fullName}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl sm:text-2xl font-bold text-white">
                          {activeProfile.fullName}
                        </h3>
                        <span className="text-zinc-400 font-light text-lg">· {activeProfile.age}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-purple-300 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{activeProfile.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full self-start">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Identity & Pedigree Verified</span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/[0.08] text-xs">
                  <div>
                    <div className="text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                      <span>Profession</span>
                    </div>
                    <div className="text-zinc-200 font-medium">{activeProfile.profession}</div>
                  </div>

                  <div>
                    <div className="text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
                      <span>Academic Pedigree</span>
                    </div>
                    <div className="text-zinc-200 font-medium">{activeProfile.education}</div>
                  </div>

                  <div>
                    <div className="text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>Marriage Intent Timeline</span>
                    </div>
                    <div className="text-zinc-200 font-medium">{activeProfile.marriageTimeline}</div>
                  </div>

                  <div>
                    <div className="text-zinc-500 uppercase tracking-wider mb-1">Faith & Conviction</div>
                    <div className="text-zinc-200 font-medium">{activeProfile.faith}</div>
                  </div>
                </div>

                {/* Bio */}
                <div className="pt-4 border-t border-white/[0.08]">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-medium">
                    Personal Statement & Life Values
                  </div>
                  <p className="text-sm text-zinc-300 leading-relaxed italic bg-black/30 p-4 rounded-2xl border border-white/5">
                    "{activeProfile.bio}"
                  </p>
                </div>

                {/* Core values */}
                <div>
                  <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2 font-medium">
                    Core Pillars
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeProfile.values.map((val) => (
                      <span
                        key={val}
                        className="text-xs text-purple-200 bg-purple-950/40 border border-purple-500/20 px-3 py-1 rounded-full font-medium"
                      >
                        {val}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Request Introduction Form */}
                <div className="pt-6 border-t border-white/[0.08]">
                  {requestSent ? (
                    <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <div className="text-xs sm:text-sm">
                        Introduction request dispatched. Your relationship concierge will review within 24 hours.
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSendIntro} className="space-y-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium">
                          Discreet Introduction Request Note
                        </label>
                        <textarea
                          rows={3}
                          value={introNote}
                          onChange={(e) => setIntroNote(e.target.value)}
                          placeholder="Introduce yourself discreetly: note shared values, lifestyle alignment, and availability for a curated private meeting..."
                          className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                          required
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-zinc-500">
                          Discreet protocol: neither party receives contact info until mutual consent.
                        </div>
                        <button
                          type="submit"
                          className="px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 rounded-full transition-all cursor-pointer shadow-lg shadow-purple-900/40"
                        >
                          Request Discreet Intro
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Candidate Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((profile) => (
                <div
                  key={profile.id}
                  onClick={() => setActiveProfile(profile)}
                  className="group rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-6 hover:border-purple-500/40 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <VisualMedia
                        type={`avatar-${profile.avatarSeed}` as any}
                        className="w-12 h-12"
                        alt={profile.fullName}
                      />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 mb-1">
                      <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                        {profile.fullName}
                      </h4>
                      <span className="text-xs text-zinc-400 font-light">{profile.age}</span>
                    </div>

                    <div className="text-xs text-zinc-400 font-light mb-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="truncate">{profile.location}</span>
                    </div>

                    <p className="text-xs text-zinc-300 font-medium line-clamp-1 mb-2">
                      {profile.profession}
                    </p>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed italic mb-4">
                      "{profile.bio}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {profile.marriageTimeline}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 group-hover:text-purple-300">
                      View Profile →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
