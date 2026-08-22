import React from 'react';
import type { LeadStatus } from '@/lib/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'purple' | 'slate' | 'danger' | 'info' | 'teal';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200/80',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200/80',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/80',
    slate: 'bg-slate-900 text-white',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    info: 'bg-sky-50 text-sky-700 border border-sky-200/80',
    teal: 'bg-teal-50 text-teal-700 border border-teal-200/80',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md shrink-0 select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: LeadStatus | string }) {
  switch (status) {
    case 'New':
      return <Badge variant="default">{status}</Badge>;
    case 'Interested':
      return <Badge variant="success">{status}</Badge>;
    case 'PO':
      return <Badge variant="teal">{status}</Badge>;
    case 'Scheduled':
      return <Badge variant="primary">{status}</Badge>;
    case 'In discussion':
      return <Badge variant="info">{status}</Badge>;
    case 'Follow Up':
      return <Badge variant="purple">{status}</Badge>;
    case 'Unreachable':
      return <Badge variant="warning">{status}</Badge>;
    case 'DNP':
      return <Badge variant="default">{status}</Badge>;
    case 'Disconnected':
    case 'Not Interested':
      return <Badge variant="danger">{status}</Badge>;
    default:
      return <Badge variant="default">{status || 'New'}</Badge>;
  }
}
