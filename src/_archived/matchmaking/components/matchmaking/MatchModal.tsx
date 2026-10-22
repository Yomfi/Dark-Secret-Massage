import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { DiscoveryProfile } from '../../data/discoveryProfiles';
import { CURRENT_DEMO_USER } from '../../data/discoveryProfiles';

interface MatchModalProps {
  profile: DiscoveryProfile;
  onMessage: () => void;
  onKeepExploring: () => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  profile,
  onMessage,
  onKeepExploring,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0c14] p-6 sm:p-8 text-center shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-300 mb-3">
          Mutual interest
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          You both want to connect.
        </h2>
        <p className="mt-3 text-base text-zinc-300 font-normal leading-relaxed">
          Start a private conversation and get to know each other intentionally.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <div
            className="h-24 w-24 rounded-full border-2 border-purple-400/50 -rotate-3 bg-gradient-to-br from-purple-900 to-[#1a1028] flex items-center justify-center text-xl font-bold text-purple-100"
            aria-label={CURRENT_DEMO_USER.firstName}
          >
            KM
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-200 text-lg">
            ✦
          </div>
          <img
            src={profile.photos[0]}
            alt={profile.firstName}
            className="h-24 w-24 rounded-full object-cover border-2 border-purple-400/50 rotate-3"
          />
        </div>

        <p className="mt-5 text-sm font-medium text-zinc-400">
          {CURRENT_DEMO_USER.firstName} & {profile.firstName}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={onMessage}
            className="w-full rounded-full bg-purple-600 py-3.5 text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-500 cursor-pointer"
          >
            Send a message
          </button>
          <button
            type="button"
            onClick={onKeepExploring}
            className="w-full rounded-full border border-white/15 py-3.5 text-sm font-semibold uppercase tracking-wider text-zinc-200 hover:text-white cursor-pointer"
          >
            Keep exploring
          </button>
        </div>
      </motion.div>
    </div>
  );
};
