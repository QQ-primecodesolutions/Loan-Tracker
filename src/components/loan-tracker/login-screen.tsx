'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoanStore } from '@/lib/loan-store';

export default function LoginScreen() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const login = useLoanStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const success = await login(password);
    setSubmitting(false);
    if (success) {
      setError('');
    } else {
      setError('Wrong password. Try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Loan Tracker</h1>
          <p className="text-sm text-muted-foreground mt-1">50% Interest Loan Manager</p>
        </div>

        {/* Login Card */}
        <div
          className={`rounded-xl border border-border bg-card p-6 neon-glow transition-transform ${
            shake ? 'animate-[shake_0.5s_ease-in-out]' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Enter Password</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-muted-foreground text-xs">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your password"
                  className="bg-surface border-border pr-10 text-foreground placeholder:text-zinc-600 focus:border-primary"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive font-medium">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground font-semibold hover:bg-neon-glow hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all disabled:opacity-60"
            >
              {submitting ? 'Unlocking...' : 'Unlock'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}