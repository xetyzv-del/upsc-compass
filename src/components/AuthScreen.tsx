import React, { useState } from 'react';
import { ArrowRight, BookOpen, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import type { AuthUser } from '../services/api';

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<AuthUser>;
  onRegister: (name: string, email: string, password: string) => Promise<AuthUser>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister }) => {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isCreatingAccount) {
        await onRegister(name.trim(), email.trim(), password);
      } else {
        await onLogin(email.trim(), password);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not sign you in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f6f3] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#111d32] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
          <div className="absolute -right-32 -top-20 h-96 w-96 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="absolute -bottom-36 -left-20 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 font-serif text-2xl font-bold text-slate-950">S</div>
            <div>
              <p className="font-semibold tracking-wide">SANKALP IAS</p>
              <p className="text-xs text-slate-400">Civil Services Preparation</p>
            </div>
          </div>

          <div className="relative max-w-xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-amber-200">
              <GraduationCap className="h-4 w-4" />
              One focused space for your preparation
            </span>
            <h1 className="font-serif text-4xl font-semibold leading-tight xl:text-5xl">
              Make every day of preparation count.
            </h1>
            <p className="max-w-lg text-base leading-7 text-slate-300">
              Build a steady routine with practice tests, thoughtful lessons, current affairs and a clear view of your progress.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <BookOpen className="mb-3 h-5 w-5 text-amber-300" />
                <p className="font-medium">Learn with direction</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Study material and classes in one place.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-amber-300" />
                <p className="font-medium">Your own account</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">A personal space for your learning journey.</p>
              </div>
            </div>
          </div>

          <p className="relative text-xs text-slate-500">सत्यमेव जयते · Sankalp IAS Academy</p>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 font-serif text-xl font-bold text-slate-950">S</div>
              <div>
                <p className="font-semibold tracking-wide">SANKALP IAS</p>
                <p className="text-xs text-slate-500">Civil Services Preparation</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-amber-700">Welcome to Sankalp</p>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                {isCreatingAccount ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isCreatingAccount
                  ? 'Start building a consistent and confident preparation routine.'
                  : 'Sign in to continue your preparation.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isCreatingAccount && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Full name</span>
                  <input
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    maxLength={100}
                    onChange={event => setName(event.target.value)}
                    placeholder="Your name"
                    required
                    value={name}
                  />
                </label>
              )}

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Email address</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    onChange={event => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={email}
                  />
                </span>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    autoComplete={isCreatingAccount ? 'new-password' : 'current-password'}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    minLength={isCreatingAccount ? 12 : undefined}
                    onChange={event => setPassword(event.target.value)}
                    placeholder={isCreatingAccount ? 'At least 12 characters' : 'Enter your password'}
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
                    onClick={() => setShowPassword(visible => !visible)}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
                {isCreatingAccount && <span className="block text-xs text-slate-500">Use at least 12 characters.</span>}
              </label>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {error}
                </div>
              )}

              <button
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111d32] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/15 disabled:cursor-wait disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? 'Please wait…' : isCreatingAccount ? 'Create account' : 'Sign in'}
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">
              {isCreatingAccount ? 'Already have an account?' : 'New to Sankalp IAS?'}{' '}
              <button
                className="font-semibold text-amber-800 hover:text-amber-900"
                onClick={() => {
                  setError(null);
                  setIsCreatingAccount(value => !value);
                }}
                type="button"
              >
                {isCreatingAccount ? 'Sign in' : 'Create an account'}
              </button>
            </p>
            <p className="mt-10 text-center text-xs leading-5 text-slate-400">
              By continuing, you agree to use this learning platform responsibly.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
};
