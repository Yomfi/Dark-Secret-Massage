import React, { useState } from 'react';
import {
  ShieldCheck,
  Heart,
  Calendar,
  MessageSquare,
  Lock,
  User,
  ArrowLeft,
  Sparkles,
  Clock,
  MapPin,
  CheckCircle2,
  Send,
  EyeOff,
  Bell,
  Settings,
} from 'lucide-react';
import { MatchmakingProfile, BookingRequest } from '../lib/bookingAndMatchmaking';
import { MATCHMAKING_PROFILES, CERTIFIED_THERAPISTS } from '../data/mockData';
import { VisualMedia } from './VisualMedia';

interface ClientDashboardProps {
  onBackToHome: () => void;
  onOpenMatchmaking: () => void;
  onOpenBooking: () => void;
  userBookings: Array<BookingRequest & { totalGHS: number; id: string }>;
  userIntroductions: Array<{ profile: MatchmakingProfile; note: string; status: string; date: string }>;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  onBackToHome,
  onOpenMatchmaking,
  onOpenBooking,
  userBookings,
  userIntroductions,
}) => {
  const [activeTab, setActiveTab] = useState<'matchmaking' | 'massage' | 'messages' | 'privacy'>('matchmaking');
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string; isUser: boolean }>>([
    {
      sender: 'Relationship Concierge',
      text: 'Good afternoon, Mr. Mensah. Your credentials have been authenticated. We are currently curating an introduction with a senior counsel based in Airport Residential who shares your Methodist faith and family vision.',
      time: '10:14 AM',
      isUser: false,
    },
    {
      sender: 'Wellness Director',
      text: 'Your upcoming Deep Tissue Recovery session with Akua Darko, RMT is confirmed. Our therapist will arrive equipped with organic Ghanaian shea infusions and sterile clinical linens.',
      time: 'Yesterday',
      isUser: false,
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [privateMode, setPrivateMode] = useState(true);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = {
      sender: 'Kwabena Mensah',
      text: newMessage,
      time: 'Just now',
      isUser: true,
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage('');

    // Simulated concierge reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'Concierge Support',
          text: 'Thank you for your note. Your personal liaison has been notified and will respond discreetly shortly.',
          time: 'Just now',
          isUser: false,
        },
      ]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-200">
      {/* Top Shell Navigation */}
      <header className="sticky top-0 z-40 bg-[#09090e]/95 backdrop-blur-md border-b border-white/[0.08] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Public Showcase</span>
            </button>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-sm font-bold tracking-[0.25em] uppercase text-white font-sans">
                DARK SECRET
              </span>
              <span className="text-[10px] uppercase font-mono tracking-wider text-purple-300 bg-purple-950/60 border border-purple-500/20 px-2 py-0.5 rounded-full ml-1">
                Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ID Verified · Member GH-8891</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                KM
              </div>
              <div className="hidden lg:block text-left text-xs">
                <div className="font-semibold text-white">Kwabena Mensah</div>
                <div className="text-zinc-500 text-[10px]">Accra & London</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto space-x-2 border-b border-white/[0.08] pb-4 mb-8">
          <button
            onClick={() => setActiveTab('matchmaking')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'matchmaking'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Matrimonial Introductions ({userIntroductions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('massage')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'massage'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Massage Bookings ({userBookings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'messages'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Concierge Messages</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Privacy & Vetting</span>
          </button>
        </div>

        {/* Tab 1: Matchmaking Introductions */}
        {activeTab === 'matchmaking' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Your Matrimonial Introductions
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Private introductions are arranged only upon mutual consent and identity vetting.
                </p>
              </div>
              <button
                onClick={onOpenMatchmaking}
                className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 rounded-full transition-all cursor-pointer self-start sm:self-auto"
              >
                + Browse Verified Candidates
              </button>
            </div>

            {/* List of active introduction requests */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userIntroductions.map((intro, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <VisualMedia
                        type={`avatar-${intro.profile.avatarSeed}` as any}
                        className="w-12 h-12"
                        alt={intro.profile.fullName}
                      />
                      <div>
                        <div className="text-base font-bold text-white">
                          {intro.profile.fullName} ({intro.profile.age})
                        </div>
                        <div className="text-xs text-zinc-400">{intro.profile.profession}</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-full">
                      {intro.status}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300 bg-black/40 p-3.5 rounded-xl border border-white/5">
                    <span className="text-zinc-500 block mb-1">Your confidential note:</span>
                    "{intro.note}"
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">
                    <span>Dispatched on {intro.date}</span>
                    <span className="text-purple-400 font-medium">Liaison Reviewing</span>
                  </div>
                </div>
              ))}

              {/* Sample pre-existing curated match */}
              <div className="rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <VisualMedia
                      type="avatar-ama"
                      className="w-12 h-12"
                      alt="Ama Serwaa Mensah"
                    />
                    <div>
                      <div className="text-base font-bold text-white">
                        Ama Serwaa Mensah (29)
                      </div>
                      <div className="text-xs text-zinc-400">Senior Corporate Counsel · Accra</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    Mutual Match Accepted
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Both parties have approved private dining coordination. Your concierge has reserved a quiet
                  table at Villa Monticello, Airport Residential for Saturday at 7:30 PM.
                </p>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Curated Date: This Saturday</span>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className="text-purple-400 hover:text-purple-300 font-medium uppercase tracking-wider text-[11px]"
                  >
                    View Concierge Plan →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Massage Bookings */}
        {activeTab === 'massage' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  Your Massage Appointments
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Professional wellness appointments adhering to hospital-grade hygiene and strict privacy.
                </p>
              </div>
              <button
                onClick={onOpenBooking}
                className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-500 rounded-full transition-all cursor-pointer self-start sm:self-auto"
              >
                + Book New Wellness Session
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userBookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">
                        {b.locationType === 'studio' ? 'Private Studio Sanctuary' : 'In-Home Visit'}
                      </span>
                      <h4 className="text-lg font-bold text-white mt-0.5">{b.serviceType}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-300">
                      GHS {b.totalGHS}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 bg-black/30 p-3 rounded-xl border border-white/5">
                    <div>
                      <span className="text-zinc-500 block text-[11px]">Date & Time</span>
                      <span className="font-medium text-white">{b.date} · {b.timeSlot}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[11px]">Duration</span>
                      <span className="font-medium text-white">{b.durationMinutes} Minutes</span>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-400 flex items-center justify-between pt-2">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmed with Certified Therapist</span>
                    </span>
                    <button
                      onClick={() => alert(`Your session reference is ${b.id}. For rescheduling, please message your concierge.`)}
                      className="text-purple-400 hover:text-purple-300 text-xs font-medium cursor-pointer"
                    >
                      Session Details
                    </button>
                  </div>
                </div>
              ))}

              {/* Sample standard confirmed session */}
              <div className="rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">
                      Private Studio Sanctuary
                    </span>
                    <h4 className="text-lg font-bold text-white mt-0.5">
                      Volcanic Hot Stone Ritual
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-300">GHS 800</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300 bg-black/30 p-3 rounded-xl border border-white/5">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Date & Time</span>
                    <span className="font-medium text-white">Oct 24, 2026 · 16:30</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Therapist</span>
                    <span className="font-medium text-white">Akua Darko, RMT</span>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 flex items-center justify-between pt-2">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Airport Residential Studio</span>
                  </span>
                  <span className="text-zinc-500 font-mono text-[11px]">Ref: #DS-HOT-281</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Concierge Messaging UI */}
        {activeTab === 'messages' && (
          <div className="rounded-3xl bg-[#0c0c14] border border-white/[0.08] overflow-hidden max-w-4xl mx-auto flex flex-col h-[600px]">
            {/* Chat header */}
            <div className="px-6 py-4 bg-[#09090e] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm">
                  DS
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Private Concierge Desk (Accra & London)
                  </h3>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Discreet Encrypted Channel</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-zinc-500">256-bit SSL</div>
            </div>

            {/* Chat message stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[80%] ${
                    m.isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                  }`}
                >
                  <span className="text-[10px] text-zinc-500 mb-1 px-1">
                    {m.sender} · {m.time}
                  </span>
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      m.isUser
                        ? 'bg-purple-600 text-white rounded-tr-none'
                        : 'bg-[#141420] text-zinc-200 border border-white/10 rounded-tl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat input form */}
            <form
              onSubmit={handleSendMessage}
              className="p-4 bg-[#09090e] border-t border-white/[0.08] flex items-center gap-3"
            >
              <input
                type="text"
                placeholder="Message your relationship liaison or wellness director..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/[0.04] border border-white/10 rounded-full text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-lg"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tab 4: Privacy & Vetting Profile Controls */}
        {activeTab === 'privacy' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="rounded-2xl bg-[#0c0c14] border border-white/[0.08] p-6 sm:p-8 space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-purple-400" />
                <span>Confidentiality & Profile Settings</span>
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <div className="text-sm font-semibold text-white">Discreet Anonymous Mode</div>
                    <div className="text-xs text-zinc-400">
                      Hides career specific names from potential matches until mutual introduction approval.
                    </div>
                  </div>
                  <button
                    onClick={() => setPrivateMode(!privateMode)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      privateMode ? 'bg-purple-600' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        privateMode ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <div className="text-sm font-semibold text-white">Government ID Verification</div>
                    <div className="text-xs text-zinc-400">
                      Ghana National ID Card verified on record. Re-verification scheduled in 12 months.
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full">
                    Active & Verified
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <div className="text-sm font-semibold text-white">Billing Confidentiality</div>
                    <div className="text-xs text-zinc-400">
                      Bank and card statements reflect discreet neutral descriptor "DS MGMT ACCRA".
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">Enforced</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex justify-between items-center text-xs text-zinc-500">
                <span>Want to pause or archive your membership?</span>
                <button
                  onClick={() => alert('Your request to pause membership has been sent to your concierge.')}
                  className="text-purple-400 hover:text-purple-300 font-medium cursor-pointer"
                >
                  Contact Concierge
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
