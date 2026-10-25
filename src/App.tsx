import React, { useEffect, useState } from 'react';
import type { AuthUser } from './services/api';
import { api } from './services/api';
import type { LanguageMode, NavTab } from './types';
import { Navbar } from './components/Navbar';
import { DashboardOverview } from './components/Dashboard/DashboardOverview';
import { LiveClassHub } from './components/LiveClasses/LiveClassHub';
import { MockTestHub } from './components/MockTests/MockTestHub';
import { DigitalLibraryHub } from './components/Library/DigitalLibraryHub';
import { PerformanceTracker } from './components/Performance/PerformanceTracker';
import { DiscussionForumHub } from './components/Forum/DiscussionForumHub';
import { AdminPortal } from './components/Admin/AdminPortal';
import { DailyDrillModal } from './components/Dashboard/DailyDrillModal';
import { AuthScreen } from './components/AuthScreen';
import { ExternalLink } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [lang, setLang] = useState<LanguageMode>('en');
  const [streakCount, setStreakCount] = useState(0);
  const [isDailyDrillOpen, setIsDailyDrillOpen] = useState(false);
  const [dbRefreshTrigger, setDbRefreshTrigger] = useState(0);

  useEffect(() => {
    api.getSession()
      .then(setUser)
      .catch((error: unknown) => {
        setSessionError(error instanceof Error ? error.message : 'Unable to verify your sign-in.');
      })
      .finally(() => setIsCheckingSession(false));

    const handleSessionExpired = () => {
      setUser(null);
      setActiveTab('dashboard');
      setIsDailyDrillOpen(false);
    };
    window.addEventListener('sankalp:unauthorized', handleSessionExpired);
    return () => window.removeEventListener('sankalp:unauthorized', handleSessionExpired);
  }, []);

  const refreshUserProgress = async () => {
    if (!user) {
      setStreakCount(0);
      return;
    }
    try {
      const profile = await api.getAspirantProfile();
      setStreakCount(profile.streakDays);
    } catch (error) {
      console.error('Could not refresh practice progress:', error);
    }
  };

  useEffect(() => {
    void refreshUserProgress();
  }, [user?.id]);

  const handleLogin = async (email: string, password: string) => {
    const signedInUser = await api.login(email, password);
    setUser(signedInUser);
    setActiveTab('dashboard');
    setSessionError(null);
    return signedInUser;
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    const newUser = await api.register(name, email, password);
    setUser(newUser);
    setActiveTab('dashboard');
    setSessionError(null);
    return newUser;
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      setActiveTab('dashboard');
      setIsDailyDrillOpen(false);
    } catch (error) {
      setSessionError(error instanceof Error ? error.message : 'Could not sign out. Please try again.');
    }
  };

  const handleDataChanged = () => {
    setDbRefreshTrigger(previous => previous + 1);
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === 'admin' && user?.role !== 'admin') return;
    setActiveTab(tab);
  };

  if (isCheckingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f6f3]">
        <div aria-label="Loading your account" className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" role="status" />
      </main>
    );
  }

  if (!user) {
    return (
      <>
        {sessionError && (
          <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg" role="alert">
            {sessionError}
          </div>
        )}
        <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 selection:bg-amber-200 selection:text-slate-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        lang={lang}
        setLang={setLang}
        streakCount={streakCount}
        user={user}
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 sm:px-6 sm:pt-8">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            setActiveTab={handleTabChange}
            lang={lang}
            streakCount={streakCount}
            onOpenQuickDrill={() => setIsDailyDrillOpen(true)}
            refreshTrigger={dbRefreshTrigger}
          />
        )}
        {activeTab === 'live' && <LiveClassHub lang={lang} refreshTrigger={dbRefreshTrigger} />}
        {activeTab === 'mock-tests' && (
          <MockTestHub
            lang={lang}
            isAdmin={user.role === 'admin'}
            onTestCompleted={() => { void refreshUserProgress(); }}
            refreshTrigger={dbRefreshTrigger}
          />
        )}
        {activeTab === 'library' && <DigitalLibraryHub lang={lang} refreshTrigger={dbRefreshTrigger} />}
        {activeTab === 'performance' && (
          <PerformanceTracker lang={lang} refreshTrigger={dbRefreshTrigger} />
        )}
        {activeTab === 'forum' && <DiscussionForumHub lang={lang} refreshTrigger={dbRefreshTrigger} />}
        {activeTab === 'admin' && user.role === 'admin' && (
          <AdminPortal
            lang={lang}
            onDataChanged={handleDataChanged}
            onOpenTests={() => handleTabChange('mock-tests')}
          />
        )}
      </main>

      <DailyDrillModal
        isOpen={isDailyDrillOpen}
        onClose={() => setIsDailyDrillOpen(false)}
        lang={lang}
        onDrillComplete={() => { void refreshUserProgress(); }}
      />

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6">
          <span>© 2026 Sankalp IAS · Learn with purpose.</span>
          <div className="flex items-center gap-4">
            <a className="inline-flex items-center gap-1 hover:text-slate-900" href="https://upsc.gov.in" rel="noreferrer" target="_blank">
              UPSC official website <ExternalLink className="h-3 w-3" />
            </a>
            {user.role === 'admin' && (
              <button className="font-medium text-amber-800 hover:text-amber-950" onClick={() => handleTabChange('admin')}>
                Content management
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
