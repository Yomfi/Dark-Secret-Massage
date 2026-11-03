import React from 'react';
import { EmptyState } from './EmptyState';
import type { LucideIcon } from 'lucide-react';

export const DataTable: React.FC<{
  headers: string[];
  children: React.ReactNode;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  minWidth?: string;
}> = ({
  headers,
  children,
  empty,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  emptyIcon,
  minWidth = '720px',
}) => (
  <div className="overflow-x-auto">
    <table className="w-full" style={{ minWidth }}>
      <thead>
        <tr className="border-b border-[#efe8dc] bg-[#faf7f2]/80">
          {headers.map((h) => (
            <th
              key={h}
              className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a7a52]"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {empty ? (
          <tr>
            <td colSpan={headers.length} className="p-0">
              <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
            </td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  </div>
);

export const DataRow: React.FC<{
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
}> = ({ children, selected, onClick }) => (
  <tr
    className={`border-t border-[#efe8dc] transition-colors ${
      selected ? 'bg-[#faf7f2]' : 'hover:bg-[#faf7f2]/70'
    } ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    {children}
  </tr>
);

export const DataCell: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <td className={`px-4 py-3.5 align-top text-[13.5px] text-[#161616] ${className}`}>{children}</td>;
