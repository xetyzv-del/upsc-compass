import React from 'react';
import {
  BarChart3,
  BookOpen,
  FileCheck2,
  Flame,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Video
} from 'lucide-react';
import type { AuthUser } from '../services/api';
import type { LanguageMode, NavTab } from '../types';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  lang: LanguageMode;
  setLang: (lang: LanguageMode) => void;
  streakCount: number;
  user: AuthUser;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  lang,
  setLang,
  streakCount,
  user,
  onLogout
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: lang === 'hi' ? 'डैशबोर्ड' : 'Home', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'live', label: lang === 'hi' ? 'कक्षाएं' : 'Classes', icon: <Video className="h-4 w-4" /> },
    { id: 'mock-tests', label: lang === 'hi' ? 'अभ्यास' : 'Practice', icon: <FileCheck2 className="h-4 w-4" /> },
    { id: 'library', label: lang === 'hi' ? 'पुस्तकालय' : 'Library', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'performance', label: lang === 'hi' ? 'प्रगति' : 'Progress', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'forum', label: lang === 'hi' ? 'समुदाय' : 'Community', icon: <MessageSquare className="h-4 w-4" /> }
  ];

  if (user.role === 'admin') {
    navItems.push({
      id: 'admin',
      label: lang === 'hi' ? 'प्रबंधन' : 'Manage',
      icon: <ShieldCheck className="h-4 w-4" />
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <button
            aria-label="Go to dashboard"
            className="flex shrink-0 items-center gap-2.5 text-left"
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 font-serif text-xl font-bold text-slate-950">S</span>
            <span>
              <span className="block font-semibold tracking-wide text-slate-900">SANKALP IAS</span>
              <span className="hidden text-[11px] text-slate-500 sm:block">Your preparation, in focus</span>
            </span>
          </button>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 xl:flex">
            {navItems.map(item => (
              <button
                aria-current={activeTab === item.id ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === item.id
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
                key={item.id}
                onClick={() => setActiveTab(item.id)}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-800 sm:flex">
              <Flame className="h-3.5 w-3.5" />
              {streakCount}
            </span>
            <label className="sr-only" htmlFor="language">Language</label>
            <select
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 outline-none focus:border-amber-500"
              id="language"
              onChange={event => setLang(event.target.value as LanguageMode)}
              value={lang}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
            <div className="hidden max-w-36 border-l border-slate-200 pl-3 sm:block">
              <p className="truncate text-xs font-semibold text-slate-800">{user.name}</p>
              <p className="truncate text-[11px] capitalize text-slate-500">{user.role}</p>
            </div>
            <button
              aria-label="Sign out"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={onLogout}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav aria-label="Mobile navigation" className="flex gap-1 overflow-x-auto border-t border-slate-100 py-2 xl:hidden">
          {navItems.map(item => (
            <button
              aria-current={activeTab === item.id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                activeTab === item.id ? 'bg-amber-50 text-amber-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
