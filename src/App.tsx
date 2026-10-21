import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TwoExperiences } from './components/TwoExperiences';
import { MatchmakingStory } from './components/MatchmakingStory';
import { MassageStory } from './components/MassageStory';
import { HowItWorks } from './components/HowItWorks';
import { VisualGallery } from './components/VisualGallery';
import { SafetyTrust } from './components/SafetyTrust';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';
import { ClientDashboard } from './components/ClientDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MassageBookingPage } from './pages/MassageBookingPage';
import { MassagePage } from './pages/MassagePage';
import { MatchDiscoveryPage } from './pages/MatchDiscoveryPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ExplorePage } from './pages/ExplorePage';
import { MarketplaceProfilePage } from './pages/MarketplaceProfilePage';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { MatchmakingProfile, BookingRequest } from './lib/bookingAndMatchmaking';
import { MATCHMAKING_PROFILES } from './data/mockData';
import type { MassageBookingRecord } from './lib/massageBooking';

export type StoredBooking = BookingRequest & {
  totalGHS: number;
  id: string;
  status?: string;
  reference?: string;
  clientEmail?: string;
};

const FIND_PARTNER_PATH = '/find-a-life-partner';

function HomePage({
  onOpenDashboard,
  bookMassagePath,
}: {
  onOpenDashboard: () => void;
  bookMassagePath: (serviceId?: string) => string;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    }
  }, [location.hash, location.pathname]);

  const goBook = (serviceId?: string) => {
    navigate(bookMassagePath(serviceId));
  };

  const goMatchmaking = () => navigate(FIND_PARTNER_PATH);

  return (
    <div className="relative">
      <Navbar
        onOpenMatchmaking={goMatchmaking}
        onOpenBooking={() => goBook()}
        onOpenDashboard={onOpenDashboard}
        isAuthenticated={isAuthenticated}
      />

      <main>
        <Hero onOpenMatchmaking={goMatchmaking} onOpenBooking={() => goBook()} />
        <TwoExperiences onOpenMatchmaking={goMatchmaking} onOpenBooking={() => goBook()} />
        <MatchmakingStory onOpenMatchmaking={goMatchmaking} />
        <MassageStory
          onOpenBooking={() => goBook()}
          onSelectService={(serviceId) => goBook(serviceId)}
        />
        <HowItWorks />
        <VisualGallery />
        <SafetyTrust />
        <FinalCta onOpenMatchmaking={goMatchmaking} onOpenBooking={() => goBook()} />
      </main>

      <Footer
        onOpenMatchmaking={goMatchmaking}
        onOpenBooking={() => goBook()}
        onOpenDashboard={onOpenDashboard}
      />
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [userBookings, setUserBookings] = useState<StoredBooking[]>([
    {
      id: 'bk-exec-01',
      therapistId: 'therapist-1',
      serviceType: 'Deep Tissue Recovery Therapy',
      durationMinutes: 90,
      date: '2026-10-24',
      timeSlot: '16:30 - 18:00',
      locationType: 'studio',
      clientName: 'Kwabena Mensah',
      clientPhone: '+233 24 555 0192',
      totalGHS: 975,
      status: 'confirmed',
    },
  ]);

  const [userIntroductions] = useState<
    Array<{ profile: MatchmakingProfile; note: string; status: string; date: string }>
  >([
    {
      profile: MATCHMAKING_PROFILES[0],
      note: 'Looking forward to meeting an authentic professional committed to enduring family values.',
      status: 'Under Concierge Review',
      date: 'Oct 17, 2026',
    },
  ]);

  const bookMassagePath = (serviceId?: string) =>
    serviceId ? `/book-massage?service=${encodeURIComponent(serviceId)}` : '/book-massage';

  const handleBookingRequested = (record: MassageBookingRecord) => {
    const stored: StoredBooking = {
      id: record.id,
      therapistId: record.preferredTherapistId || 'any',
      serviceType: record.serviceName,
      durationMinutes: record.durationMinutes,
      date: record.date,
      timeSlot: record.timeSlotLabel,
      locationType: record.locationType,
      clientName: record.clientName,
      clientPhone: record.clientPhone,
      clientEmail: record.clientEmail,
      clientAddress:
        record.locationType === 'home' ? record.homeLocation.address : undefined,
      specialRequests: record.specialRequests || undefined,
      totalGHS: record.totalGHS,
      status: record.status,
      reference: record.reference,
    };
    setUserBookings((prev) => [stored, ...prev]);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            onOpenDashboard={() => navigate(isAuthenticated ? '/dashboard' : '/login?redirect=/dashboard')}
            bookMassagePath={bookMassagePath}
          />
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route
        path={FIND_PARTNER_PATH}
        element={
          <ProtectedRoute>
            <MatchDiscoveryPage />
          </ProtectedRoute>
        }
      />
      <Route path="/matchmaking" element={<Navigate to={FIND_PARTNER_PATH} replace />} />
      <Route
        path="/book-massage"
        element={
          <MassageBookingPage
            onBookingRequested={handleBookingRequested}
            onViewBookings={() =>
              navigate(isAuthenticated ? '/dashboard?tab=massage' : '/login?redirect=/dashboard?tab=massage')
            }
            accountDefaults={
              user
                ? {
                    clientName: `${user.firstName} ${user.lastName}`.trim(),
                    clientPhone: user.phone,
                    clientEmail: user.email,
                  }
                : undefined
            }
          />
        }
      />
      <Route path="/massage" element={<MassagePage />} />
      <Route path="/massage-services" element={<Navigate to="/massage" replace />} />
      <Route path="/explore" element={<Navigate to="/explore/accra" replace />} />
      <Route path="/explore/:citySlug" element={<ExplorePage />} />
      <Route path="/profile/:profileSlug" element={<MarketplaceProfilePage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ClientDashboard
              onBackToHome={() => navigate('/')}
              onOpenMatchmaking={() => navigate(FIND_PARTNER_PATH)}
              onOpenBooking={() => navigate('/book-massage')}
              userBookings={userBookings}
              userIntroductions={userIntroductions}
            />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-[#060608] text-[#e4e4e9] font-sans selection:bg-purple-900/60 selection:text-purple-200">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
