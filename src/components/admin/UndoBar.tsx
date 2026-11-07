import React, { useState } from 'react';
import { apiRequest } from '../../lib/api';

export type ReversibleAction = {
  id: string;
  label: string;
  canUndo: boolean;
  canRedo: boolean;
  undoneAt: string | null;
};

export const UndoBar: React.FC<{
  message: string;
  action: ReversibleAction | null;
  onReversed: (message: string, action: ReversibleAction | null) => void;
}> = ({ message, action, onReversed }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverse = async (mode: 'undo' | 'redo') => {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/admin/actions.php', {
        method: 'POST',
        body: JSON.stringify({ actionId: action.id, mode }),
      });
      const latest = await apiRequest<{ actions: ReversibleAction[] }>('/admin/actions.php?limit=1');
      onReversed(
        mode === 'undo' ? 'Change undone.' : 'Change reapplied.',
        latest.actions[0] ?? null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That change cannot be reversed safely.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-900">
      <div className="min-w-0">
        <p>{message}</p>
        {action && action.label !== message ? <p className="mt-0.5 truncate text-[11.5px] text-emerald-800/80">{action.label}</p> : null}
        {error ? <p className="mt-0.5 text-[11.5px] text-red-700">{error}</p> : null}
      </div>
      {action?.canUndo ? (
        <button type="button" className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-[12px] font-semibold" disabled={busy} onClick={() => void reverse('undo')}>
          {busy ? 'Undoing…' : 'Undo'}
        </button>
      ) : null}
      {action?.canRedo ? (
        <button type="button" className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-[12px] font-semibold" disabled={busy} onClick={() => void reverse('redo')}>
          {busy ? 'Redoing…' : 'Redo'}
        </button>
      ) : null}
    </div>
  );
};

export default UndoBar;
