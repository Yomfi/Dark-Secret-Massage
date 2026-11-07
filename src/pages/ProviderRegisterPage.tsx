import { BrandLogo } from '../components/BrandLogo';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Building2, Check, Clock3, UserRound, X } from 'lucide-react';
import { authApi, providerApi } from '../lib/api';
import { getAuthErrorMessage, useAuth } from '../auth/AuthContext';
import { MARKETPLACE_REGIONS } from '../data/locations';
import { LocationFields } from '../components/location/LocationFields';
import {
  MASSAGE_SERVICE_OPTIONS,
  SERVICE_SETTING_OPTIONS,
  computeLocalCompletion,
  emptyRatesForServices,
  type ProviderGender,
  type ProviderType,
  type ServiceRateDraft,
} from '../data/providerRegistration';
import { Button } from '../components/ui/Button';
import { Container } from '../components/ui/Layout';
import {
  Alert,
  CheckboxField,
  ProgressBar,
  SelectField,
  SelectableCard,
  TextAreaField,
  TextField,
} from '../components/ui';

type Step =
  | 'provider_type'
  | 'gender'
  | 'account'
  | 'email'
  | 'profile'
  | 'team'
  | 'identity'
  | 'membership'
  | 'review';

function stepsFor(type: ProviderType | null): { id: Step; label: string }[] {
  const base: { id: Step; label: string }[] = [
    { id: 'provider_type', label: 'Provider type' },
  ];
  if (type === 'individual') {
    base.push({ id: 'gender', label: 'Gender' });
  }
  base.push(
    { id: 'account', label: 'Account' },
    { id: 'email', label: 'Email verification' },
    { id: 'profile', label: 'Profile' },
  );
  if (type === 'agency') {
    base.push({ id: 'team', label: 'Team' });
  }
  base.push(
    { id: 'identity', label: 'Identity' },
    { id: 'membership', label: 'Membership' },
    { id: 'review', label: 'Review' },
  );
  return base;
}

const STEP_META: Record<Step, { title: string; description: string }> = {
  provider_type: {
    title: 'How are you registering?',
    description:
      'Choose the account type that matches how you provide massage services. You can list multiple services either way.',
  },
  gender: {
    title: 'Your gender',
    description:
      'Needed for individual provider profiles. We never infer gender from a name or photo.',
  },
  account: {
    title: 'Account details',
    description:
      'Your sign-in details and contact information. Your profile stays unverified until review is complete.',
  },
  email: {
    title: 'Verify your email',
    description:
      'We send a single-use confirmation link to this address. Your phone number stays a contact detail and is never marked verified.',
  },
  profile: {
    title: 'Your public profile',
    description:
      'This is what clients see in Explore: your display name, area, services and rates.',
  },
  team: {
    title: 'Your team',
    description:
      'Add the massage professionals clients can book through your agency. Team members inherit agency rates unless you add a note.',
  },
  identity: {
    title: 'Identity verification',
    description:
      'ID documents are private and never shown on public profiles. An admin reviews them before the verified badge is granted.',
  },
  membership: {
    title: 'Membership',
    description:
      'Membership is currently free. Identity checks and admin approval are still required before the verified badge appears.',
  },
  review: {
    title: 'Submit for admin review',
    description:
      'Check your details, then send the application. The verified badge appears only after approval.',
  },
};

/** Steps that can be safely revisited without re-submitting a server-side step. */
const BACK_TARGETS: Partial<Record<Step, Step>> = {
  gender: 'provider_type',
  account: 'provider_type',
  review: 'membership',
};

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

type ServiceAreaDraft = {
  region: string;
  district: string;
  city: string;
  area: string;
  radiusKm: string;
  latitude: number | null;
  longitude: number | null;
};

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
  const { user, refreshSession, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>('provider_type');
  const [providerType, setProviderType] = useState<ProviderType | null>(null);
  const [gender, setGender] = useState<ProviderGender | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [membership, setMembership] = useState({
    feeEnabled: false,
    feeAmount: 0,
    standardFeeAmount: 100,
    currency: 'GHS',
    free: true,
    message: 'Membership is currently free.',
  });
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
    district: '',
    latitude: null as number | null,
    longitude: null as number | null,
    serviceAreas: [] as ServiceAreaDraft[],
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
    choice: '' as '' | 'verify_identity' | 'verify_later',
    idType: 'Ghana Card',
    idNumber: '',
    idImage: null as File | null,
    selfieImage: null as File | null,
  });

  const [resuming, setResuming] = useState(false);
  const resumeRef = useRef<string | null>(null);

  /**
   * Existing providers who already created an account continue where they left off
   * (the phone/fee steps are gone) instead of being asked to register twice.
   */
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (user.role !== 'massage_provider' && user.role !== 'provider') return;
    if (resumeRef.current === user.id) return;
    resumeRef.current = user.id;
    let cancelled = false;
    setResuming(true);

    const applySavedProfile = (raw: Record<string, unknown> | null) => {
      if (!raw) return;
      const text = (value: unknown) => (typeof value === 'string' ? value : '');
      const numeric = (value: unknown) =>
        typeof value === 'number' ? String(value) : text(value);
      const stringList = (value: unknown) =>
        Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
      const savedRates: ServiceRateDraft[] = Array.isArray(raw.rates)
        ? raw.rates
            .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
            .map((row) => ({
              service: text(row.service),
              durationMinutes: Number(row.durationMinutes) || 60,
              price: row.price === null || row.price === undefined ? '' : String(row.price),
            }))
        : [];

      setProfile((prev) => {
        const services = stringList(raw.services);
        const settings = stringList(raw.serviceSetting);
        return {
          ...prev,
          displayName: text(raw.displayName) || prev.displayName,
          city: text(raw.city) || prev.city,
          region: text(raw.region) || prev.region,
          country: text(raw.country) || prev.country,
          areaNeighbourhood: text(raw.areaNeighbourhood),
          district: text(raw.district),
          latitude: raw.latitude !== null && raw.latitude !== undefined ? Number(raw.latitude) : null,
          longitude: raw.longitude !== null && raw.longitude !== undefined ? Number(raw.longitude) : null,
          serviceAreas: Array.isArray(raw.serviceAreas)
            ? (raw.serviceAreas as Array<Record<string, unknown>>).map((area) => ({
                region: text(area.region),
                district: text(area.district),
                city: text(area.city),
                area: text(area.area),
                radiusKm: area.radiusKm !== null && area.radiusKm !== undefined ? String(area.radiusKm) : '',
                latitude: area.latitude !== null && area.latitude !== undefined ? Number(area.latitude) : null,
                longitude: area.longitude !== null && area.longitude !== undefined ? Number(area.longitude) : null,
              }))
            : [],
          businessAddress: text(raw.businessAddress),
          serviceArea: text(raw.serviceArea),
          serviceRadiusKm: numeric(raw.serviceRadiusKm),
          about: text(raw.about),
          services: services.length > 0 ? services : prev.services,
          rates: savedRates.length > 0 ? savedRates : prev.rates,
          startingPrice: numeric(raw.startingPrice),
          availability: text(raw.availability) || prev.availability,
          workingDays: text(raw.workingDays),
          workingHours: text(raw.workingHours),
          yearsExperience: numeric(raw.yearsExperience),
          serviceSetting: settings.length > 0 ? settings : prev.serviceSetting,
          languages: stringList(raw.languages).join(', ') || prev.languages,
          primaryImage: text(raw.primaryImage) || prev.primaryImage,
          coverImage: text(raw.coverImage),
          publicPhone: raw.publicPhone !== false,
          publicWhatsapp: raw.publicWhatsapp !== false,
          publicEmail: raw.publicEmail === true,
        };
      });
      setAccount((prev) => ({
        ...prev,
        businessRegistrationNumber:
          text(raw.businessRegistrationNumber) || prev.businessRegistrationNumber,
        dateOfBirth: text(raw.dateOfBirth) || prev.dateOfBirth,
        age: numeric(raw.age) || prev.age,
      }));
    };

    providerApi
      .dashboard()
      .then(async (data) => {
        if (cancelled) return;

        const savedType = data.profile?.providerType;
        if (savedType === 'individual' || savedType === 'agency') setProviderType(savedType);
        const savedGender = data.profile?.gender;
        if (savedGender === 'female' || savedGender === 'male') setGender(savedGender);
        setAccount((prev) => ({
          ...prev,
          email: data.user.email || prev.email,
          firstName: data.user.firstName || prev.firstName,
          lastName: data.user.lastName || prev.lastName,
          phone: data.user.phone || prev.phone,
          displayName: data.profile?.displayName || prev.displayName,
          businessName: data.profile?.businessName || prev.businessName,
        }));
        setAccountCreated(true);

        if (['pending_review', 'verified'].includes(data.verification.status)) {
          navigate('/provider/dashboard', { replace: true });
          return;
        }
        if (data.verification.verificationChoice) {
          setIdentity((prev) => ({ ...prev, choice: data.verification.verificationChoice ?? '' }));
        }
        if (!data.progress.emailVerified) {
          setStep('email');
          return;
        }
        if (!data.progress.profileCompleted) {
          const saved = await providerApi.getProfile().catch(() => null);
          if (cancelled) return;
          applySavedProfile(saved?.profile ?? null);
          setStep('profile');
          return;
        }
        // Verify Later ends onboarding after the selfie. The provider stays
        // Unverified and can add an ID later from the workspace.
        if (
          data.verification.verificationChoice === 'verify_later' &&
          data.verification.hasSelfie &&
          data.verification.status === 'unverified'
        ) {
          navigate('/provider/dashboard', { replace: true });
          return;
        }
        if (!data.progress.identitySubmitted) {
          setStep('identity');
          return;
        }
        if (data.membership) {
          setMembership({
            feeEnabled: data.membership.feeEnabled,
            feeAmount: data.membership.feeAmount,
            standardFeeAmount: data.membership.standardFeeAmount,
            currency: data.membership.currency,
            free: data.membership.free,
            message: data.membership.message,
          });
        }
        setStep('membership');
      })
      .catch(() => {
        // Not a provider account (or the API is unavailable): keep normal signup.
        resumeRef.current = null;
      })
      .finally(() => {
        if (!cancelled) setResuming(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, navigate]);

  const STEPS = useMemo(() => stepsFor(providerType), [providerType]);
  const stepIndex = STEPS.findIndex((s) => s.id === step);


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
      const registered = await providerApi.register({
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
      setAccountCreated(true);
      setProfile((p) => ({
        ...p,
        displayName,
      }));
      // Registration already sent the one confirmation link. Never request a
      // second email here: it would retire the link the user just received.
      setEmailSent(Boolean(registered.verificationEmailSent));
      setResendMessage(
        registered.verificationEmailSent
          ? null
          : 'We could not send the confirmation email. Use Resend email to try again.',
      );
      setStep('email');
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  /** After clicking the emailed link (another tab), re-read the session. */
  const onConfirmEmailFromLink = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.me();
      await refreshSession();
      if (data.user.emailVerifiedAt) {
        setStep('profile');
      } else {
        setError('We have not seen your confirmation yet. Open the link in your email, then try again.');
      }
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  const onResendEmail = async () => {
    setError(null);
    setLoading(true);
    try {
      const sent = await authApi.resendVerification();
      await refreshSession();
      if (sent.alreadyVerified) {
        setEmailSent(true);
        setStep('profile');
        return;
      }
      setEmailSent(Boolean(sent.sent));
      setResendMessage(sent.message ?? null);
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
        district: profile.district,
        areaNeighbourhood: profile.areaNeighbourhood,
        latitude: profile.latitude,
        longitude: profile.longitude,
        serviceAreas: profile.serviceAreas.map((area) => ({
          region: area.region,
          district: area.district,
          city: area.city,
          area: area.area,
          radiusKm: area.radiusKm ? Number(area.radiusKm) : null,
          latitude: area.latitude,
          longitude: area.longitude,
        })),
        serviceRegions: Array.from(
          new Set([profile.region, ...profile.serviceAreas.map((a) => a.region)].filter(Boolean)),
        ),
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
    if (!identity.choice) {
      setError('Choose Verify My Identity or Verify Later.');
      return;
    }
    if (!identity.selfieImage) {
      setError('Upload a selfie / live photo.');
      return;
    }
    if (identity.choice === 'verify_identity' && !identity.idImage) {
      setError(
        providerType === 'agency'
          ? 'Upload the contact person’s government ID image.'
          : 'Upload a government ID image.',
      );
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('choice', identity.choice);
      if (identity.choice === 'verify_identity') {
        form.append('idType', identity.idType);
        form.append('idNumber', identity.idNumber);
        form.append('idImage', identity.idImage as File);
      }
      form.append('selfieImage', identity.selfieImage);
      await providerApi.submitIdentity(form);
      if (identity.choice === 'verify_later') {
        navigate('/provider/dashboard', { replace: true });
        return;
      }
      const pay = await providerApi.getPayment();
      setMembership({
        feeEnabled: pay.feeEnabled,
        feeAmount: pay.feeAmount,
        standardFeeAmount: pay.standardFeeAmount,
        currency: pay.currency,
        free: pay.free,
        message: pay.message,
      });
      setStep('membership');
    } catch (err) {
      setError(profileFormError(err));
    } finally {
      setLoading(false);
    }
  };

  const onMembershipContinue = async () => {
    setError(null);
    setLoading(true);
    try {
      if (membership.feeEnabled) {
        const pay = await providerApi.initiatePayment();
        setMembership((m) => ({ ...m, message: pay.message }));
      }
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

  const stepMeta = STEP_META[step];
  const stepNumber = stepIndex + 1;
  const stepProgress = STEPS.length > 1 ? (stepNumber / STEPS.length) * 100 : 0;
  const completion = Math.max(profileCompletion, localCompletion);
  const backTarget = BACK_TARGETS[step];

  const goBack = () => {
    if (!backTarget) return;
    setError(null);
    setStep(backTarget);
  };

  const backButton = backTarget ? (
    <Button variant="secondary" onClick={goBack} className="w-full sm:w-auto">
      Back
    </Button>
  ) : null;

  return (
    <div className="min-h-screen bg-brand-surface text-zinc-200">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-brand-surface/90 backdrop-blur-xl">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center rounded-lg"
            aria-label="Massager Studio home"
          >
            <BrandLogo variant="plate" withWordmark markHeight={26} />
          </Link>
          <Link
            to="/login"
            className="inline-flex h-11 items-center rounded-lg px-3 text-[13.5px] font-medium text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/80"
          >
            Sign in
          </Link>
        </Container>
      </header>

      <main className="pb-16">
        <Container className="pt-8 sm:pt-10 lg:pt-12">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-gold-light">
              Provider registration
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-[32px]">
              Become a massage provider
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
              Create your public profile, list your massage services and complete verification to
              earn the verified badge.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-10">
            <aside className="hidden self-start lg:sticky lg:top-24 lg:block">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                    Step {stepNumber} of {STEPS.length}
                  </p>
                  {profile.services.length > 0 ? (
                    <p className="text-[11px] tabular-nums text-brand-gold-light">{completion}%</p>
                  ) : null}
                </div>
                <ProgressBar value={stepProgress} className="mt-2" />
                <ol className="mt-4 space-y-0.5">
                  {STEPS.map((s, i) => {
                    const active = s.id === step;
                    const done = i < stepIndex;
                    return (
                      <li key={s.id}>
                        <div
                          aria-current={active ? 'step' : undefined}
                          className={[
                            'flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px]',
                            active
                              ? 'bg-brand-gold/[0.10] font-semibold text-white'
                              : done
                                ? 'text-zinc-300'
                                : 'text-zinc-500',
                          ].join(' ')}
                        >
                          <span
                            className={[
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                              done
                                ? 'border-brand-gold/40 bg-brand-gold/15 text-brand-gold-light'
                                : active
                                  ? 'border-brand-gold/60 bg-brand-gold text-brand-ink'
                                  : 'border-white/12 text-zinc-500',
                            ].join(' ')}
                          >
                            {done ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
                          </span>
                          <span className="truncate">{s.label}</span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <p className="mt-3 px-1 text-[12px] leading-relaxed text-zinc-500">
                Your profile stays unverified until identity checks and admin review are complete.
              </p>
            </aside>

            <div className="min-w-0">
              <div className="mb-5 lg:hidden">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12px] font-medium text-zinc-500">
                    Step {stepNumber} of {STEPS.length}
                  </p>
                  {profile.services.length > 0 ? (
                    <p className="text-[12px] tabular-nums text-brand-gold-light">
                      Profile {completion}%
                    </p>
                  ) : null}
                </div>
                <p className="mt-1 text-[15px] font-semibold text-white">
                  {STEPS[stepIndex]?.label ?? stepMeta.title}
                </p>
                <ProgressBar value={stepProgress} className="mt-2.5" />
              </div>

              {error ? (
                <Alert variant="error" className="mb-5">
                  {error}
                </Alert>
              ) : null}

              <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6 lg:p-7">
                <header className="mb-5 border-b border-white/[0.07] pb-4">
                  <h2 className="text-lg font-semibold tracking-[-0.01em] text-white sm:text-xl">
                    {stepMeta.title}
                  </h2>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-zinc-400">
                    {stepMeta.description}
                  </p>
                </header>

                <p className={resuming ? 'py-12 text-center text-sm text-zinc-400' : 'hidden'}>
                  Loading your registration…
                </p>

                <div className={resuming ? 'hidden' : undefined}>
                {step === 'provider_type' ? (
                  <div className="space-y-5">
                    <div role="radiogroup" aria-label="Provider type" className="grid gap-3 sm:grid-cols-2">
                      <SelectableCard
                        selected={providerType === 'individual'}
                        title="Individual"
                        description="I personally provide massage services."
                        icon={<UserRound className="h-5 w-5" aria-hidden />}
                        onClick={() => {
                          setProviderType('individual');
                          setStep('gender');
                          setError(null);
                        }}
                      />
                      <SelectableCard
                        selected={providerType === 'agency'}
                        title="Agency"
                        description="I manage a massage business or team."
                        icon={<Building2 className="h-5 w-5" aria-hidden />}
                        onClick={() => {
                          setProviderType('agency');
                          setGender('');
                          setStep('account');
                          setError(null);
                        }}
                      />
                    </div>
                    <p className="text-[13px] text-zinc-500">
                      Individual profiles list one provider. Agency profiles can add several team
                      members after the agency profile is saved.
                    </p>
                  </div>
                ) : null}

                {step === 'gender' ? (
                  <div className="space-y-5">
                    <div role="radiogroup" aria-label="Gender" className="grid grid-cols-2 gap-3">
                      {(
                        [
                          { id: 'female', label: 'Female' },
                          { id: 'male', label: 'Male' },
                        ] as const
                      ).map((opt) => (
                        <SelectableCard
                          key={opt.id}
                          layout="tile"
                          selected={gender === opt.id}
                          title={opt.label}
                          onClick={() => setGender(opt.id)}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col-reverse gap-2.5 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                      {backButton}
                      <Button
                        disabled={!gender}
                        onClick={() => {
                          setError(null);
                          setStep('account');
                        }}
                        className="w-full sm:w-auto"
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                ) : null}

                {step === 'account' && providerType ? (
                  isAuthenticated && accountCreated ? (
                    <div className="space-y-5">
                      <Alert variant="success" title="Your account is ready">
                        Signed in as {account.email || 'your registered email'}. Verification
                        continues on the next step.
                      </Alert>
                      <div className="flex flex-col-reverse gap-2.5 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                        <Button onClick={() => setStep('email')} className="w-full sm:w-auto">
                          Continue to email verification
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={onCreateAccount} className="space-y-4">
                      {providerType === 'agency' ? (
                        <>
                          <TextField
                            label="Agency / business name"
                            required
                            autoComplete="organization"
                            value={account.businessName}
                            onChange={(e) => setAccount({ ...account, businessName: e.target.value })}
                          />
                          <TextField
                            label="Business registration number"
                            hint="Optional — add it now or during admin review."
                            value={account.businessRegistrationNumber}
                            onChange={(e) =>
                              setAccount({ ...account, businessRegistrationNumber: e.target.value })
                            }
                          />
                        </>
                      ) : null}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          label={providerType === 'agency' ? 'Contact first name' : 'First name'}
                          required
                          autoComplete="given-name"
                          value={account.firstName}
                          onChange={(e) => setAccount({ ...account, firstName: e.target.value })}
                        />
                        <TextField
                          label={providerType === 'agency' ? 'Contact last name' : 'Last name'}
                          required
                          autoComplete="family-name"
                          value={account.lastName}
                          onChange={(e) => setAccount({ ...account, lastName: e.target.value })}
                        />
                      </div>

                      {providerType === 'individual' ? (
                        <>
                          <TextField
                            label="Display name"
                            required
                            hint="Shown publicly on your profile."
                            value={account.displayName}
                            onChange={(e) => setAccount({ ...account, displayName: e.target.value })}
                          />
                          <div className="grid gap-4 sm:grid-cols-2">
                            <TextField
                              label="Date of birth"
                              type="date"
                              value={account.dateOfBirth}
                              onChange={(e) => setAccount({ ...account, dateOfBirth: e.target.value })}
                            />
                            <TextField
                              label="Age"
                              type="number"
                              min={18}
                              max={99}
                              hint="Optional"
                              value={account.age}
                              onChange={(e) => setAccount({ ...account, age: e.target.value })}
                            />
                          </div>
                        </>
                      ) : null}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          label={providerType === 'agency' ? 'Business email' : 'Email'}
                          type="email"
                          required
                          autoComplete="email"
                          value={account.email}
                          onChange={(e) => setAccount({ ...account, email: e.target.value })}
                        />
                        <TextField
                          label="Phone"
                          type="tel"
                          required
                          autoComplete="tel"
                          value={account.phone}
                          onChange={(e) => setAccount({ ...account, phone: e.target.value })}
                        />
                      </div>

                      <TextField
                        label="WhatsApp number"
                        type="tel"
                        hint="Optional — clients see it only if you choose to show it."
                        value={account.whatsapp}
                        onChange={(e) => setAccount({ ...account, whatsapp: e.target.value })}
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          label="Password"
                          type="password"
                          required
                          autoComplete="new-password"
                          hint="At least 8 characters, with a letter and a number."
                          value={account.password}
                          onChange={(e) => setAccount({ ...account, password: e.target.value })}
                        />
                        <TextField
                          label="Confirm password"
                          type="password"
                          required
                          autoComplete="new-password"
                          value={account.confirmPassword}
                          onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })}
                        />
                      </div>

                      <CheckboxField
                        name="provider-terms"
                        checked={account.termsAccepted}
                        onChange={(e) => setAccount({ ...account, termsAccepted: e.target.checked })}
                        label="I accept the Terms and Privacy Policy. My profile starts unverified."
                      />

                      <div className="flex flex-col-reverse gap-2.5 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                        {backButton}
                        <Button type="submit" loading={loading} loadingLabel="Creating account" className="w-full sm:w-auto">
                          Continue
                        </Button>
                      </div>
                    </form>
                  )
                ) : null}

                {step === 'email' ? (
                  <div className="space-y-4">
                    <Alert variant={emailSent ? 'success' : 'warning'} title="Confirm your email address">
                      {emailSent
                        ? `We sent a single-use confirmation link to ${account.email || 'your registered email'}. It expires in 24 hours.`
                        : `We could not confirm that the email was delivered to ${account.email || 'your registered email'}. Use Resend email to try again.`}
                    </Alert>

                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      Your phone number is kept as contact information for bookings and is never
                      shown as verified.
                    </p>

                    {resendMessage ? (
                      <p className="text-[13px] text-zinc-400">{resendMessage}</p>
                    ) : null}

                    <div className="flex flex-col gap-2.5 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                      <Button
                        variant="secondary"
                        onClick={onResendEmail}
                        loading={loading}
                        loadingLabel="Sending"
                        className="w-full sm:w-auto"
                      >
                        Resend email
                      </Button>
                      <Button
                        onClick={onConfirmEmailFromLink}
                        loading={loading}
                        loadingLabel="Checking"
                        className="w-full sm:w-auto"
                      >
                        I&apos;ve confirmed my email
                      </Button>
                    </div>

                    <p className="text-[12.5px] leading-relaxed text-zinc-500">
                      Open the link in this or another browser, then return here. If you are signed
                      out, sign in again before continuing to your profile.
                    </p>
                  </div>
                ) : null}

                {step === 'profile' && providerType ? (
                  <form onSubmit={onSaveProfile} className="space-y-4">
                    <TextField
                      label={providerType === 'agency' ? 'Public agency name' : 'Display name'}
                      required
                      value={profile.displayName}
                      onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    />

                    <fieldset className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <legend className="px-1 text-[13px] font-medium text-zinc-200">
                        Location &amp; service areas
                      </legend>
                      <p className="text-[12px] leading-relaxed text-zinc-500">
                        Your primary location powers nearest-first discovery. Your exact pin is never shown
                        publicly; customers only see the town, area and the service areas you publish.
                      </p>
                      <LocationFields
                        theme="dark"
                        value={{
                          country: profile.country,
                          region: profile.region,
                          district: profile.district,
                          city: profile.city,
                          area: profile.areaNeighbourhood,
                          latitude: profile.latitude,
                          longitude: profile.longitude,
                        }}
                        onChange={(next) =>
                          setProfile({
                            ...profile,
                            country: next.country,
                            region: next.region,
                            district: next.district,
                            city: next.city,
                            areaNeighbourhood: next.area,
                            latitude: next.latitude,
                            longitude: next.longitude,
                          })
                        }
                      />

                      {providerType === 'agency' ? (
                        <TextField
                          label="Public business / studio address (optional)"
                          hint="Only add an address you are happy for customers to see."
                          value={profile.businessAddress}
                          onChange={(e) => setProfile({ ...profile, businessAddress: e.target.value })}
                        />
                      ) : null}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          label="Service area summary"
                          hint="Optional short text shown on your profile."
                          value={profile.serviceArea}
                          onChange={(e) => setProfile({ ...profile, serviceArea: e.target.value })}
                        />
                        <TextField
                          label="Maximum home-visit radius (km)"
                          type="number"
                          min={0}
                          hint="Optional. Used with your exact pin."
                          value={profile.serviceRadiusKm}
                          onChange={(e) => setProfile({ ...profile, serviceRadiusKm: e.target.value })}
                        />
                      </div>

                      <div className="space-y-3 border-t border-white/10 pt-3">
                        <div>
                          <p className="text-[12.5px] font-semibold text-zinc-200">Additional service areas</p>
                          <p className="text-[11.5px] leading-relaxed text-zinc-500">
                            Add nearby towns or neighbourhoods you travel to. Each area can have its own radius.
                          </p>
                        </div>
                        {profile.serviceAreas.map((area, idx) => (
                          <div key={`${area.city}-${idx}`} className="rounded-xl border border-white/10 p-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <SelectField
                                label="Region"
                                value={area.region}
                                onChange={(e) => {
                                  const next = [...profile.serviceAreas];
                                  next[idx] = { ...area, region: e.target.value };
                                  setProfile({ ...profile, serviceAreas: next });
                                }}
                              >
                                <option value="">Select region</option>
                                {MARKETPLACE_REGIONS.map((r) => (
                                  <option key={r.id} value={r.name}>{r.name}</option>
                                ))}
                              </SelectField>
                              <TextField
                                label="City / Town"
                                value={area.city}
                                onChange={(e) => {
                                  const next = [...profile.serviceAreas];
                                  next[idx] = { ...area, city: e.target.value };
                                  setProfile({ ...profile, serviceAreas: next });
                                }}
                              />
                              <TextField
                                label="Area / neighbourhood"
                                value={area.area}
                                onChange={(e) => {
                                  const next = [...profile.serviceAreas];
                                  next[idx] = { ...area, area: e.target.value };
                                  setProfile({ ...profile, serviceAreas: next });
                                }}
                              />
                              <TextField
                                label="Radius (km)"
                                type="number"
                                min={1}
                                max={500}
                                value={area.radiusKm}
                                onChange={(e) => {
                                  const next = [...profile.serviceAreas];
                                  next[idx] = { ...area, radiusKm: e.target.value };
                                  setProfile({ ...profile, serviceAreas: next });
                                }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setProfile({
                                  ...profile,
                                  serviceAreas: profile.serviceAreas.filter((_, i) => i !== idx),
                                })
                              }
                              className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[12px] font-semibold text-rose-300 hover:text-rose-200"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden /> Remove this area
                            </button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            setProfile({
                              ...profile,
                              serviceAreas: [
                                ...profile.serviceAreas,
                                { region: profile.region, district: '', city: '', area: '', radiusKm: '', latitude: null, longitude: null },
                              ],
                            })
                          }
                        >
                          Add service area
                        </Button>
                      </div>
                    </fieldset>

                    <TextAreaField
                      label={providerType === 'agency' ? 'About the agency' : 'About you'}
                      rows={4}
                      value={profile.about}
                      onChange={(e) => setProfile({ ...profile, about: e.target.value })}
                    />

                    <fieldset>
                      <legend className="mb-2 text-[13px] font-medium text-zinc-200">
                        Massage services
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {MASSAGE_SERVICE_OPTIONS.map((label) => {
                          const selected = profile.services.includes(label);
                          return (
                            <button
                              key={label}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => toggleService(label)}
                              className={[
                                'inline-flex min-h-11 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/80',
                                selected
                                  ? 'border-brand-gold/50 bg-brand-gold/15 text-white'
                                  : 'border-white/12 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-zinc-200',
                              ].join(' ')}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    {profile.rates.length > 0 ? (
                      <fieldset>
                        <legend className="mb-2 text-[13px] font-medium text-zinc-200">
                          Your rates
                        </legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {profile.rates.map((row, idx) => (
                            <TextField
                              key={`${row.service}-${row.durationMinutes}`}
                              label={`${row.service} · ${row.durationMinutes} min`}
                              type="number"
                              min={0}
                              placeholder="GHS"
                              inputMode="numeric"
                              value={row.price}
                              onChange={(e) => {
                                const next = [...profile.rates];
                                next[idx] = { ...row, price: e.target.value };
                                setProfile({ ...profile, rates: next });
                              }}
                            />
                          ))}
                        </div>
                      </fieldset>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField
                        label="Starting price (GHS)"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={profile.startingPrice}
                        onChange={(e) => setProfile({ ...profile, startingPrice: e.target.value })}
                      />
                      <TextField
                        label="Years of experience"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={profile.yearsExperience}
                        onChange={(e) => setProfile({ ...profile, yearsExperience: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField
                        label="Availability"
                        value={profile.availability}
                        onChange={(e) => setProfile({ ...profile, availability: e.target.value })}
                      >
                        <option value="today">Available today</option>
                        <option value="this_week">This week</option>
                        <option value="flexible">Flexible</option>
                      </SelectField>
                      <TextField
                        label="Working days"
                        placeholder="Mon – Sat"
                        value={profile.workingDays}
                        onChange={(e) => setProfile({ ...profile, workingDays: e.target.value })}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField
                        label="Opening hours"
                        placeholder="09:00 – 20:00"
                        value={profile.workingHours}
                        onChange={(e) => setProfile({ ...profile, workingHours: e.target.value })}
                      />
                      <TextField
                        label="Languages"
                        hint="Separate with commas."
                        value={profile.languages}
                        onChange={(e) => setProfile({ ...profile, languages: e.target.value })}
                      />
                    </div>

                    <fieldset>
                      <legend className="mb-2 text-[13px] font-medium text-zinc-200">
                        Where you offer sessions
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {SERVICE_SETTING_OPTIONS.map((s) => {
                          const selected = profile.serviceSetting.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() =>
                                setProfile({
                                  ...profile,
                                  serviceSetting: selected
                                    ? profile.serviceSetting.filter((x) => x !== s.id)
                                    : [...profile.serviceSetting, s.id],
                                })
                              }
                              className={[
                                'inline-flex min-h-11 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/80',
                                selected
                                  ? 'border-brand-gold/50 bg-brand-gold/15 text-white'
                                  : 'border-white/12 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-zinc-200',
                              ].join(' ')}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextField
                        label="Main photo URL"
                        hint="Temporary until photo upload is available."
                        value={profile.primaryImage}
                        onChange={(e) => setProfile({ ...profile, primaryImage: e.target.value })}
                      />
                      {providerType === 'agency' ? (
                        <TextField
                          label="Cover / logo image URL"
                          hint="Optional"
                          value={profile.coverImage}
                          onChange={(e) => setProfile({ ...profile, coverImage: e.target.value })}
                        />
                      ) : null}
                    </div>

                    <fieldset>
                      <legend className="mb-1 text-[13px] font-medium text-zinc-200">
                        Contact visibility
                      </legend>
                      <CheckboxField
                        name="public-phone"
                        checked={profile.publicPhone}
                        onChange={(e) => setProfile({ ...profile, publicPhone: e.target.checked })}
                        label="Show phone publicly"
                      />
                      <CheckboxField
                        name="public-whatsapp"
                        checked={profile.publicWhatsapp}
                        onChange={(e) => setProfile({ ...profile, publicWhatsapp: e.target.checked })}
                        label="Show WhatsApp publicly"
                      />
                      <CheckboxField
                        name="public-email"
                        checked={profile.publicEmail}
                        onChange={(e) => setProfile({ ...profile, publicEmail: e.target.checked })}
                        label="Show email publicly"
                      />
                    </fieldset>

                    <div className="flex flex-col-reverse gap-2.5 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                      <Button type="submit" loading={loading} loadingLabel="Saving profile" className="w-full sm:w-auto">
                        Save and continue
                      </Button>
                    </div>
                  </form>
                ) : null}

                {step === 'team' ? (
                  <div className="space-y-5">
                    {savedTeam.length > 0 ? (
                      <ul className="space-y-2">
                        {savedTeam.map((m) => (
                          <li
                            key={String(m.id)}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5"
                          >
                            <span className="min-w-0 truncate text-[13.5px] text-zinc-200">
                              {String(m.displayName)}
                              <span className="ml-2 text-[12px] capitalize text-zinc-500">
                                {String(m.gender)}
                              </span>
                            </span>
                            <button
                              type="button"
                              className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[12.5px] font-medium text-rose-300 transition-colors hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70"
                              onClick={async () => {
                                try {
                                  const res = await providerApi.deleteTeamMember(String(m.id));
                                  setSavedTeam(res.teamMembers || []);
                                } catch (err) {
                                  setError(profileFormError(err));
                                }
                              }}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[13px] text-zinc-500">
                        No team members added yet. You can add them now or continue and add more
                        later.
                      </p>
                    )}

                    <form onSubmit={onAddTeamMember} className="space-y-4 border-t border-white/[0.07] pt-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          label="Display name"
                          value={teamDraft.displayName}
                          onChange={(e) => setTeamDraft({ ...teamDraft, displayName: e.target.value })}
                        />
                        <div>
                          <p className="mb-1.5 text-[13px] font-medium text-zinc-200">Gender</p>
                          <div role="radiogroup" aria-label="Team member gender" className="grid grid-cols-2 gap-2">
                            {(['female', 'male'] as const).map((g) => (
                              <button
                                key={g}
                                type="button"
                                aria-pressed={teamDraft.gender === g}
                                onClick={() => setTeamDraft({ ...teamDraft, gender: g })}
                                className={[
                                  'inline-flex h-12 items-center justify-center rounded-xl border text-[13px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/80',
                                  teamDraft.gender === g
                                    ? 'border-brand-gold/50 bg-brand-gold/15 text-white'
                                    : 'border-white/12 bg-white/[0.02] text-zinc-400 hover:text-zinc-200',
                                ].join(' ')}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <TextAreaField
                        label="Short bio"
                        rows={3}
                        value={teamDraft.bio}
                        onChange={(e) => setTeamDraft({ ...teamDraft, bio: e.target.value })}
                      />

                      <fieldset>
                        <legend className="mb-2 text-[13px] font-medium text-zinc-200">
                          Services
                        </legend>
                        <div className="flex flex-wrap gap-2">
                          {MASSAGE_SERVICE_OPTIONS.slice(0, 6).map((label) => {
                            const selected = teamDraft.services.includes(label);
                            return (
                              <button
                                key={label}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                  setTeamDraft({
                                    ...teamDraft,
                                    services: selected
                                      ? teamDraft.services.filter((s) => s !== label)
                                      : [...teamDraft.services, label],
                                  })
                                }
                                className={[
                                  'inline-flex min-h-11 items-center rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/80',
                                  selected
                                    ? 'border-brand-gold/50 bg-brand-gold/15 text-white'
                                    : 'border-white/12 bg-white/[0.02] text-zinc-400 hover:border-white/25 hover:text-zinc-200',
                                ].join(' ')}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <TextField
                          label="Years of experience"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={teamDraft.yearsExperience}
                          onChange={(e) => setTeamDraft({ ...teamDraft, yearsExperience: e.target.value })}
                        />
                        <SelectField
                          label="Availability"
                          value={teamDraft.availability}
                          onChange={(e) => setTeamDraft({ ...teamDraft, availability: e.target.value })}
                        >
                          <option value="today">Available today</option>
                          <option value="this_week">This week</option>
                          <option value="flexible">Flexible</option>
                        </SelectField>
                      </div>

                      <TextField
                        label="Rates note"
                        hint="Leave blank to inherit agency rates."
                        value={teamDraft.ratesNote}
                        onChange={(e) => setTeamDraft({ ...teamDraft, ratesNote: e.target.value })}
                      />

                      <div>
                        <p className="mb-1.5 text-[13px] font-medium text-zinc-200">Status</p>
                        <div role="radiogroup" aria-label="Team member status" className="grid grid-cols-2 gap-2">
                          {(['active', 'inactive'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              aria-pressed={teamDraft.status === s}
                              onClick={() => setTeamDraft({ ...teamDraft, status: s })}
                              className={[
                                'inline-flex h-12 items-center justify-center rounded-xl border text-[13px] font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/80',
                                teamDraft.status === s
                                  ? 'border-brand-gold/50 bg-brand-gold/15 text-white'
                                  : 'border-white/12 bg-white/[0.02] text-zinc-400 hover:text-zinc-200',
                              ].join(' ')}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        type="submit"
                        variant="secondary"
                        loading={loading}
                        loadingLabel="Adding"
                        className="w-full sm:w-auto"
                      >
                        Add team member
                      </Button>
                    </form>

                    <div className="flex flex-col-reverse gap-2.5 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                      <Button onClick={() => setStep('identity')} className="w-full sm:w-auto">
                        Continue to verification
                      </Button>
                    </div>
                  </div>
                ) : null}

                {step === 'identity' ? (
                  <form onSubmit={onSubmitIdentity} className="space-y-5">
                    <div>
                      <p className="mb-2 text-[13px] font-medium text-zinc-200">
                        How would you like to verify?
                      </p>
                      <div
                        role="radiogroup"
                        aria-label="Identity verification choice"
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        <SelectableCard
                          selected={identity.choice === 'verify_identity'}
                          title="Verify My Identity"
                          description="Upload a government ID and selfie now. An admin reviews them before any badge is granted."
                          icon={<BadgeCheck className="h-5 w-5" aria-hidden />}
                          onClick={() => setIdentity({ ...identity, choice: 'verify_identity' })}
                        />
                        <SelectableCard
                          selected={identity.choice === 'verify_later'}
                          title="Verify Later"
                          description="Upload a selfie only. Your profile stays Unverified, and you can add your ID from your workspace later."
                          icon={<Clock3 className="h-5 w-5" aria-hidden />}
                          onClick={() => setIdentity({ ...identity, choice: 'verify_later' })}
                        />
                      </div>
                    </div>

                    {identity.choice === 'verify_identity' ? (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <SelectField
                            label="ID type"
                            value={identity.idType}
                            onChange={(e) => setIdentity({ ...identity, idType: e.target.value })}
                          >
                            <option>Ghana Card</option>
                            <option>Passport</option>
                            <option>Driver Licence</option>
                            <option>Voter ID</option>
                          </SelectField>
                          <TextField
                            label="ID number"
                            hint="Optional"
                            value={identity.idNumber}
                            onChange={(e) => setIdentity({ ...identity, idNumber: e.target.value })}
                          />
                        </div>
                        <FileField
                          label="Government ID image"
                          required
                          file={identity.idImage}
                          onChange={(file) => setIdentity({ ...identity, idImage: file })}
                        />
                      </>
                    ) : null}

                    {identity.choice === 'verify_later' ? (
                      <Alert variant="info">
                        Your profile will show as Unverified. The selfie is stored privately and is not used
                        as your public profile photo. You can add a government ID from your provider
                        workspace at any time.
                      </Alert>
                    ) : null}

                    {identity.choice ? (
                      <FileField
                        label={identity.choice === 'verify_later' ? 'Selfie / live photo (required)' : 'Selfie / live photo'}
                        required
                        file={identity.selfieImage}
                        onChange={(file) => setIdentity({ ...identity, selfieImage: file })}
                      />
                    ) : null}

                    <p className="text-[12.5px] leading-relaxed text-zinc-500">
                      JPG, PNG or WebP. Documents are stored privately and visible only to the admin review
                      team. Uploading does not grant a Verified badge.
                    </p>

                    <div className="flex flex-col-reverse gap-2.5 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                      <Button
                        type="submit"
                        loading={loading}
                        loadingLabel="Submitting"
                        disabled={!identity.choice}
                        className="w-full sm:w-auto"
                      >
                        {identity.choice === 'verify_later' ? 'Save selfie and continue' : 'Submit identity'}
                      </Button>
                    </div>
                  </form>
                ) : null}

                {step === 'membership' ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <div>
                        <p className="text-[12px] font-medium text-zinc-400">Membership</p>
                        <p className="mt-1 text-2xl font-semibold text-white">
                          {membership.feeEnabled
                            ? `${membership.currency} ${membership.feeAmount.toFixed(0)}`
                            : 'Free'}
                        </p>
                      </div>
                      <p className="max-w-xs text-[12px] leading-relaxed text-zinc-500">
                        {membership.feeEnabled
                          ? 'One-off membership fee. It does not guarantee approval.'
                          : 'No fee is charged. Identity checks and admin approval still apply.'}
                      </p>
                    </div>

                    <Alert variant={membership.feeEnabled ? 'info' : 'success'}>
                      {membership.message}
                    </Alert>

                    <p className="text-[13px] leading-relaxed text-zinc-500">
                      Free membership does not grant a verified badge. An admin reviews your
                      identity documents before any badge appears.
                    </p>

                    <div className="flex flex-col-reverse gap-2.5 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                      {backButton}
                      <Button
                        onClick={onMembershipContinue}
                        loading={loading}
                        loadingLabel="Preparing"
                        className="w-full sm:w-auto"
                      >
                        Continue to review
                      </Button>
                    </div>
                  </div>
                ) : null}

                {step === 'review' ? (
                  <div className="space-y-5">
                    <dl className="divide-y divide-white/[0.07] rounded-xl border border-white/10 bg-white/[0.02] px-4">
                      {[
                        { label: 'Provider type', value: providerType === 'agency' ? 'Agency' : 'Individual' },
                        {
                          label: providerType === 'agency' ? 'Agency name' : 'Display name',
                          value: profile.displayName || account.displayName || account.businessName || '—',
                        },
                        { label: 'City', value: profile.city || '—' },
                        {
                          label: 'Services',
                          value: profile.services.length ? profile.services.join(', ') : '—',
                        },
                        {
                          label: 'Rates',
                          value:
                            profile.rates.filter((r) => r.price.trim() !== '').length > 0
                              ? `${profile.rates.filter((r) => r.price.trim() !== '').length} rate rows`
                              : profile.startingPrice
                                ? `From GHS ${profile.startingPrice}`
                                : '—',
                        },
                        { label: 'Email verified', value: 'Yes' },
                        {
                          label: 'Membership',
                          value: membership.feeEnabled
                            ? `${membership.currency} ${membership.feeAmount.toFixed(0)}`
                            : 'Free',
                        },
                      ].map((row) => (
                        <div key={row.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between sm:gap-6">
                          <dt className="text-[12.5px] font-medium text-zinc-500">{row.label}</dt>
                          <dd className="text-[13.5px] text-zinc-200 sm:text-right">{row.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <Alert variant="info">
                      An admin reviews verification details before granting the verified badge.
                    </Alert>

                    <div className="flex flex-col-reverse gap-2.5 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                      {backButton}
                      <Button
                        onClick={onSubmitReview}
                        loading={loading}
                        loadingLabel="Submitting"
                        className="w-full sm:w-auto"
                      >
                        Submit for review
                      </Button>
                    </div>
                  </div>
                ) : null}
                </div>
              </section>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
};

function FileField({
  label,
  required,
  file,
  onChange,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-zinc-200">
        {label}
        {required ? (
          <span className="text-brand-gold-light" aria-hidden>
            *
          </span>
        ) : null}
      </p>
      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/12 bg-[#101012] px-3.5 text-[13px] text-zinc-400 transition-colors hover:border-white/25 focus-within:border-brand-gold/60 focus-within:ring-2 focus-within:ring-brand-gold/20">
        <span className="truncate">{file ? file.name : 'Choose file'}</span>
        <span className="shrink-0 rounded-lg border border-white/12 px-2.5 py-1 text-[12px] font-medium text-zinc-200">
          Browse
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={required}
          className="sr-only"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}
