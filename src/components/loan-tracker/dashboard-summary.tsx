'use client';

import { useLoanStore, type Summary } from '@/lib/loan-store';
import { Banknote, TrendingUp, Wallet, AlertTriangle, Clock, DollarSign } from 'lucide-react';

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 neon-glow hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg ${accent}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}

function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardSummary() {
  const getSummary = useLoanStore((s) => s.getSummary);
  const loans = useLoanStore((s) => s.loans);
  const lateFeeEnabled = useLoanStore((s) => s.lateFeeEnabled);

  // Recompute on every render
  const summary: Summary = getSummary();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <SummaryCard
        label="Total Loaned"
        value={formatCurrency(summary.totalLoanedOut)}
        icon={Banknote}
        accent="bg-primary/10 text-primary"
        subtext={`${loans.length} loan${loans.length !== 1 ? 's' : ''}`}
      />
      <SummaryCard
        label="Expected Returns"
        value={formatCurrency(summary.totalExpectedReturns)}
        icon={TrendingUp}
        accent="bg-emerald-500/10 text-emerald-400"
        subtext="incl. 50% + late fees"
      />
      <SummaryCard
        label="Collected"
        value={formatCurrency(summary.totalCollected)}
        icon={Wallet}
        accent="bg-blue-500/10 text-blue-400"
      />
      <SummaryCard
        label="Outstanding"
        value={formatCurrency(summary.totalOutstanding)}
        icon={DollarSign}
        accent="bg-orange-500/10 text-orange-400"
      />
      <SummaryCard
        label="Overdue"
        value={String(summary.totalOverdueCount)}
        icon={AlertTriangle}
        accent="bg-red-500/10 text-red-400"
        subtext={lateFeeEnabled ? `R${summary.totalLateFees.toLocaleString()} in late fees` : 'Late fees OFF'}
      />
      <SummaryCard
        label="Late Fees"
        value={formatCurrency(summary.totalLateFees)}
        icon={Clock}
        accent="bg-purple-500/10 text-purple-400"
        subtext={lateFeeEnabled ? 'R50/day active' : 'Disabled'}
      />
    </div>
  );
}