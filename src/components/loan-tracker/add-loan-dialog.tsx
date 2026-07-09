'use client';

import { useState, useEffect } from 'react';
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
import { useLoanStore } from '@/lib/loan-store';
import type { Loan } from '@/lib/types';

const loanSchema = z.object({
  borrowerName: z.string().min(2, 'Name must be at least 2 characters'),
  contact: z.string().min(3, 'Contact must be at least 3 characters'),
  amountBorrowed: z.coerce.number().min(1, 'Amount must be greater than 0'),
  dateBorrowed: z.string().min(1, 'Date borrowed is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional().default(''),
});

type LoanFormData = z.infer<typeof loanSchema>;

interface AddLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editLoan?: Loan | null;
}

export default function AddLoanDialog({ open, onOpenChange, editLoan }: AddLoanDialogProps) {
  const addLoan = useLoanStore((s) => s.addLoan);
  const updateLoan = useLoanStore((s) => s.updateLoan);
  const [amount, setAmount] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      borrowerName: '',
      contact: '',
      amountBorrowed: 0,
      dateBorrowed: new Date().toISOString().split('T')[0],
      dueDate: '',
      notes: '',
    },
  });

  const watchedAmount = watch('amountBorrowed');

  useEffect(() => {
    if (editLoan) {
      setValue('borrowerName', editLoan.borrowerName);
      setValue('contact', editLoan.contact);
      setValue('amountBorrowed', editLoan.amountBorrowed);
      setAmount(String(editLoan.amountBorrowed));
      setValue('dateBorrowed', editLoan.dateBorrowed);
      setValue('dueDate', editLoan.dueDate);
      setValue('notes', editLoan.notes);
    } else {
      reset();
      setValue('dateBorrowed', new Date().toISOString().split('T')[0]);
      setAmount('');
    }
  }, [editLoan, open, setValue, reset]);

  const fee = (Number(watchedAmount) || 0) * 0.5;
  const totalReturn = (Number(watchedAmount) || 0) * 1.5;

  const onSubmit = (data: LoanFormData) => {
    if (editLoan) {
      updateLoan(editLoan.id, {
        borrowerName: data.borrowerName,
        contact: data.contact,
        amountBorrowed: data.amountBorrowed,
        dateBorrowed: data.dateBorrowed,
        dueDate: data.dueDate,
        notes: data.notes,
      });
    } else {
      addLoan({
        borrowerName: data.borrowerName,
        contact: data.contact,
        amountBorrowed: data.amountBorrowed,
        dateBorrowed: data.dateBorrowed,
        dueDate: data.dueDate,
        notes: data.notes,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            {editLoan ? 'Edit Loan' : 'New Loan Entry'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="borrowerName" className="text-xs text-muted-foreground">Borrower Name</Label>
              <Input
                id="borrowerName"
                {...register('borrowerName')}
                placeholder="e.g. John Doe"
                className="bg-surface border-border text-foreground placeholder:text-zinc-600"
              />
              {errors.borrowerName && <p className="text-xs text-destructive">{errors.borrowerName.message}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="contact" className="text-xs text-muted-foreground">ID / Contact</Label>
              <Input
                id="contact"
                {...register('contact')}
                placeholder="e.g. 082 123 4567"
                className="bg-surface border-border text-foreground placeholder:text-zinc-600"
              />
              {errors.contact && <p className="text-xs text-destructive">{errors.contact.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountBorrowed" className="text-xs text-muted-foreground">Amount Borrowed (R)</Label>
              <Input
                id="amountBorrowed"
                type="number"
                step="0.01"
                {...register('amountBorrowed', {
                  onChange: (e) => setAmount(e.target.value),
                })}
                placeholder="0.00"
                className="bg-surface border-border text-foreground placeholder:text-zinc-600"
              />
              {errors.amountBorrowed && <p className="text-xs text-destructive">{errors.amountBorrowed.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateBorrowed" className="text-xs text-muted-foreground">Date Borrowed</Label>
              <Input
                id="dateBorrowed"
                type="date"
                {...register('dateBorrowed')}
                className="bg-surface border-border text-foreground"
              />
              {errors.dateBorrowed && <p className="text-xs text-destructive">{errors.dateBorrowed.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-xs text-muted-foreground">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                {...register('dueDate')}
                className="bg-surface border-border text-foreground"
              />
              {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes (Optional)</Label>
              <Input
                id="notes"
                {...register('notes')}
                placeholder="Any notes..."
                className="bg-surface border-border text-foreground placeholder:text-zinc-600"
              />
            </div>
          </div>

          {/* Auto-calculated fields */}
          {Number(watchedAmount) > 0 && (
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-surface border border-border">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">50% Fee</p>
                <p className="text-sm font-semibold text-primary">R{fee.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Total to Return</p>
                <p className="text-sm font-semibold text-emerald-400">R{totalReturn.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground font-semibold hover:bg-neon-glow hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] transition-all"
            >
              {editLoan ? 'Update Loan' : 'Add Loan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}