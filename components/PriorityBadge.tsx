'use client';

import React from 'react';

type Priority = 'high' | 'medium' | 'low';

interface PriorityBadgeProps {
  priority: Priority;
  showLabel?: boolean;
}

/**
 * PriorityBadge Component
 * Displays a colored badge pill for todo priority
 */
export function PriorityBadge({ priority, showLabel = true }: PriorityBadgeProps) {
  const config = {
    high: {
      label: 'High',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      tooltip: 'High priority',
    },
    medium: {
      label: 'Medium',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      tooltip: 'Medium priority',
    },
    low: {
      label: 'Low',
      className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
      tooltip: 'Low priority',
    },
  };

  const { label, className, tooltip } = config[priority];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      title={tooltip}
      aria-label={tooltip}
    >
      {showLabel ? label : null}
    </span>
  );
}
