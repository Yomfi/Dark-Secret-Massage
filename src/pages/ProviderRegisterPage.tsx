import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { providerApi } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { MARKETPLACE_CITIES } from '../data/locations';

type Step =
  | 'account'
  | 'phone'
  | 'email'
  | 'profile'
  | 'identity'
  | 'payment'
  | 'review';

const STEPS: { id: Step; label: string }[] = [
  { id: 'account', label: 'Your Details' },
  { id: 'phone', label: 'Phone' },
  { id: 'email', label: 'Email' },
  { id: 'profile', label: 'Profile' },
  { id: 'identity', label: 'Identity' },
  { id: 'payment', label: 'Fee' },
  { id: 'review', label: 'Review' },
];

function profileFormError(err: unknown): string {
  return getAuthErrorMessage(err);
}

function validateAccountStep(account: {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}): string | null {
  if (!account.firstName.trim()) return 'Enter a valid first name.';
  if (!account.lastName.trim()) return 'Enter a valid last name.';
  if (!account.displayName.trim()) return 'Display name is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email.trim())) {
    return 'Enter a valid email address.';
  }
  const phone = account.phone.trim();
  if (!/^[+\d][\d\s()-]{7,}$/.test(phone) || phone.replace(/\D/g, '').length < 9) {
    return 'Enter a valid phone number.';
  }
  if (account.password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(account.password) || !/[0-9]/.test(account.password)) {
    return 'Password must include a letter and a number.';
  }
  if (account.password !== account.confirmPassword) return 'Passwords do not match.';
  if (!account.termsAccepted) return 'Please accept the terms to continue.';
  return null;
}

export const ProviderRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [step, setStep] = useState<Step>('account');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoPhoneCode, setDemoPhoneCode] = useState<string | null>(null);
  const [demoEmailToken, setDemoEmailToken] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [emailToken, setEmailToken] = useState('');
  const [paymentMessage, setPaymentMessage] = useState(
    'Verification payment integration coming soon',
  );

  const [account, setAccount] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  });

  const [profile, setProfile] = useState({
    displayName: '',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    about: '',
    services: 'Swedish Massage, Relaxation Massage',
    startingPrice: '350',
    availability: 'flexible',
    serviceSetting: ['studio'] as string[],
    languages: 'English, Twi',
    primaryImage: '/profiles/demo-ama-k.jpg',
    publicPhone: true,
    publicWhatsapp: true,
    publicEmail: false,
  });

  const [identity, setIdentity] = useState({
    idType: 'Ghana Card',
    idNumber: '',
    idImage: null as File | null,
    selfieImage: null as File | null,
  });

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const onCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const localError = validateAccountStep(account);
    if (localError) {
      setError(localError);
      return;
    }
    setLoading(true);
    try {
      await providerApi.register({
        firstName: account.firstName.trim(),
        lastName: account.lastName.trim(),
        displayName: account.displayName.trim(),
        email: account.email.trim(),
        phone: account.phone.trim(),
        password: account.password,
        confirmPassword: account.confirmPassword,
        termsAccepted: true,
      });
      await refreshSession();
      setProfile((p) => ({
        ...p,
        displayName: account.displayName.trim(),
      }));
      setStep('phone');
      const sent = await providerApi.sendPhoneCode();
      if (sent.demoCode) setDemoPhoneCode(sent.demoCode);
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await providerApi.verifyPhone(phoneCode.trim());
      await refreshSession();
      setStep('email');
      const sent = await providerApi.sendEmailCode();
      if (sent.demoToken) setDemoEmailToken(sent.demoToken);
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await providerApi.verifyEmail(emailToken.trim());
      await refreshSession();
      setStep('profile');
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await providerApi.saveProfile({
        displayName: profile.displayName.trim(),
        city: profile.city,
        region: profile.region,
        country: profile.country,
        about: profile.about,
        services: profile.services.split(',').map((s) => s.trim()).filter(Boolean),
        startingPrice: Number(profile.startingPrice) || null,
        availability: profile.availability,
        serviceSetting: profile.serviceSetting,
        languages: profile.languages.split(',').map((s) => s.trim()).filter(Boolean),
        primaryImage: profile.primaryImage,
        gallery: [profile.primaryImage],
        publicPhone: profile.publicPhone,
        publicWhatsapp: profile.publicWhatsapp,
        publicEmail: profile.publicEmail,
      });
      setStep('identity');
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  const onSubmitIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identity.idImage || !identity.selfieImage) {
      setError('Upload both a government ID image and a selfie.');
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('idType', identity.idType);
      form.append('idNumber', identity.idNumber);
      form.append('idImage', identity.idImage);
      form.append('selfieImage', identity.selfieImage);
      await providerApi.submitIdentity(form);
      setStep('payment');
      const pay = await providerApi.getPayment();
      setPaymentMessage(pay.message);
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  const onPaymentContinue = async () => {
    setError(null);
    setLoading(true);
    try {
      const pay = await providerApi.initiatePayment();
      setPaymentMessage(pay.message);
      setStep('review');
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  const onSubmitReview = async () => {
    setError(null);
    setLoading(true);
    try {
      await providerApi.submitReview();
      navigate('/provider/dashboard', { replace: true });
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  const field =
    'w-full min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-100 outline-none focus:border-purple-400/40';

  const cities = useMemo(() => MARKETPLACE_CITIES.map((c) => c.name), []);

  return (
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9]">
      <header className="border-b border-white/[0.06] px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-sm font-bold tracking-[0.28em] uppercase text-white">Dark Secret</span>
        </Link>
        <Link to="/login" className="text-xs uppercase tracking-widest text-zinc-400 hover:text-white">
          Sign In
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-purple-300">
          Create Your Profile
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white tracking-tight">Create Your Dark Secret Profile</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Create your public profile, verify your contact details and complete verification to earn the verified badge.
        </p>

        <ol className="mt-6 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                i <= stepIndex
                  ? 'border-purple-400/40 bg-purple-500/15 text-purple-100'
                  : 'border-white/10 text-zinc-500'
              }`}
            >
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>

        {error && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-white/[0.08] bg-[#0a0a10] p-6 sm:p-8">
          {step === 'account' && (
            <form onSubmit={onCreateAccount} className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Step 1 — Your Details</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <input className={field} placeholder="First name" required value={account.firstName}
                  onChange={(e) => setAccount({ ...account, firstName: e.target.value })} />
                <input className={field} placeholder="Last name" required value={account.lastName}
                  onChange={(e) => setAccount({ ...account, lastName: e.target.value })} />
              </div>
              <input className={field} placeholder="Display name" required value={account.displayName}
                onChange={(e) => setAccount({ ...account, displayName: e.target.value })} />
              <input className={field} type="email" placeholder="Email" required value={account.email}
                onChange={(e) => setAccount({ ...account, email: e.target.value })} />
              <input className={field} placeholder="Phone" required value={account.phone}
                onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
              <input className={field} type="password" placeholder="Password" required value={account.password}
                onChange={(e) => setAccount({ ...account, password: e.target.value })} />
              <input className={field} type="password" placeholder="Confirm password" required value={account.confirmPassword}
                onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })} />
              <label className="flex items-start gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={account.termsAccepted}
                  onChange={(e) => setAccount({ ...account, termsAccepted: e.target.checked })}
                />
                I accept the Terms and Privacy Policy. My profile starts unverified.
              </label>
              <button disabled={loading} type="submit" className="w-full min-h-[48px] rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-widest text-white disabled:opacity-60">
                {loading ? 'Creating…' : 'Create Your Profile'}
              </button>
            </form>
          )}

          {step === 'phone' && (
            <form onSubmit={onVerifyPhone} className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Step 2 — Phone verification</h2>
              <p className="text-sm text-zinc-400">Enter the 6-digit code sent to your phone.</p>
              {demoPhoneCode && (
                <p className="text-xs text-amber-200/90 rounded-lg border border-amber-500/20 bg-amber-950/30 px-3 py-2">
                  Demo mode code: <strong>{demoPhoneCode}</strong>
                </p>
              )}
              <input className={field} inputMode="numeric" maxLength={6} placeholder="6-digit code" required
                value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)} />
              <div className="flex gap-2">
                <button type="button" disabled={loading} onClick={async () => {
                  setError(null);
                  try {
                    const sent = await providerApi.sendPhoneCode();
                    if (sent.demoCode) setDemoPhoneCode(sent.demoCode);
                  } catch (err) {
                    setError(profileFormError(err));
                  }
                }} className="flex-1 min-h-[44px] rounded-full border border-white/15 text-xs uppercase tracking-widest">
                  Resend
                </button>
                <button disabled={loading} type="submit" className="flex-1 min-h-[44px] rounded-full bg-purple-600 text-xs uppercase tracking-widest text-white">
                  Verify phone
                </button>
              </div>
            </form>
          )}

          {step === 'email' && (
            <form onSubmit={onVerifyEmail} className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Step 3 — Email verification</h2>
              <p className="text-sm text-zinc-400">Paste the email verification token.</p>
              {demoEmailToken && (
                <p className="text-xs text-amber-200/90 rounded-lg border border-amber-500/20 bg-amber-950/30 px-3 py-2 break-all">
                  Demo mode token: <strong>{demoEmailToken}</strong>
                </p>
              )}
              <input className={field} placeholder="Verification token" required value={emailToken}
                onChange={(e) => setEmailToken(e.target.value)} />
              <div className="flex gap-2">
                <button type="button" disabled={loading} onClick={async () => {
                  setError(null);
                  try {
                    const sent = await providerApi.sendEmailCode();
                    if (sent.demoToken) setDemoEmailToken(sent.demoToken);
                  } catch (err) {
                    setError(profileFormError(err));
                  }
                }} className="flex-1 min-h-[44px] rounded-full border border-white/15 text-xs uppercase tracking-widest">
                  Resend
                </button>
                <button disabled={loading} type="submit" className="flex-1 min-h-[44px] rounded-full bg-purple-600 text-xs uppercase tracking-widest text-white">
                  Verify email
                </button>
              </div>
            </form>
          )}

          {step === 'profile' && (
            <form onSubmit={onSaveProfile} className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Step 4 — Your Profile</h2>
              <p className="text-sm text-zinc-400">Saved as unverified until admin approval.</p>
              <input className={field} placeholder="Display name" required value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} />
              <div className="grid sm:grid-cols-2 gap-3">
                <select className={field} value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input className={field} placeholder="Region" value={profile.region}
                  onChange={(e) => setProfile({ ...profile, region: e.target.value })} />
              </div>
              <input className={field} placeholder="Country" value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })} />
              <textarea className={`${field} min-h-[100px] py-3`} placeholder="About" value={profile.about}
                onChange={(e) => setProfile({ ...profile, about: e.target.value })} />
              <input className={field} placeholder="Services (comma separated)" value={profile.services}
                onChange={(e) => setProfile({ ...profile, services: e.target.value })} />
              <input className={field} type="number" min={0} placeholder="Starting price (GHS)" value={profile.startingPrice}
                onChange={(e) => setProfile({ ...profile, startingPrice: e.target.value })} />
              <select className={field} value={profile.availability}
                onChange={(e) => setProfile({ ...profile, availability: e.target.value })}>
                <option value="today">Available today</option>
                <option value="this_week">This week</option>
                <option value="flexible">Flexible</option>
              </select>
              <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
                {(['studio', 'in_home', 'flexible'] as const).map((s) => (
                  <label key={s} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profile.serviceSetting.includes(s)}
                      onChange={(e) => {
                        setProfile({
                          ...profile,
                          serviceSetting: e.target.checked
                            ? [...profile.serviceSetting, s]
                            : profile.serviceSetting.filter((x) => x !== s),
                        });
                      }}
                    />
                    {s === 'in_home' ? 'In-home' : s[0].toUpperCase() + s.slice(1)}
                  </label>
                ))}
              </div>
              <input className={field} placeholder="Languages" value={profile.languages}
                onChange={(e) => setProfile({ ...profile, languages: e.target.value })} />
              <div className="flex flex-col gap-2 text-sm text-zinc-300">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={profile.publicPhone}
                    onChange={(e) => setProfile({ ...profile, publicPhone: e.target.checked })} />
                  Public phone visibility
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={profile.publicWhatsapp}
                    onChange={(e) => setProfile({ ...profile, publicWhatsapp: e.target.checked })} />
                  Public WhatsApp visibility
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={profile.publicEmail}
                    onChange={(e) => setProfile({ ...profile, publicEmail: e.target.checked })} />
                  Public email visibility
                </label>
              </div>
              <button disabled={loading} type="submit" className="w-full min-h-[48px] rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-widest text-white">
                Save profile
              </button>
            </form>
          )}

          {step === 'identity' && (
            <form onSubmit={onSubmitIdentity} className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Step 5 — Identity verification</h2>
              <p className="text-sm text-zinc-400">
                ID documents are private and never shown on public profiles.
              </p>
              <select className={field} value={identity.idType}
                onChange={(e) => setIdentity({ ...identity, idType: e.target.value })}>
                <option>Ghana Card</option>
                <option>Passport</option>
                <option>Driver Licence</option>
                <option>Voter ID</option>
              </select>
              <input className={field} placeholder="ID number (optional)" value={identity.idNumber}
                onChange={(e) => setIdentity({ ...identity, idNumber: e.target.value })} />
              <label className="block text-xs uppercase tracking-widest text-zinc-500">Government ID image</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" required
                onChange={(e) => setIdentity({ ...identity, idImage: e.target.files?.[0] || null })} />
              <label className="block text-xs uppercase tracking-widest text-zinc-500">Selfie / live photo</label>
              <input type="file" accept="image/jpeg,image/png,image/webp" required
                onChange={(e) => setIdentity({ ...identity, selfieImage: e.target.files?.[0] || null })} />
              <button disabled={loading} type="submit" className="w-full min-h-[48px] rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-widest text-white">
                Submit identity
              </button>
            </form>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Step 6 — Verification fee</h2>
              <p className="text-2xl font-semibold text-purple-200">GHS 100</p>
              <p className="text-sm text-zinc-400">
                Payment alone does not verify your profile. Identity checks and admin approval are also required.
              </p>
              <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
                {paymentMessage}
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={onPaymentContinue}
                className="w-full min-h-[48px] rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-widest text-white"
              >
                Continue to admin review
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Step 7 — Submit for admin review</h2>
              <p className="text-sm text-zinc-400">
                An admin will review your phone/email verification, profile, identity documents and payment status.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={onSubmitReview}
                className="w-full min-h-[48px] rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-widest text-white"
              >
                Submit for review
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
