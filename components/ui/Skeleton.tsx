import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 ${className}`}
    />
  );
}

export function TableSkeletonRows({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="px-6 py-4">
              <Skeleton className={`h-4 ${cIdx === 0 ? 'w-36' : cIdx === 1 ? 'w-24' : 'w-28'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
