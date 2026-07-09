'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLoanStore, type EnrichedLoan } from '@/lib/loan-store';
import { Trash2, Plus, CreditCard, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().optional().default(''),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: EnrichedLoan | null;
}

function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PaymentDialog({ open, onOpenChange, loan }: PaymentDialogProps) {
  const addPayment = useLoanStore((s) => s.addPayment);
  const deletePayment = useLoanStore((s) => s.deletePayment);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      note: '',
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    if (!loan) return;

    if (data.amount > loan.balance) {
      setError(`Amount exceeds outstanding balance of ${formatCurrency(loan.balance)}`);
      return;
    }

    addPayment(loan.id, {
      amount: data.amount,
      date: data.date,
      note: data.note,
    });
    reset({ amount: 0, date: new Date().toISOString().split('T')[0], note: '' });
    setError('');
  };

  if (!loan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            {loan.borrowerName} — Payments
          </DialogTitle>
        </DialogHeader>

        {/* Loan Info */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-surface border border-border text-center">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Due</p>
            <p className="text-sm font-bold text-emerald-400">{formatCurrency(loan.totalDue)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid</p>
            <p className="text-sm font-bold text-blue-400">{formatCurrency(loan.totalPaid)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(loan.balance)}</p>
          </div>
        </div>

        {/* Payment Form */}
        {loan.computedStatus !== 'paid' && (
          <div className="border border-border rounded-lg p-3 bg-surface/50">
            <p className="text-xs font-semibold text-foreground mb-3">Record Payment</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Amount (R)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('amount')}
                    placeholder="0.00"
                    className="bg-surface border-border text-foreground text-sm"
                  />
                  {errors.amount && <p className="text-[10px] text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Payment Date</Label>
                  <Input
                    type="date"
                    {...register('date')}
                    className="bg-surface border-border text-foreground text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Note (Optional)</Label>
                <Textarea
                  {...register('note')}
                  placeholder="Payment note..."
                  rows={2}
                  className="bg-surface border-border text-foreground text-sm resize-none"
                />
              </div>
              {error && (
                <div className="flex items-center gap-1.5 text-destructive text-xs">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </div>
              )}
              <Button
                type="submit"
                size="sm"
                className="w-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-neon-glow"
              >
                <Plus className="w-3 h-3 mr-1" />
                Record Payment
              </Button>
            </form>
          </div>
        )}

        <Separator className="bg-border" />

        {/* Payment History */}
        <div className="flex-1 min-h-0">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Payment History ({loan.payments.length})
          </p>
          <ScrollArea className="h-48">
            {loan.payments.length === 0 ? (
              <div className="text-center py-6 text-zinc-600 text-sm">
                No payments recorded yet
              </div>
            ) : (
              <div className="space-y-2">
                {loan.payments
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                            {formatCurrency(payment.amount)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(payment.date), 'dd MMM yyyy')}
                          </span>
                        </div>
                        {payment.note && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">{payment.note}</p>
                        )}
                      </div>
                      {loan.computedStatus !== 'paid' && (
                        <button
                          onClick={() => deletePayment(loan.id, payment.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}