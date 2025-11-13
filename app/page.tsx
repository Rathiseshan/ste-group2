'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PrioritySelector } from '@/components/PrioritySelector';
import { PriorityBadge } from '@/components/PriorityBadge';
import { PriorityFilterChips } from '@/components/PriorityFilterChips';

type Priority = 'high' | 'medium' | 'low';
type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface TodoItem {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  priority: Priority;
  due_at: string | null;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export default function HomePage() {
  const router = useRouter();
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>('medium');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoRecurring, setNewTodoRecurring] = useState(false);
  const [newTodoRecurrencePattern, setNewTodoRecurrencePattern] = useState<RecurrencePattern>('daily');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter state
  const [selectedPriority, setSelectedPriority] = useState<'all' | Priority>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit state
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');

  // Fetch todos on mount
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/todos');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch todos');
      }
      const data = await response.json();
      setTodos(data.todos || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch todos');
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      setError('Failed to logout');
    }
  };

  // Create todo
  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTodoTitle.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodoTitle,
          priority: newTodoPriority,
          due_at: newTodoDueDate || null,
          is_recurring: newTodoRecurring,
          recurrence_pattern: newTodoRecurring ? newTodoRecurrencePattern : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create todo');
      }

      const data = await response.json();
      setTodos((prev) => [data.todo, ...prev]);
      
      // Reset form
      setNewTodoTitle('');
      setNewTodoPriority('medium');
      setNewTodoDueDate('');
      setNewTodoRecurring(false);
      setNewTodoRecurrencePattern('daily');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle completion
  const handleToggleComplete = async (todo: TodoItem) => {
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
    );

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update todo');
      }

      // Refresh to get any new recurring instances
      await fetchTodos();
    } catch (err) {
      // Revert optimistic update
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: todo.completed } : t))
      );
      setError(err instanceof Error ? err.message : 'Failed to update todo');
    }
  };

  // Start editing
  const handleStartEdit = (todo: TodoItem) => {
    setEditingTodoId(todo.id);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
  };

  // Save edit
  const handleSaveEdit = async (todoId: number) => {
    if (!editTitle.trim()) {
      setError('Title is required');
      return;
    }

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          priority: editPriority,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update todo');
      }

      const data = await response.json();
      setTodos((prev) => prev.map((t) => (t.id === todoId ? data.todo : t)));
      setEditingTodoId(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo');
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingTodoId(null);
    setEditTitle('');
    setEditPriority('medium');
  };

  // Delete todo
  const handleDelete = async (todoId: number) => {
    if (!confirm('Are you sure you want to delete this todo?')) {
      return;
    }

    // Optimistic update
    setTodos((prev) => prev.filter((t) => t.id !== todoId));

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete todo');
      }
    } catch (err) {
      // Revert optimistic update
      await fetchTodos();
      setError(err instanceof Error ? err.message : 'Failed to delete todo');
    }
  };

  // Priority weight for sorting
  const getPriorityWeight = (priority: Priority): number => {
    const weights = { high: 0, medium: 1, low: 2 };
    return weights[priority];
  };

  // Filter and sort todos
  const filteredAndSortedTodos = useMemo(() => {
    let filtered = todos;

    // Apply priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter((todo) => todo.priority === selectedPriority);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((todo) =>
        todo.title.toLowerCase().includes(query)
      );
    }

    // Sort by: priority (high→medium→low), then due date, then created date
    const sorted = [...filtered].sort((a, b) => {
      // First by priority
      const priorityDiff = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by due date (earlier first, nulls last)
      if (a.due_at && b.due_at) {
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      }
      if (a.due_at) return -1;
      if (b.due_at) return 1;

      // Finally by created date (newer first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return sorted;
  }, [todos, selectedPriority, searchQuery]);

  // Categorize todos
  const overdueTodos = filteredAndSortedTodos.filter((todo) => {
    if (todo.completed || !todo.due_at) return false;
    return new Date(todo.due_at) < new Date();
  });

  const activeTodos = filteredAndSortedTodos.filter((todo) => {
    if (todo.completed) return false;
    if (!todo.due_at) return true;
    return new Date(todo.due_at) >= new Date();
  });

  const completedTodos = filteredAndSortedTodos.filter((todo) => todo.completed);

  // Render todo item
  const renderTodoItem = (todo: TodoItem) => {
    const isEditing = editingTodoId === todo.id;

    return (
      <div
        key={todo.id}
        className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => handleToggleComplete(todo)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
          />

          <div className="flex-1 min-w-0">
            {isEditing ? (
              // Edit mode
              <div className="space-y-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <PrioritySelector value={editPriority} onChange={setEditPriority} />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(todo.id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Display mode
              <>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3
                    className={`text-lg font-medium ${
                      todo.completed
                        ? 'line-through text-gray-500 dark:text-gray-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {todo.title}
                  </h3>
                  <PriorityBadge priority={todo.priority} />
                  {todo.is_recurring && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                      🔄 {todo.recurrence_pattern}
                    </span>
                  )}
                </div>

                {todo.due_at && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Due: {new Date(todo.due_at).toLocaleString()}
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleStartEdit(todo)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(todo.id)}
                    className="text-sm text-red-600 dark:text-red-400 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            My Todos
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create todo form */}
        <form onSubmit={handleCreateTodo} className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Create New Todo
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="Enter todo title..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <PrioritySelector value={newTodoPriority} onChange={setNewTodoPriority} />
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date (optional)
              </label>
              <input
                id="dueDate"
                type="datetime-local"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="recurring"
                type="checkbox"
                checked={newTodoRecurring}
                onChange={(e) => setNewTodoRecurring(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recurring
              </label>
            </div>

            {newTodoRecurring && (
              <div>
                <label htmlFor="recurrencePattern" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recurrence Pattern
                </label>
                <select
                  id="recurrencePattern"
                  value={newTodoRecurrencePattern}
                  onChange={(e) => setNewTodoRecurrencePattern(e.target.value as RecurrencePattern)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create Todo'}
            </button>
          </div>
        </form>

        {/* Search and filters */}
        <div className="mb-6 space-y-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              id="search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search todos..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Priority
            </label>
            <PriorityFilterChips
              value={selectedPriority}
              onChange={setSelectedPriority}
            />
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Loading todos...</p>
          </div>
        )}

        {/* Todos list */}
        {!loading && (
          <div className="space-y-8">
            {/* Overdue todos */}
            {overdueTodos.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
                  Overdue ({overdueTodos.length})
                </h2>
                <div className="space-y-3">{overdueTodos.map(renderTodoItem)}</div>
              </section>
            )}

            {/* Active todos */}
            {activeTodos.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Active ({activeTodos.length})
                </h2>
                <div className="space-y-3">{activeTodos.map(renderTodoItem)}</div>
              </section>
            )}

            {/* Completed todos */}
            {completedTodos.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">
                  Completed ({completedTodos.length})
                </h2>
                <div className="space-y-3">{completedTodos.map(renderTodoItem)}</div>
              </section>
            )}

            {/* Empty state */}
            {filteredAndSortedTodos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  {selectedPriority !== 'all'
                    ? `No ${selectedPriority} priority todos${searchQuery ? ' matching your search' : ''}`
                    : searchQuery
                    ? 'No todos matching your search'
                    : 'No todos yet. Create one above!'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
