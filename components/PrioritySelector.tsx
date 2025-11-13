'use client';

import React from 'react';

type Priority = 'high' | 'medium' | 'low';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  disabled?: boolean;
}

/**
 * PrioritySelector Component
 * Segmented control for selecting todo priority (High, Medium, Low)
 */
export function PrioritySelector({ value, onChange, disabled = false }: PrioritySelectorProps) {
  const priorities: { value: Priority; label: string }[] = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  return (
    <div className="flex gap-2" role="group" aria-label="Priority selector">
      {priorities.map((priority) => (
        <button
          key={priority.value}
          type="button"
          onClick={() => onChange(priority.value)}
          disabled={disabled}
          className={`
            flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              value === priority.value
                ? priority.value === 'high'
                  ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700'
                  : priority.value === 'medium'
                  ? 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 dark:bg-amber-600 dark:hover:bg-amber-700'
                  : 'bg-teal-500 text-white hover:bg-teal-600 focus:ring-teal-500 dark:bg-teal-600 dark:hover:bg-teal-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }
          `}
          aria-pressed={value === priority.value}
        >
          {priority.label}
        </button>
      ))}
    </div>
  );
}
