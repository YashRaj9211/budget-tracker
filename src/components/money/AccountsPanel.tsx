import { useCallback, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Landmark, Plus, Trash2, Wallet, History } from 'lucide-react';
import { Card } from '../ui/Card';
import {
  savingsApi,
  type SavingsAccount,
  type SavingsAccountKind,
  type SavingsDirection,
  type SavingsTransaction,
} from '../../api/financeHubApi';
import DatePickerField from './DatePickerField';
import {
  AmountInput,
  Chip,
  ErrorNote,
  SectionHead,
  Segmented,
  SubmitButton,
  fieldClass,
  errMsg,
  money,
  num,
  todayStr,
} from './ui';


const KINDS: { value: SavingsAccountKind; label: string }[] = [
  { value: 'BANK', label: 'Bank' },
  { value: 'FD', label: 'Fixed deposit' },
  { value: 'RD', label: 'Recurring' },
  { value: 'MUTUAL_FUND', label: 'Mutual fund' },
  { value: 'CASH', label: 'Cash' },
  { value: 'OTHER', label: 'Other' },
];

const QUICK_AMOUNTS = ['500', '1000', '5000', '10000'];

// Inspired by the pastel theme in the reference image
const ACCOUNT_THEMES = [
  { bg: 'bg-[#d0c4fa]', text: 'text-[#3b2a82]', border: '' }, // Purple
  { bg: 'bg-[#ffffff]', text: 'text-[#1a1a1a]', border: 'border-[#eaeaea]' }, // White
  { bg: 'bg-[#fcf0b3]', text: 'text-[#6b5c0c]', border: '' }, // Yellow
  { bg: 'bg-[#d3f4d6]', text: 'text-[#1e5c26]', border: '' }, // Green
];

export default function AccountsPanel({
  accounts,
  onChanged,
}: {
  accounts: SavingsAccount[];
  onChanged: () => Promise<void>;
}) {
  const total = accounts.reduce((sum, account) => sum + num(account.balance ?? account.openingBalance), 0);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6">
      <div className="px-1">
        <SectionHead
          title="Savings Accounts"
          hint={`${money(total)} across ${accounts.length} account${accounts.length === 1 ? '' : 's'}`}
        />
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-[32px] border border-dashed border-border bg-surface/70 px-5 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-[#d3f4d6] text-[#1e5c26]">
            <Landmark size={26} />
          </div>
          <p className="mt-4 text-base font-bold text-text">No accounts yet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-text-muted">
            Add a bank account, fixed deposit, or cash balance to start tracking your savings.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Swipeable Horizontal Cards */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 px-1 scrollbar-width-none [&::-webkit-scrollbar]:hidden">
            {accounts.map((account, index) => {
              const theme = ACCOUNT_THEMES[index % ACCOUNT_THEMES.length];
              const balance = num(account.balance ?? account.openingBalance);
              const kindLabel = KINDS.find((k) => k.value === account.kind)?.label ?? account.kind;
              const isSelected = selectedAccountId === account.id;

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setSelectedAccountId(isSelected ? null : account.id)}
                  className={`snap-center shrink-0 w-[85%] min-w-[280px] max-w-[340px] relative overflow-hidden rounded-[32px] p-6 text-left transition-all duration-300 border shadow-sm ${theme.bg} ${theme.text} ${theme.border} ${isSelected ? 'ring-2 ring-ink ring-offset-2 scale-[0.98]' : 'hover:scale-[1.02]'}`}
                >
                  {/* Decorative concentric circles inspired by reference image */}
                  <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-[1.5px] border-black/5 pointer-events-none" />
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-36 h-36 rounded-full border-[1.5px] border-black/5 pointer-events-none" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-[1.5px] border-black/5 pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-between h-full">
                    <div className="flex-1 pr-4">
                      <p className="text-[13px] font-semibold opacity-70 mb-1">{kindLabel}</p>
                      <h3 className="text-xl font-bold leading-tight mb-4 pr-2">{account.name}</h3>
                      <p className="text-2xl font-black tracking-tight">{money(balance)}</p>
                    </div>
                    
                    {/* Right side circular avatar/icon */}
                    <div className="w-16 h-16 shrink-0 rounded-full bg-white/40 backdrop-blur-sm border border-white/60 shadow-sm flex items-center justify-center relative z-20">
                       <Landmark size={24} className="opacity-80" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Account Detail View */}
      {selectedAccount && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <AccountDetailView 
            account={selectedAccount} 
            onChanged={async () => {
              await onChanged();
            }}
            onDelete={async () => {
              setSelectedAccountId(null);
              await onChanged();
            }}
          />
        </div>
      )}

      {/* Add account form */}
      <details className="group overflow-hidden rounded-4xl bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 marker:hidden">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white">
              <Plus size={22} />
            </div>
            <div>
              <p className="text-base font-bold text-text">Add Account</p>
              <p className="mt-0.5 text-xs font-medium text-text-muted">Create a new savings bucket</p>
            </div>
          </div>
          <ChevronDown size={20} className="text-text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-gray-400 px-5 pb-6 pt-5">
          <AddAccountForm onCreated={onChanged} />
        </div>
      </details>
    </div>
  );
}

// Extracted detail view for the selected account card
function AccountDetailView({
  account,
  onChanged,
  onDelete
}: {
  account: SavingsAccount;
  onChanged: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [txns, setTxns] = useState<SavingsTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadTxns = useCallback(async () => {
    try {
      setTxns(await savingsApi.listTransactions(account.id));
      setError(null);
    } catch (err) {
      setError(errMsg(err));
    }
  }, [account.id]);

  // Load transactions automatically when rendered
  useState(() => {
    loadTxns();
  });

  const removeTxn = async (id: string) => {
    setError(null);
    try {
      await savingsApi.deleteTransaction(account.id, id);
      await loadTxns();
      await onChanged();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${account.name}" and all its entries?`)) return;
    setError(null);
    try {
      await savingsApi.deleteAccount(account.id);
      await onDelete();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <Card variant="white" className="!rounded-[32px] !p-5">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-sm font-bold text-text flex items-center gap-2">
          <History size={16} className="text-text-muted" />
          {account.name} Activity
        </h4>
        <button type="button" onClick={remove} className="text-xs font-bold text-danger hover:underline">
          Delete Account
        </button>
      </div>
      
      <div className="space-y-5">
        <TransactionForm
          accountId={account.id}
          onSaved={async () => {
            await loadTxns();
            await onChanged();
          }}
        />
        <ErrorNote message={error} />
        
        <div>
          {txns.length === 0 ? (
            <p className="rounded-[24px] bg-surface px-4 py-8 text-center text-sm font-medium text-text-muted">No transactions yet.</p>
          ) : (
            <ul className="space-y-3">
              {txns.map((txn) => {
                const deposit = txn.direction === 'DEPOSIT';
                return (
                  <li key={txn.id} className="flex items-center justify-between gap-4 rounded-[24px] border border-border bg-card p-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${deposit ? 'bg-[#d3f4d6] text-[#1e5c26]' : 'bg-[#d0c4fa] text-[#3b2a82]'}`}>
                      {deposit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-base font-bold ${deposit ? 'text-[#1e5c26]' : 'text-text'}`}>
                        {deposit ? '+' : '−'}{money(txn.amount)}
                      </p>
                      <p className="truncate text-xs font-medium text-text-muted mt-0.5">
                        {txn.txnDate.slice(0, 10)}{txn.note ? ` · ${txn.note}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeTxn(txn.id)}
                      aria-label="Delete entry"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-text-muted transition hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

// ... TransactionForm and AddAccountForm remain mostly the same logically, 
// but ensure inputs use highly rounded corners e.g., rounded-[20px] or rounded-full to match the style.
// (Implementation of TransactionForm & AddAccountForm kept identical to original, just applying rounded corners in UI components)
function TransactionForm({ accountId, onSaved }: { accountId: string; onSaved: () => Promise<void> }) {
  const [direction, setDirection] = useState<SavingsDirection>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [txnDate, setTxnDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await savingsApi.addTransaction(accountId, {
        amount: amount.trim(),
        direction,
        txnDate,
        note: note.trim() || undefined,
      });
      setAmount('');
      setNote('');
      setDone(true);
      setTimeout(() => setDone(false), 1400);
      await onSaved();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-[24px] border border-border bg-surface/50 p-4 sm:p-5">
      <Segmented<SavingsDirection>
        label="Entry type"
        value={direction}
        onChange={setDirection}
        options={[
          { value: 'DEPOSIT', label: '+ Deposit', tone: 'mint' },
          { value: 'WITHDRAWAL', label: '− Withdraw', tone: 'lavender' },
        ]}
      />
      <AmountInput value={amount} onChange={setAmount} label="Entry amount" />
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((quickAmount) => (
          <Chip key={quickAmount} active={amount === quickAmount} onClick={() => setAmount(quickAmount)}>
            ₹{Number(quickAmount).toLocaleString('en-IN')}
          </Chip>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <DatePickerField date={txnDate} onChange={setTxnDate} />
        <input 
          className={`${fieldClass} !rounded-[20px]`} 
          placeholder="Note (optional)" 
          value={note} 
          onChange={(e) => setNote(e.target.value)} 
        />
      </div>
      <SubmitButton
        busy={busy}
        done={done}
        label={direction === 'DEPOSIT' ? 'Add Deposit' : 'Record Withdrawal'}
        doneLabel="Entry Saved"
      />
      <ErrorNote message={error} />
    </form>
  );
}

function AddAccountForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<SavingsAccountKind>('BANK');
  const [opening, setOpening] = useState('');
  const [openingDate, setOpeningDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await savingsApi.createAccount({
        name: name.trim(),
        kind,
        openingBalance: opening.trim() || 0,
        openingDate,
      });
      setName('');
      setOpening('');
      setDone(true);
      setTimeout(() => setDone(false), 1400);
      await onCreated();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs font-bold text-text-muted">
          Account Name
          <input
            className={`${fieldClass} rounded-tile! mt-1.5`}
            placeholder="e.g. HDFC Savings"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <div>
          <AmountInput value={opening} onChange={setOpening} label="Opening Balance" />
        </div>
      </div>
      
      <div>
        <p className="mb-2.5 text-xs font-bold text-text-muted">Account Type</p>
        <div className="flex flex-wrap gap-2">
          {KINDS.map((kindOption) => (
            <Chip key={kindOption.value} active={kind === kindOption.value} onClick={() => setKind(kindOption.value)}>
              {kindOption.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="max-w-sm">
        <DatePickerField date={openingDate} onChange={setOpeningDate} placeholder="Opened on" />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus size={18} />
        {busy ? 'Creating account…' : done ? 'Account Created' : 'Create Account'}
      </button>
      <ErrorNote message={error} />
    </form>
  );
}