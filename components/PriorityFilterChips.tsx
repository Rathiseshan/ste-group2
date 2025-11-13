'use client';

import React, { useEffect, useState } from 'react';

type Priority = 'high' | 'medium' | 'low';
type PriorityFilter = Priority | 'all';

interface PriorityFilterChipsProps {
  value: PriorityFilter;
  onChange: (filter: PriorityFilter) => void;
}

const STORAGE_KEY = 'todo.priorityFilter';

/**
 * PriorityFilterChips Component
 * Filter chips with localStorage persistence for priority filtering
 */
export function PriorityFilterChips({ value, onChange }: PriorityFilterChipsProps) {
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ['all', 'high', 'medium', 'low'].includes(stored)) {
      onChange(stored as PriorityFilter);
    }
  }, [onChange]);

  // Save to localStorage on change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, value);
    }
  }, [value, mounted]);

  const filters: { value: PriorityFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Priority filter">
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={`
            px-3 py-1.5 rounded-full text-sm font-medium transition-all
            focus:outline-none focus:ring-2 focus:ring-offset-2
            ${
              value === filter.value
                ? filter.value === 'high'
                  ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 dark:bg-red-600'
                  : filter.value === 'medium'
                  ? 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 dark:bg-amber-600'
                  : filter.value === 'low'
                  ? 'bg-teal-500 text-white hover:bg-teal-600 focus:ring-teal-500 dark:bg-teal-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500 dark:bg-blue-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }
          `}
          aria-pressed={value === filter.value}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
