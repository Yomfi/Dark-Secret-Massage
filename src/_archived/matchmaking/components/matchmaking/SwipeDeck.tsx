import React, { useCallback, useEffect, useState } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
  type PanInfo,
} from 'motion/react';
import type { DiscoveryProfile } from '../../data/discoveryProfiles';
import { ProfileSwipeCard } from './ProfileSwipeCard';

const EXIT_X = 480;
const THRESHOLD = 110;

interface SwipeDeckProps {
  profiles: DiscoveryProfile[];
  onPass: (profile: DiscoveryProfile) => void;
  onSave: (profile: DiscoveryProfile) => void;
  onInterested: (profile: DiscoveryProfile) => void;
  onOpenProfile: (profile: DiscoveryProfile) => void;
}

export const SwipeDeck: React.FC<SwipeDeckProps> = ({
  profiles,
  onPass,
  onSave,
  onInterested,
  onOpenProfile,
}) => {
  const reduceMotion = useReducedMotion();
  const [dragX, setDragX] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-14, 0, 14]);

  const active = profiles[0];
  const stack = profiles.slice(0, 3);

  useEffect(() => {
    x.set(0);
    setDragX(0);
  }, [active?.id, x]);

  const exitCard = useCallback(
    async (direction: 'left' | 'right' | 'up', profile: DiscoveryProfile) => {
      const targetX = direction === 'left' ? -EXIT_X : direction === 'right' ? EXIT_X : 0;
      const targetY = direction === 'up' ? -EXIT_X : 0;
      if (reduceMotion) {
        x.set(0);
        setDragX(0);
      } else {
        await animate(x, targetX, { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 });
        if (direction === 'up') {
          // visual only — save doesn't need vertical motion value permanently
        }
        void targetY;
      }

      if (direction === 'left') onPass(profile);
      else if (direction === 'right') onInterested(profile);
      else onSave(profile);

      x.set(0);
      setDragX(0);
    },
    [onInterested, onPass, onSave, reduceMotion, x]
  );

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!active) return;
    const ox = info.offset.x;
    const oy = info.offset.y;

    if (oy < -140 && Math.abs(ox) < 100) {
      void exitCard('up', active);
      return;
    }
    if (ox > THRESHOLD) {
      void exitCard('right', active);
      return;
    }
    if (ox < -THRESHOLD) {
      void exitCard('left', active);
      return;
    }
    animate(x, 0, { type: 'spring', stiffness: 420, damping: 28 });
    setDragX(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        void exitCard('left', active);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        void exitCard('right', active);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        void exitCard('up', active);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, exitCard]);

  if (!active) return null;

  return (
    <div className="relative w-full max-w-[480px] mx-auto aspect-[3/4.35] sm:h-[680px] sm:aspect-auto">
      {stack
        .slice()
        .reverse()
        .map((profile, revIndex) => {
          const indexFromTop = stack.length - 1 - revIndex;
          const isTop = indexFromTop === 0;
          const scale = 1 - indexFromTop * 0.04;
          const yOffset = indexFromTop * 10;

          if (!isTop) {
            return (
              <div
                key={profile.id}
                className="absolute inset-0 pointer-events-none"
                style={{
                  transform: `translateY(${yOffset}px) scale(${scale})`,
                  zIndex: 10 - indexFromTop,
                }}
              >
                <ProfileSwipeCard profile={profile} />
              </div>
            );
          }

          return (
            <motion.div
              key={profile.id}
              className="absolute inset-0 z-20 touch-none cursor-grab active:cursor-grabbing"
              style={{ x, rotate, zIndex: 20 }}
              drag={reduceMotion ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.9}
              onDrag={(_, info) => setDragX(info.offset.x)}
              onDragEnd={handleDragEnd}
            >
              <ProfileSwipeCard
                profile={profile}
                interactive
                dragX={dragX}
                onOpenProfile={() => onOpenProfile(profile)}
              />
            </motion.div>
          );
        })}
    </div>
  );
};

export type SwipeDeckHandle = {
  trigger: (action: 'pass' | 'save' | 'interested') => void;
};

/** Imperative helpers for action buttons */
export function useSwipeTriggers(
  profiles: DiscoveryProfile[],
  handlers: {
    onPass: (p: DiscoveryProfile) => void;
    onSave: (p: DiscoveryProfile) => void;
    onInterested: (p: DiscoveryProfile) => void;
  }
) {
  const active = profiles[0];
  return {
    pass: () => active && handlers.onPass(active),
    save: () => active && handlers.onSave(active),
    interested: () => active && handlers.onInterested(active),
  };
}
