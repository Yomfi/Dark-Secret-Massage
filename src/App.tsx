import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { SafetyTrust } from './components/SafetyTrust';
import { Footer } from './components/Footer';
import { ClientDashboard } from './components/ClientDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MassageBookingPage } from './pages/MassageBookingPage';
import { MassagePage } from './pages/MassagePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ExplorePage } from './pages/ExplorePage';
import { MarketplaceProfilePage } from './pages/MarketplaceProfilePage';
import { ProviderRegisterPage } from './pages/ProviderRegisterPage';
import { ProviderDashboardPage } from './pages/ProviderDashboardPage';
import { AdminProviderReviewsPage } from './pages/AdminProviderReviewsPage';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { BookingRequest } from './lib/bookingAndMatchmaking';
import type { MassageBookingRecord } from './lib/massageBooking';

export type StoredBooking = BookingRequest & {
  totalGHS: number;
  id: string;
  status?: string;
  reference?: string;
  clientEmail?: string;
};

function HomePage({
  onOpenDashboard,
  bookMassagePath,
}: {
  onOpenDashboard: () => void;
  bookMassagePath: (serviceId?: string) => string;
}) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.title = 'Dark Secret — Massage Services Near You';
  }, []);

  const goBook = (serviceId?: string) => {
    navigate(bookMassagePath(serviceId));
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar
        onOpenBooking={() => goBook()}
        onOpenDashboard={onOpenDashboard}
        isAuthenticated={isAuthenticated}
      />

      <main className="flex-1 flex flex-col">
        <Hero />
        <SafetyTrust />
      </main>

      <Footer onOpenBooking={() => goBook()} onOpenDashboard={onOpenDashboard} />
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
      {/* Matchmaking retired from public experience — source preserved in src/_archived/matchmaking */}
      <Route path="/find-a-life-partner" element={<Navigate to="/explore" replace />} />
      <Route path="/matchmaking" element={<Navigate to="/explore" replace />} />
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
      <Route path="/provider/register" element={<ProviderRegisterPage />} />
      <Route path="/provider/dashboard" element={<ProviderDashboardPage />} />
      <Route path="/admin/provider-reviews" element={<AdminProviderReviewsPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ClientDashboard
              onBackToHome={() => navigate('/')}
              onOpenBooking={() => navigate('/book-massage')}
              userBookings={userBookings}
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
