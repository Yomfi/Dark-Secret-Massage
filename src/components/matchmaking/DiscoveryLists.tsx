import React from 'react';
import { MessageCircle, Check, X } from 'lucide-react';
import { getProfile } from '../../lib/matchDiscovery';
import type { Connection, ReceivedInterest, SentInterest } from '../../lib/matchDiscovery';

export const InterestsPanel: React.FC<{
  received: ReceivedInterest[];
  sent: SentInterest[];
  onView: (id: string) => void;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}> = ({ received, sent, onView, onAccept, onDecline }) => {
  const pending = received.filter((r) => r.status === 'pending');

  return (
    <div className="max-w-2xl mx-auto space-y-8 px-1">
      <div>
        <h2 className="text-2xl font-bold text-white">Interests</h2>
        <p className="mt-1 text-base text-zinc-400 font-normal">
          Review who wants to connect — messaging opens after mutual interest.
        </p>
      </div>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300 mb-3">
          Received ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-base text-zinc-500">No new interests right now.</p>
        ) : (
          <div className="space-y-3">
            {pending.map((item) => {
              const p = getProfile(item.profileId);
              if (!p) return null;
              return (
                <div
                  key={item.profileId}
                  className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4"
                >
                  <img
                    src={p.photos[0]}
                    alt={p.firstName}
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-white">
                      {p.firstName}, {p.age}
                    </p>
                    <p className="text-sm text-zinc-400 truncate">
                      {p.city} · {p.profession}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => onView(p.id)}
                      className="text-xs font-semibold uppercase tracking-wider text-zinc-300 cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => onAccept(p.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-2 text-xs font-semibold text-white cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecline(p.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300 mb-3">
          Sent ({sent.length})
        </h3>
        {sent.length === 0 ? (
          <p className="text-base text-zinc-500">You haven&apos;t sent interest yet.</p>
        ) : (
          <div className="space-y-3">
            {sent.map((item) => {
              const p = getProfile(item.profileId);
              if (!p) return null;
              return (
                <button
                  key={item.profileId}
                  type="button"
                  onClick={() => onView(p.id)}
                  className="w-full flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 sm:p-4 text-left cursor-pointer hover:border-white/20"
                >
                  <img src={p.photos[0]} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <div>
                    <p className="text-base font-semibold text-white">
                      {p.firstName}, {p.age}
                    </p>
                    <p className="text-sm text-zinc-400">Interest sent · awaiting response</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export const ConnectionsPanel: React.FC<{
  connections: Connection[];
  onMessage: (id: string) => void;
  onView: (id: string) => void;
}> = ({ connections, onMessage, onView }) => (
  <div className="max-w-2xl mx-auto space-y-6 px-1">
    <div>
      <h2 className="text-2xl font-bold text-white">Connections</h2>
      <p className="mt-1 text-base text-zinc-400">Mutual interest confirmed. You can message privately.</p>
    </div>
    {connections.length === 0 ? (
      <p className="text-base text-zinc-500">No connections yet. Keep exploring intentionally.</p>
    ) : (
      <div className="space-y-3">
        {connections.map((c) => {
          const p = getProfile(c.profileId);
          if (!p) return null;
          return (
            <div
              key={c.profileId}
              className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
            >
              <button type="button" onClick={() => onView(p.id)} className="cursor-pointer">
                <img src={p.photos[0]} alt="" className="h-16 w-16 rounded-xl object-cover" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white">
                  {p.firstName}, {p.age}
                </p>
                <p className="text-sm text-zinc-400">
                  {p.city} · Connected {new Date(c.at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onMessage(p.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white cursor-pointer"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Message
              </button>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export const SavedProfilesPanel: React.FC<{
  savedIds: string[];
  onView: (id: string) => void;
  onInterested: (id: string) => void;
}> = ({ savedIds, onView, onInterested }) => (
  <div className="max-w-2xl mx-auto space-y-6 px-1">
    <div>
      <h2 className="text-2xl font-bold text-white">Saved profiles</h2>
      <p className="mt-1 text-base text-zinc-400">
        Shortlisted without sending interest — review when you&apos;re ready.
      </p>
    </div>
    {savedIds.length === 0 ? (
      <p className="text-base text-zinc-500">No saved profiles yet.</p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {savedIds.map((id) => {
          const p = getProfile(id);
          if (!p) return null;
          return (
            <div key={id} className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white/[0.02]">
              <button type="button" onClick={() => onView(id)} className="w-full cursor-pointer">
                <img src={p.photos[0]} alt="" className="h-48 w-full object-cover object-top" />
              </button>
              <div className="p-4">
                <p className="text-base font-semibold text-white">
                  {p.firstName}, {p.age}
                </p>
                <p className="text-sm text-zinc-400">{p.profession}</p>
                <button
                  type="button"
                  onClick={() => onInterested(id)}
                  className="mt-3 text-xs font-semibold uppercase tracking-wider text-purple-300 cursor-pointer"
                >
                  Express interest
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export const MessagesPanel: React.FC<{
  connections: Connection[];
  onOpen: (id: string) => void;
}> = ({ connections, onOpen }) => (
  <div className="max-w-2xl mx-auto space-y-6 px-1">
    <div>
      <h2 className="text-2xl font-bold text-white">Messages</h2>
      <p className="mt-1 text-base text-zinc-400">
        Conversations unlock only after mutual connection.
      </p>
    </div>
    {connections.length === 0 ? (
      <p className="text-base text-zinc-500">No conversations yet.</p>
    ) : (
      <div className="space-y-2">
        {connections.map((c) => {
          const p = getProfile(c.profileId);
          if (!p) return null;
          return (
            <button
              key={c.profileId}
              type="button"
              onClick={() => onOpen(c.profileId)}
              className="w-full flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-left hover:border-purple-500/30 cursor-pointer"
            >
              <img src={p.photos[0]} alt="" className="h-12 w-12 rounded-full object-cover" />
              <div>
                <p className="text-base font-semibold text-white">{p.firstName}</p>
                <p className="text-sm text-zinc-500">Start a private conversation</p>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export const MyProfilePanel: React.FC = () => (
  <div className="max-w-xl mx-auto space-y-4 px-1">
    <h2 className="text-2xl font-bold text-white">My profile</h2>
    <p className="text-base text-zinc-400 font-normal leading-relaxed">
      Demo account for Kwabena. Full profile editing and authentication guards can be connected
      here without changing the discovery experience.
    </p>
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-2 text-base">
      <p className="text-white font-semibold">Kwabena, 33</p>
      <p className="text-zinc-300">Accra, Greater Accra</p>
      <p className="text-zinc-400">Seeking marriage · Christian values</p>
    </div>
  </div>
);

export const PreferencesPanel: React.FC<{ onOpenFilters: () => void }> = ({ onOpenFilters }) => (
  <div className="max-w-xl mx-auto space-y-4 px-1">
    <h2 className="text-2xl font-bold text-white">Preferences</h2>
    <p className="text-base text-zinc-400 font-normal leading-relaxed">
      Based on your marriage preferences. Discovery results respect age, faith, and location filters.
    </p>
    <button
      type="button"
      onClick={onOpenFilters}
      className="rounded-full bg-purple-600 px-6 py-3.5 text-sm font-semibold uppercase tracking-wider text-white cursor-pointer"
    >
      Edit discovery filters
    </button>
  </div>
);
