import React from 'react';
import { Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { Section, SectionHeading } from './ui/Layout';

const PILLARS = [
  {
    icon: UserCheck,
    title: 'Reviewed profiles',
    description: 'Verification helps create a more trusted massage marketplace.',
  },
  {
    icon: ShieldCheck,
    title: 'Publication review',
    description:
      'Profiles are reviewed for publication. Identity verification is separate, and only Verified providers can accept bookings.',
  },
  {
    icon: Lock,
    title: 'Privacy & protection',
    description:
      'Privacy controls, reporting tools and secure account access are built into the platform.',
  },
] as const;

export const SafetyTrust: React.FC = () => (
  <Section id="safety" divider>
    <SectionHeading
      eyebrow="Safety & discretion"
      title="Clear standards, quietly held."
      description="Thoughtful standards designed for confidentiality and mutual respect."
      centered
    />

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
      {PILLARS.map(({ icon: Icon, title, description }) => (
        <div
          key={title}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
        >
          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-brand-purple/25 bg-brand-purple/10 text-brand-purple-light">
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <h3 className="text-[15px] font-semibold text-white">{title}</h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-400">{description}</p>
        </div>
      ))}
    </div>
  </Section>
);
