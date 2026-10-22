import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, UserRound } from 'lucide-react';
import { providerApi } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { MARKETPLACE_CITIES } from '../data/locations';
import {
  MASSAGE_SERVICE_OPTIONS,
  SERVICE_SETTING_OPTIONS,
  computeLocalCompletion,
  emptyRatesForServices,
  type ProviderGender,
  type ProviderType,
  type ServiceRateDraft,
} from '../data/providerRegistration';

type Step =
  | 'provider_type'
  | 'gender'
  | 'account'
  | 'phone'
  | 'email'
  | 'profile'
  | 'team'
  | 'identity'
  | 'payment'
  | 'review';

function stepsFor(type: ProviderType | null): { id: Step; label: string }[] {
  const base: { id: Step; label: string }[] = [
    { id: 'provider_type', label: 'Type' },
  ];
  if (type === 'individual') {
    base.push({ id: 'gender', label: 'Gender' });
  }
  base.push(
    { id: 'account', label: 'Account' },
    { id: 'phone', label: 'Phone' },
    { id: 'email', label: 'Email' },
    { id: 'profile', label: 'Profile' },
  );
  if (type === 'agency') {
    base.push({ id: 'team', label: 'Team' });
  }
  base.push(
    { id: 'identity', label: 'Identity' },
    { id: 'payment', label: 'Fee' },
    { id: 'review', label: 'Review' },
  );
  return base;
}

function profileFormError(err: unknown): string {
  return getAuthErrorMessage(err);
}

function validateAccountStep(account: {
  firstName: string;
  lastName: string;
  displayName: string;
  businessName: string;
  email: string;
  phone: string;
  whatsapp: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}, providerType: ProviderType): string | null {
  if (!account.firstName.trim()) {
    return providerType === 'agency' ? 'Enter the contact person’s first name.' : 'Enter a valid first name.';
  }
  if (!account.lastName.trim()) {
    return providerType === 'agency' ? 'Enter the contact person’s last name.' : 'Enter a valid last name.';
  }
  if (providerType === 'agency' && !account.businessName.trim()) {
    return 'Agency / business name is required.';
  }
  if (providerType === 'individual' && !account.displayName.trim()) {
    return 'Display name is required.';
  }
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

type TeamDraft = {
  displayName: string;
  gender: ProviderGender | '';
  bio: string;
  services: string[];
  yearsExperience: string;
  availability: string;
  ratesNote: string;
  status: 'active' | 'inactive';
};

export const ProviderRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [step, setStep] = useState<Step>('provider_type');
  const [providerType, setProviderType] = useState<ProviderType | null>(null);
  const [gender, setGender] = useState<ProviderGender | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoPhoneCode, setDemoPhoneCode] = useState<string | null>(null);
  const [demoEmailToken, setDemoEmailToken] = useState<string | null>(null);
  const [phoneCode, setPhoneCode] = useState('');
  const [emailToken, setEmailToken] = useState('');
  const [paymentMessage, setPaymentMessage] = useState(
    'Verification payment integration coming soon',
  );
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [savedTeam, setSavedTeam] = useState<Array<Record<string, unknown>>>([]);

  const [account, setAccount] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    businessName: '',
    businessRegistrationNumber: '',
    email: '',
    phone: '',
    whatsapp: '',
    dateOfBirth: '',
    age: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  });

  const [profile, setProfile] = useState({
    displayName: '',
    city: 'Accra',
    region: 'Greater Accra',
    country: 'Ghana',
    areaNeighbourhood: '',
    businessAddress: '',
    serviceArea: '',
    serviceRadiusKm: '',
    about: '',
    services: [] as string[],
    rates: [] as ServiceRateDraft[],
    startingPrice: '',
    availability: 'flexible',
    workingDays: '',
    workingHours: '',
    yearsExperience: '',
    serviceSetting: ['studio'] as string[],
    languages: 'English, Twi',
    primaryImage: '/profiles/demo-ama-k.jpg',
    coverImage: '',
    publicPhone: true,
    publicWhatsapp: true,
    publicEmail: false,
  });

  const [teamDraft, setTeamDraft] = useState<TeamDraft>({
    displayName: '',
    gender: '',
    bio: '',
    services: [],
    yearsExperience: '',
    availability: 'flexible',
    ratesNote: '',
    status: 'active',
  });

  const [identity, setIdentity] = useState({
    idType: 'Ghana Card',
    idNumber: '',
    idImage: null as File | null,
    selfieImage: null as File | null,
  });

  const STEPS = useMemo(() => stepsFor(providerType), [providerType]);
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const cities = useMemo(() => MARKETPLACE_CITIES.map((c) => c.name), []);

  const localCompletion = useMemo(
    () =>
      computeLocalCompletion({
        providerType: providerType || 'individual',
        gender,
        displayName: profile.displayName || account.displayName,
        businessName: account.businessName,
        city: profile.city,
        about: profile.about,
        primaryImage: profile.primaryImage,
        coverImage: profile.coverImage,
        services: profile.services,
        startingPrice: profile.startingPrice,
        rates: profile.rates,
      }),
    [providerType, gender, profile, account.displayName, account.businessName],
  );

  const toggleService = (label: string) => {
    setProfile((prev) => {
      const nextServices = prev.services.includes(label)
        ? prev.services.filter((s) => s !== label)
        : [...prev.services, label];
      const existingByKey = new Map(
        prev.rates.map((r) => [`${r.service}|${r.durationMinutes}`, r]),
      );
      const nextRates = emptyRatesForServices(nextServices).map((row) => {
        const prevRow = existingByKey.get(`${row.service}|${row.durationMinutes}`);
        return prevRow || row;
      });
      return { ...prev, services: nextServices, rates: nextRates };
    });
  };

  const onCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerType) return;
    setError(null);
    const localError = validateAccountStep(account, providerType);
    if (localError) {
      setError(localError);
      return;
    }
    if (providerType === 'individual' && (gender !== 'female' && gender !== 'male')) {
      setError('Select gender before continuing.');
      setStep('gender');
      return;
    }
    setLoading(true);
    try {
      const displayName =
        providerType === 'agency'
          ? account.businessName.trim()
          : account.displayName.trim();
      await providerApi.register({
        firstName: account.firstName.trim(),
        lastName: account.lastName.trim(),
        displayName,
        businessName: providerType === 'agency' ? account.businessName.trim() : undefined,
        providerType,
        gender: providerType === 'individual' ? (gender as ProviderGender) : undefined,
        email: account.email.trim(),
        phone: account.phone.trim(),
        password: account.password,
        confirmPassword: account.confirmPassword,
        termsAccepted: true,
      });
      await refreshSession();
      setProfile((p) => ({
        ...p,
        displayName,
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
    if (!providerType) return;
    setError(null);
    if (profile.services.length === 0) {
      setError('Select at least one massage service.');
      return;
    }
    setLoading(true);
    try {
      const ratesPayload = profile.rates
        .filter((r) => r.price.trim() !== '')
        .map((r) => ({
          service: r.service,
          durationMinutes: r.durationMinutes,
          price: Number(r.price),
        }));
      const result = await providerApi.saveProfile({
        providerType,
        gender: providerType === 'individual' ? gender : null,
        businessName: providerType === 'agency' ? account.businessName.trim() : null,
        businessRegistrationNumber:
          providerType === 'agency' ? account.businessRegistrationNumber.trim() : null,
        contactFirstName: account.firstName.trim(),
        contactLastName: account.lastName.trim(),
        displayName: profile.displayName.trim(),
        dateOfBirth: account.dateOfBirth || null,
        age: account.age ? Number(account.age) : null,
        whatsappNumber: account.whatsapp.trim() || account.phone.trim(),
        city: profile.city,
        region: profile.region,
        country: profile.country,
        areaNeighbourhood: profile.areaNeighbourhood,
        businessAddress: profile.businessAddress,
        serviceArea: profile.serviceArea,
        serviceRadiusKm: profile.serviceRadiusKm ? Number(profile.serviceRadiusKm) : null,
        about: profile.about,
        services: profile.services,
        rates: ratesPayload,
        startingPrice: profile.startingPrice ? Number(profile.startingPrice) : null,
        availability: profile.availability,
        workingDays: profile.workingDays,
        workingHours: profile.workingHours,
        yearsExperience: profile.yearsExperience ? Number(profile.yearsExperience) : null,
        serviceSetting: profile.serviceSetting,
        languages: profile.languages.split(',').map((s) => s.trim()).filter(Boolean),
        primaryImage: profile.primaryImage,
        coverImage: profile.coverImage || null,
        gallery: [profile.primaryImage, profile.coverImage].filter(Boolean),
        publicPhone: profile.publicPhone,
        publicWhatsapp: profile.publicWhatsapp,
        publicEmail: profile.publicEmail,
      });
      if (typeof result.profileCompletion === 'number') {
        setProfileCompletion(result.profileCompletion);
      } else {
        setProfileCompletion(localCompletion);
      }
      setStep(providerType === 'agency' ? 'team' : 'identity');
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  const onAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!teamDraft.displayName.trim() || (teamDraft.gender !== 'female' && teamDraft.gender !== 'male')) {
      setError('Team member needs a display name and gender.');
      return;
    }
    setLoading(true);
    try {
      const res = await providerApi.saveTeamMember({
        displayName: teamDraft.displayName.trim(),
        gender: teamDraft.gender,
        bio: teamDraft.bio,
        services: teamDraft.services,
        yearsExperience: teamDraft.yearsExperience ? Number(teamDraft.yearsExperience) : null,
        availability: teamDraft.availability,
        pricing: teamDraft.ratesNote.trim()
          ? [{ note: teamDraft.ratesNote.trim() }]
          : [],
        inheritAgencyRate: !teamDraft.ratesNote.trim(),
        status: teamDraft.status,
        profileImage: '/profiles/demo-ama-k.jpg',
      });
      setSavedTeam(res.teamMembers || []);
      setTeamDraft({
        displayName: '',
        gender: '',
        bio: '',
        services: [],
        yearsExperience: '',
        availability: 'flexible',
        ratesNote: '',
        status: 'active',
      });
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
      setError(
        providerType === 'agency'
          ? 'Upload contact person ID and a selfie / live photo.'
          : 'Upload both a government ID image and a selfie.',
      );
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
          Provider registration
        </p>
        <h1 className="mt-2 text-3xl font-bold text-white tracking-tight">Become a Massage Provider</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Create your public profile, list your massage services and complete verification to earn the verified badge.
        </p>

        {providerType && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-widest text-zinc-400">
              <span>Profile completion</span>
              <span className="text-purple-200">{Math.max(profileCompletion, localCompletion)}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${Math.max(profileCompletion, localCompletion)}%` }}
              />
            </div>
          </div>
        )}

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
          {step === 'provider_type' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
                How are you registering?
              </h2>
              <button
                type="button"
                onClick={() => {
                  setProviderType('individual');
                  setStep('gender');
                  setError(null);
                }}
                className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-purple-400/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                    <UserRound className="w-6 h-6" />
                  </span>
                  <div>
                    <p className="text-base font-semibold uppercase tracking-wide text-white">
                      As an Individual
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      I personally provide massage services.
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProviderType('agency');
                  setGender('');
                  setStep('account');
                  setError(null);
                }}
                className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] p-5 hover:border-purple-400/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                    <Building2 className="w-6 h-6" />
                  </span>
                  <div>
                    <p className="text-base font-semibold uppercase tracking-wide text-white">
                      As an Agency
                    </p>
                    <p className="mt-1 text-sm text-zinc-400">
                      I manage a massage business or team.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {step === 'gender' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Gender</h2>
              <p className="text-sm text-zinc-400">
                Required for individual providers. We do not infer gender from name or photo.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'female', label: 'Female' },
                  { id: 'male', label: 'Male' },
                ] as const).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setGender(opt.id)}
                    className={`min-h-[56px] rounded-2xl border text-sm font-semibold uppercase tracking-widest ${
                      gender === opt.id
                        ? 'border-purple-400/50 bg-purple-500/20 text-white'
                        : 'border-white/10 text-zinc-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!gender}
                onClick={() => {
                  setError(null);
                  setStep('account');
                }}
                className="w-full min-h-[48px] rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-widest text-white disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {step === 'account' && providerType && (
            <form onSubmit={onCreateAccount} className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                {providerType === 'agency' ? 'Agency account' : 'Personal details'}
              </h2>
              {providerType === 'agency' && (
                <>
                  <input
                    className={field}
                    placeholder="Agency / business name"
                    required
                    value={account.businessName}
                    onChange={(e) => setAccount({ ...account, businessName: e.target.value })}
                  />
                  <input
                    className={field}
                    placeholder="Business registration number (optional)"
                    value={account.businessRegistrationNumber}
                    onChange={(e) =>
                      setAccount({ ...account, businessRegistrationNumber: e.target.value })
                    }
                  />
                </>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  className={field}
                  placeholder={providerType === 'agency' ? 'Contact first name' : 'First name'}
                  required
                  value={account.firstName}
                  onChange={(e) => setAccount({ ...account, firstName: e.target.value })}
                />
                <input
                  className={field}
                  placeholder={providerType === 'agency' ? 'Contact last name' : 'Last name'}
                  required
                  value={account.lastName}
                  onChange={(e) => setAccount({ ...account, lastName: e.target.value })}
                />
              </div>
              {providerType === 'individual' && (
                <>
                  <input
                    className={field}
                    placeholder="Display name"
                    required
                    value={account.displayName}
                    onChange={(e) => setAccount({ ...account, displayName: e.target.value })}
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      className={field}
                      type="date"
                      placeholder="Date of birth"
                      value={account.dateOfBirth}
                      onChange={(e) => setAccount({ ...account, dateOfBirth: e.target.value })}
                    />
                    <input
                      className={field}
                      type="number"
                      min={18}
                      max={99}
                      placeholder="Age (optional)"
                      value={account.age}
                      onChange={(e) => setAccount({ ...account, age: e.target.value })}
                    />
                  </div>
                </>
              )}
              <input
                className={field}
                type="email"
                placeholder={providerType === 'agency' ? 'Business email' : 'Email'}
                required
                value={account.email}
                onChange={(e) => setAccount({ ...account, email: e.target.value })}
              />
              <input
                className={field}
                placeholder="Phone"
                required
                value={account.phone}
                onChange={(e) => setAccount({ ...account, phone: e.target.value })}
              />
              <input
                className={field}
                placeholder="WhatsApp number"
                value={account.whatsapp}
                onChange={(e) => setAccount({ ...account, whatsapp: e.target.value })}
              />
              <input
                className={field}
                type="password"
                placeholder="Password"
                required
                value={account.password}
                onChange={(e) => setAccount({ ...account, password: e.target.value })}
              />
              <input
                className={field}
                type="password"
                placeholder="Confirm password"
                required
                value={account.confirmPassword}
                onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })}
              />
              <label className="flex items-start gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={account.termsAccepted}
                  onChange={(e) => setAccount({ ...account, termsAccepted: e.target.checked })}
                />
                I accept the Terms and Privacy Policy. My profile starts unverified.
              </label>
              <button
                disabled={loading}
                type="submit"
                className="w-full min-h-[48px] rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-widest text-white disabled:opacity-60"
              >
                {loading ? 'Creating…' : 'Continue'}
              </button>
            </form>
          )}

          {step === 'phone' && (
            <form onSubmit={onVerifyPhone} className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Phone verification</h2>
              <p className="text-sm text-zinc-400">Enter the 6-digit code sent to your phone.</p>
              {demoPhoneCode && (
                <p className="text-xs text-amber-200/90 rounded-lg border border-amber-500/20 bg-amber-950/30 px-3 py-2">
                  Demo mode code: <strong>{demoPhoneCode}</strong>
                </p>
              )}
              <input
                className={field}
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                required
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
              />
              <button
                disabled={loading}
                type="submit"
                className="w-full min-h-[44px] rounded-full bg-purple-600 text-xs uppercase tracking-widest text-white"
              >
                Verify phone
              </button>
            </form>
          )}

          {step === 'email' && (
            <form onSubmit={onVerifyEmail} className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Email verification</h2>
              {demoEmailToken && (
                <p className="text-xs text-amber-200/90 rounded-lg border border-amber-500/20 bg-amber-950/30 px-3 py-2 break-all">
                  Demo mode token: <strong>{demoEmailToken}</strong>
                </p>
              )}
              <input
                className={field}
                placeholder="Verification token"
                required
                value={emailToken}
                onChange={(e) => setEmailToken(e.target.value)}
              />
              <button
                disabled={loading}
                type="submit"
                className="w-full min-h-[44px] rounded-full bg-purple-600 text-xs uppercase tracking-widest text-white"
              >
                Verify email
              </button>
            </form>
          )}

          {step === 'profile' && providerType && (
            <form onSubmit={onSaveProfile} className="space-y-4">
              <h2 className="text-lg font-semibold text-white">
                {providerType === 'agency' ? 'Agency profile' : 'Your profile'}
              </h2>
              <input
                className={field}
                placeholder={providerType === 'agency' ? 'Public agency name' : 'Display name'}
                required
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <select
                  className={field}
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  className={field}
                  placeholder="Region"
                  value={profile.region}
                  onChange={(e) => setProfile({ ...profile, region: e.target.value })}
                />
              </div>
              <input
                className={field}
                placeholder="Country"
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
              />
              <input
                className={field}
                placeholder="Area / neighbourhood"
                value={profile.areaNeighbourhood}
                onChange={(e) => setProfile({ ...profile, areaNeighbourhood: e.target.value })}
              />
              {providerType === 'agency' && (
                <input
                  className={field}
                  placeholder="Business address"
                  value={profile.businessAddress}
                  onChange={(e) => setProfile({ ...profile, businessAddress: e.target.value })}
                />
              )}
              <input
                className={field}
                placeholder="Service area"
                value={profile.serviceArea}
                onChange={(e) => setProfile({ ...profile, serviceArea: e.target.value })}
              />
              {providerType === 'individual' && (
                <input
                  className={field}
                  type="number"
                  min={0}
                  placeholder="Service radius (km, optional)"
                  value={profile.serviceRadiusKm}
                  onChange={(e) => setProfile({ ...profile, serviceRadiusKm: e.target.value })}
                />
              )}
              <textarea
                className={`${field} min-h-[100px] py-3`}
                placeholder={providerType === 'agency' ? 'About the agency' : 'About me'}
                value={profile.about}
                onChange={(e) => setProfile({ ...profile, about: e.target.value })}
              />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
                  Massage services
                </p>
                <div className="flex flex-wrap gap-2">
                  {MASSAGE_SERVICE_OPTIONS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleService(label)}
                      className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider border ${
                        profile.services.includes(label)
                          ? 'border-purple-400/40 bg-purple-500/20 text-purple-100'
                          : 'border-white/10 text-zinc-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {profile.rates.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Pricing (enter your own rates)
                  </p>
                  {profile.rates.map((row, idx) => (
                    <div key={`${row.service}-${row.durationMinutes}`} className="grid grid-cols-[1fr_90px_110px] gap-2 items-center">
                      <span className="text-xs text-zinc-300 truncate">
                        {row.service}
                      </span>
                      <span className="text-xs text-zinc-500">{row.durationMinutes} mins</span>
                      <input
                        className={field}
                        type="number"
                        min={0}
                        placeholder="GHS"
                        value={row.price}
                        onChange={(e) => {
                          const next = [...profile.rates];
                          next[idx] = { ...row, price: e.target.value };
                          setProfile({ ...profile, rates: next });
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <input
                className={field}
                type="number"
                min={0}
                placeholder="Starting price (GHS)"
                value={profile.startingPrice}
                onChange={(e) => setProfile({ ...profile, startingPrice: e.target.value })}
              />
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  className={field}
                  type="number"
                  min={0}
                  placeholder="Years of experience"
                  value={profile.yearsExperience}
                  onChange={(e) => setProfile({ ...profile, yearsExperience: e.target.value })}
                />
                <select
                  className={field}
                  value={profile.availability}
                  onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
                >
                  <option value="today">Available today</option>
                  <option value="this_week">This week</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <input
                className={field}
                placeholder="Working days"
                value={profile.workingDays}
                onChange={(e) => setProfile({ ...profile, workingDays: e.target.value })}
              />
              <input
                className={field}
                placeholder="Working / opening hours"
                value={profile.workingHours}
                onChange={(e) => setProfile({ ...profile, workingHours: e.target.value })}
              />
              <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
                {SERVICE_SETTING_OPTIONS.map((s) => (
                  <label key={s.id} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={profile.serviceSetting.includes(s.id)}
                      onChange={(e) => {
                        setProfile({
                          ...profile,
                          serviceSetting: e.target.checked
                            ? [...profile.serviceSetting, s.id]
                            : profile.serviceSetting.filter((x) => x !== s.id),
                        });
                      }}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
              <input
                className={field}
                placeholder="Languages"
                value={profile.languages}
                onChange={(e) => setProfile({ ...profile, languages: e.target.value })}
              />
              <input
                className={field}
                placeholder="Main photo URL (temporary until upload)"
                value={profile.primaryImage}
                onChange={(e) => setProfile({ ...profile, primaryImage: e.target.value })}
              />
              {providerType === 'agency' && (
                <input
                  className={field}
                  placeholder="Cover / logo image URL (optional)"
                  value={profile.coverImage}
                  onChange={(e) => setProfile({ ...profile, coverImage: e.target.value })}
                />
              )}
              <div className="flex flex-col gap-2 text-sm text-zinc-300">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.publicPhone}
                    onChange={(e) => setProfile({ ...profile, publicPhone: e.target.checked })}
                  />
                  Show phone publicly
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.publicWhatsapp}
                    onChange={(e) => setProfile({ ...profile, publicWhatsapp: e.target.checked })}
                  />
                  Show WhatsApp publicly
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={profile.publicEmail}
                    onChange={(e) => setProfile({ ...profile, publicEmail: e.target.checked })}
                  />
                  Show email publicly
                </label>
              </div>
              <button
                disabled={loading}
                type="submit"
                className="w-full min-h-[48px] rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-widest text-white"
              >
                Save profile
              </button>
            </form>
          )}

          {step === 'team' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Meet our massage professionals</h2>
              <p className="text-sm text-zinc-400">
                Add team members under your agency. Separate staff logins can be added later.
              </p>
              {savedTeam.length > 0 && (
                <ul className="space-y-2">
                  {savedTeam.map((m) => (
                    <li
                      key={String(m.id)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-200 flex justify-between gap-2"
                    >
                      <span>
                        {String(m.displayName)} · {String(m.gender)}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-rose-300"
                        onClick={async () => {
                          try {
                            const res = await providerApi.deleteTeamMember(String(m.id));
                            setSavedTeam(res.teamMembers || []);
                          } catch (err) {
                            setError(profileFormError(err));
                          }
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={onAddTeamMember} className="space-y-3 border-t border-white/10 pt-4">
                <input
                  className={field}
                  placeholder="Display name"
                  value={teamDraft.displayName}
                  onChange={(e) => setTeamDraft({ ...teamDraft, displayName: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  {(['female', 'male'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setTeamDraft({ ...teamDraft, gender: g })}
                      className={`min-h-[44px] rounded-xl border text-xs uppercase tracking-widest ${
                        teamDraft.gender === g
                          ? 'border-purple-400/40 bg-purple-500/20 text-white'
                          : 'border-white/10 text-zinc-400'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <textarea
                  className={`${field} min-h-[80px] py-3`}
                  placeholder="Short bio"
                  value={teamDraft.bio}
                  onChange={(e) => setTeamDraft({ ...teamDraft, bio: e.target.value })}
                />
                <div className="flex flex-wrap gap-2">
                  {MASSAGE_SERVICE_OPTIONS.slice(0, 6).map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        setTeamDraft({
                          ...teamDraft,
                          services: teamDraft.services.includes(label)
                            ? teamDraft.services.filter((s) => s !== label)
                            : [...teamDraft.services, label],
                        })
                      }
                      className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider border ${
                        teamDraft.services.includes(label)
                          ? 'border-purple-400/40 text-purple-100'
                          : 'border-white/10 text-zinc-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  className={field}
                  type="number"
                  min={0}
                  placeholder="Years experience"
                  value={teamDraft.yearsExperience}
                  onChange={(e) => setTeamDraft({ ...teamDraft, yearsExperience: e.target.value })}
                />
                <select
                  className={field}
                  value={teamDraft.availability}
                  onChange={(e) => setTeamDraft({ ...teamDraft, availability: e.target.value })}
                >
                  <option value="today">Available today</option>
                  <option value="this_week">This week</option>
                  <option value="flexible">Flexible</option>
                </select>
                <input
                  className={field}
                  placeholder="Rates note (or leave blank to inherit agency rates)"
                  value={teamDraft.ratesNote}
                  onChange={(e) => setTeamDraft({ ...teamDraft, ratesNote: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  {(['active', 'inactive'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTeamDraft({ ...teamDraft, status: s })}
                      className={`min-h-[44px] rounded-xl border text-xs uppercase tracking-widest ${
                        teamDraft.status === s
                          ? 'border-purple-400/40 bg-purple-500/20 text-white'
                          : 'border-white/10 text-zinc-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full min-h-[44px] rounded-full border border-white/15 text-xs uppercase tracking-widest"
                >
                  Add team member
                </button>
              </form>
              <button
                type="button"
                onClick={() => setStep('identity')}
                className="w-full min-h-[48px] rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-widest text-white"
              >
                Continue to verification
              </button>
            </div>
          )}

          {step === 'identity' && (
            <form onSubmit={onSubmitIdentity} className="space-y-3">
              <h2 className="text-lg font-semibold text-white">
                {providerType === 'agency' ? 'Contact person identity' : 'Identity verification'}
              </h2>
              <p className="text-sm text-zinc-400">
                {providerType === 'agency'
                  ? 'Upload the contact person’s ID and selfie. Business documents can be added during admin review.'
                  : 'ID documents are private and never shown on public profiles.'}
              </p>
              <select
                className={field}
                value={identity.idType}
                onChange={(e) => setIdentity({ ...identity, idType: e.target.value })}
              >
                <option>Ghana Card</option>
                <option>Passport</option>
                <option>Driver Licence</option>
                <option>Voter ID</option>
              </select>
              <input
                className={field}
                placeholder="ID number (optional)"
                value={identity.idNumber}
                onChange={(e) => setIdentity({ ...identity, idNumber: e.target.value })}
              />
              <label className="block text-xs uppercase tracking-widest text-zinc-500">
                Government ID image
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(e) =>
                  setIdentity({ ...identity, idImage: e.target.files?.[0] || null })
                }
              />
              <label className="block text-xs uppercase tracking-widest text-zinc-500">
                Selfie / live photo
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                onChange={(e) =>
                  setIdentity({ ...identity, selfieImage: e.target.files?.[0] || null })
                }
              />
              <button
                disabled={loading}
                type="submit"
                className="w-full min-h-[48px] rounded-full bg-purple-600 text-sm font-semibold uppercase tracking-widest text-white"
              >
                Submit identity
              </button>
            </form>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Verification fee</h2>
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
              <h2 className="text-lg font-semibold text-white">Submit for admin review</h2>
              <p className="text-sm text-zinc-400">
                An admin will review verification details for your{' '}
                {providerType === 'agency' ? 'agency' : 'individual'} profile. The green verified badge is only
                granted after approval.
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
