import { useState, type FormEvent } from 'react';
import { Trash2, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { salaryApi, type SalaryEntry } from '../../api/financeHubApi';
import DatePickerField from './DatePickerField';
import { AmountInput, ErrorNote, SectionHead, SubmitButton, fieldClass, errMsg, money, todayStr } from './ui';

export default function SalaryPanel({ salaries, onChanged }: { salaries: SalaryEntry[]; onChanged: () => Promise<void> }) {
  const [amount, setAmount] = useState('');
  const [from, setFrom] = useState(todayStr().slice(0, 8) + '01');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const latest = salaries[0]; // list is newest first

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await salaryApi.create({ amount: amount.trim(), effectiveFrom: from, note: note.trim() || undefined });
      setAmount('');
      setNote('');
      setDone(true);
      setTimeout(() => setDone(false), 1400);
      await onChanged();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await salaryApi.remove(id);
      await onChanged();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <Card variant="white" className="!rounded-[32px]">
      <SectionHead title="Income Configuration" hint="Set your baseline salary for budget tracking" />

      {/* Styled to match the pastel card UI from the image */}
      <div className="relative mb-6 overflow-hidden rounded-[32px] bg-[#d3f4d6] p-6 text-[#1e5c26] shadow-sm">
        {/* Decorative elements */}
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-[1.5px] border-black/5 pointer-events-none" />
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-36 h-36 rounded-full border-[1.5px] border-black/5 pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold opacity-70 mb-1">Active Salary</p>
            <p className="text-3xl font-black tracking-tight">{latest ? money(latest.amount) : 'Not Set'}</p>
            {latest && <p className="text-xs font-medium mt-2 opacity-80">Effective from {latest.effectiveFrom.slice(0, 10)}</p>}
          </div>
          <div className="w-16 h-16 shrink-0 rounded-full bg-white/40 backdrop-blur-sm border border-white/60 flex items-center justify-center">
            <TrendingUp size={24} className="opacity-80" />
          </div>
        </div>
      </div>

      <form onSubmit={add} className="space-y-4">
        <AmountInput value={amount} onChange={setAmount} label="Monthly amount" />
        <div className="grid grid-cols-2 gap-3">
          <DatePickerField date={from} onChange={setFrom} />
          <input className={`${fieldClass} rounded-[20px]`} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <SubmitButton busy={busy} done={done} label="Save New Salary" doneLabel="Salary Saved" />
        <ErrorNote message={error} />
      </form>

      <div className="mt-8">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Salary History</h4>
        <ul className="space-y-3">
          {salaries.length === 0 && <li className="text-sm font-medium text-text-muted text-center py-4 bg-surface rounded-[24px]">No salary history recorded.</li>}
          {salaries.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 rounded-[24px] border border-border bg-card px-5 py-4">
              <div className="min-w-0">
                <p className="text-base font-bold">{money(s.amount)}</p>
                <p className="truncate text-xs font-medium text-text-muted mt-1">
                  from {s.effectiveFrom.slice(0, 10)}
                  {s.note ? ` · ${s.note}` : ''}
                </p>
              </div>
              <button
                onClick={() => remove(s.id)}
                aria-label="Delete salary entry"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-danger hover:bg-danger-soft active:scale-95 transition"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}