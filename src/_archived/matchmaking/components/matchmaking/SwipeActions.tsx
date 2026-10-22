import React from 'react';
import { X, Bookmark, Heart } from 'lucide-react';

interface SwipeActionsProps {
  onPass: () => void;
  onSave: () => void;
  onInterested: () => void;
  disabled?: boolean;
}

export const SwipeActions: React.FC<SwipeActionsProps> = ({
  onPass,
  onSave,
  onInterested,
  disabled,
}) => {
  return (
    <div className="flex items-center justify-center gap-5 sm:gap-6">
      <ActionButton
        label="Pass"
        onClick={onPass}
        disabled={disabled}
        className="border-white/15 bg-white/[0.04] text-zinc-300 hover:border-zinc-400/40 hover:text-white"
      >
        <X className="h-6 w-6" strokeWidth={2} />
      </ActionButton>

      <ActionButton
        label="Save"
        onClick={onSave}
        disabled={disabled}
        size="md"
        className="border-white/20 bg-white/[0.06] text-zinc-100 hover:border-white/40 hover:text-white"
      >
        <Bookmark className="h-5 w-5" strokeWidth={2} />
      </ActionButton>

      <ActionButton
        label="Interested"
        onClick={onInterested}
        disabled={disabled}
        className="border-purple-400/50 bg-purple-600/90 text-white shadow-[0_12px_40px_-12px_rgba(147,51,234,0.75)] hover:bg-purple-500"
      >
        <Heart className="h-6 w-6" strokeWidth={2} />
      </ActionButton>
    </div>
  );
};

function ActionButton({
  children,
  label,
  onClick,
  disabled,
  className,
  size = 'lg',
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className: string;
  size?: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-16 w-16 sm:h-[4.25rem] sm:w-[4.25rem]' : 'h-14 w-14';
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`${dim} inline-flex items-center justify-center rounded-full border transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer motion-reduce:transform-none ${className}`}
    >
      {children}
    </button>
  );
}
