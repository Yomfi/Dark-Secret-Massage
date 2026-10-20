import React, { useState } from 'react';
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
import { MatchmakingModal } from './components/MatchmakingModal';
import { BookingModal } from './components/BookingModal';
import { ClientDashboard } from './components/ClientDashboard';
import { MatchmakingProfile, BookingRequest } from './lib/bookingAndMatchmaking';
import { MATCHMAKING_PROFILES } from './data/mockData';

export default function App() {
  const [currentView, setCurrentView] = useState<'showcase' | 'dashboard'>('showcase');
  const [isMatchmakingOpen, setIsMatchmakingOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);

  // User state
  const [userBookings, setUserBookings] = useState<Array<BookingRequest & { totalGHS: number; id: string }>>([
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
    },
  ]);

  const [userIntroductions, setUserIntroductions] = useState<
    Array<{ profile: MatchmakingProfile; note: string; status: string; date: string }>
  >([
    {
      profile: MATCHMAKING_PROFILES[0], // Ama Serwaa Mensah
      note: 'Looking forward to meeting an authentic professional committed to enduring family values.',
      status: 'Under Concierge Review',
      date: 'Oct 17, 2026',
    },
  ]);

  const handleOpenMatchmaking = () => {
    setIsMatchmakingOpen(true);
  };

  const handleOpenBooking = (serviceId?: string) => {
    if (serviceId) setSelectedServiceId(serviceId);
    setIsBookingOpen(true);
  };

  const handleBookingConfirmed = (booking: BookingRequest & { totalGHS: number; id: string }) => {
    setUserBookings((prev) => [booking, ...prev]);
  };

  const handleRequestIntro = (profile: MatchmakingProfile, note: string) => {
    const newIntro = {
      profile,
      note,
      status: 'Under Concierge Review',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setUserIntroductions((prev) => [newIntro, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#060608] text-[#e4e4e9] font-sans selection:bg-purple-900/60 selection:text-purple-200">
      {currentView === 'dashboard' ? (
        <ClientDashboard
          onBackToHome={() => setCurrentView('showcase')}
          onOpenMatchmaking={handleOpenMatchmaking}
          onOpenBooking={() => handleOpenBooking()}
          userBookings={userBookings}
          userIntroductions={userIntroductions}
        />
      ) : (
        <div className="relative">
          {/* Top Bar Navigation */}
          <Navbar
            onOpenMatchmaking={handleOpenMatchmaking}
            onOpenBooking={() => handleOpenBooking()}
            onOpenDashboard={() => setCurrentView('dashboard')}
            isAuthenticated={true}
          />

          {/* Public Homepage with Approved Editorial Rhythm */}
          <main>
            {/* 1. Hero: Real Ghanaian couple photographic background */}
            <Hero
              onOpenMatchmaking={handleOpenMatchmaking}
              onOpenBooking={() => handleOpenBooking()}
            />

            {/* 2. Two Distinct Pathways: Matchmaking + Massage */}
            <TwoExperiences
              onOpenMatchmaking={handleOpenMatchmaking}
              onOpenBooking={() => handleOpenBooking()}
            />

            {/* 3. Matrimonial Matchmaking: Real editorial couple photo + concise highlights */}
            <MatchmakingStory onOpenMatchmaking={handleOpenMatchmaking} />

            {/* 4. Professional Massage: Real luxury spa treatment room photo + concise services */}
            <MassageStory
              onOpenBooking={() => handleOpenBooking()}
              onSelectService={(serviceId) => setSelectedServiceId(serviceId)}
            />

            {/* 5. How It Works: Concise 3-step numbered journey */}
            <HowItWorks />

            {/* 6. Atmosphere & Spaces: 3 photography-led cards */}
            <VisualGallery />

            {/* 7. Safety & Trust: 3 minimal pillars with neutral prototype wording */}
            <SafetyTrust />

            {/* 8. Final Call to Action */}
            <FinalCta
              onOpenMatchmaking={handleOpenMatchmaking}
              onOpenBooking={() => handleOpenBooking()}
            />
          </main>

          {/* 9. Footer */}
          <Footer
            onOpenMatchmaking={handleOpenMatchmaking}
            onOpenBooking={() => handleOpenBooking()}
            onOpenDashboard={() => setCurrentView('dashboard')}
          />
        </div>
      )}

      {/* Interactive Modals */}
      <MatchmakingModal
        isOpen={isMatchmakingOpen}
        onClose={() => setIsMatchmakingOpen(false)}
        onRequestIntro={handleRequestIntro}
      />

      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setSelectedServiceId(undefined);
        }}
        onBookingConfirmed={handleBookingConfirmed}
        preselectedServiceId={selectedServiceId}
      />
    </div>
  );
}
