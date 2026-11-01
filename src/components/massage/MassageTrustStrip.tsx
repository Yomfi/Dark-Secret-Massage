import React from 'react';
import { Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { Container } from '../ui/Layout';

const ITEMS = [
  { icon: UserCheck, label: 'Reviewed provider profiles' },
  { icon: Lock, label: 'Private booking details' },
  { icon: ShieldCheck, label: 'Secure, card-free requests' },
] as const;

export const MassageTrustStrip: React.FC = () => (
  <div className="border-t border-white/[0.07]">
    <Container className="py-6">
      <ul className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 sm:gap-y-2">
        {ITEMS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2.5 text-[13px] text-zinc-400">
            <Icon className="h-4 w-4 shrink-0 text-brand-gold-light" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </Container>
  </div>
);
