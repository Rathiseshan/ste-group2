'use client';

import { useState, useEffect } from 'react';
import { Priority, RecurrencePattern, Todo, Tag } from '@/lib/db';

interface TodoWithRelations extends Todo {
  tags: Tag[];
  subtasks: any[];
}

interface RecurrenceOptions {
  interval?: number;
  weekdays?: number[];
  day?: number;
  month?: number;
  preserveLeap?: boolean;
}

export default function Home() {
  const [todos, setTodos] = useState<TodoWithRelations[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('medium');
  const [formDueAt, setFormDueAt] = useState('');
  const [formReminderMinutes, setFormReminderMinutes] = useState<number | null>(null);
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formRecurrencePattern, setFormRecurrencePattern] = useState<RecurrencePattern>('daily');
  const [formRecurrenceInterval, setFormRecurrenceInterval] = useState(1);
  const [formRecurrenceWeekdays, setFormRecurrenceWeekdays] = useState<number[]>([1]); // Monday by default
  const [formRecurrenceDay, setFormRecurrenceDay] = useState(1);
  const [formRecurrenceMonth, setFormRecurrenceMonth] = useState(0);
  const [formSelectedTags, setFormSelectedTags] = useState<number[]>([]);

  useEffect(() => {
    fetchTodos();
    fetchTags();
  }, []);

  const fetchTodos = async () => {
    try {
      const response = await fetch('/api/todos');
      const data = await response.json();
      setTodos(data.todos);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      const data = await response.json();
      setTags(data.tags);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      alert('Title is required');
      return;
    }

    if (formIsRecurring && !formDueAt) {
      alert('Recurring todos must have a due date');
      return;
    }

    // Build recurrence options based on pattern
    let recurrenceOptions: RecurrenceOptions | null = null;
    if (formIsRecurring) {
      switch (formRecurrencePattern) {
        case 'daily':
          recurrenceOptions = { interval: formRecurrenceInterval };
          break;
        case 'weekly':
          recurrenceOptions = {
            interval: formRecurrenceInterval,
            weekdays: formRecurrenceWeekdays,
          };
          break;
        case 'monthly':
          recurrenceOptions = {
            interval: formRecurrenceInterval,
            day: formRecurrenceDay,
          };
          break;
        case 'yearly':
          recurrenceOptions = {
            interval: formRecurrenceInterval,
            month: formRecurrenceMonth,
            day: formRecurrenceDay,
          };
          break;
      }
    }

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          priority: formPriority,
          dueAt: formDueAt || null,
          reminderMinutes: formReminderMinutes,
          recurrencePattern: formIsRecurring ? formRecurrencePattern : null,
          recurrenceOptions: formIsRecurring ? recurrenceOptions : null,
          tagIds: formSelectedTags,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTodos([...todos, data.todo]);
        resetForm();
        setShowForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create todo');
      }
    } catch (error) {
      console.error('Failed to create todo:', error);
      alert('Failed to create todo');
    }
  };

  const handleToggleComplete = async (todoId: number) => {
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return;

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update the completed todo
        setTodos(prevTodos => 
          prevTodos.map(t => t.id === todoId ? data.todo : t)
        );

        // If a new recurring instance was created, add it to the list
        if (data.nextTodo) {
          setTodos(prevTodos => [...prevTodos, data.nextTodo]);
        }
      }
    } catch (error) {
      console.error('Failed to toggle completion:', error);
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    if (!confirm('Are you sure you want to delete this todo?')) return;

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTodos(todos.filter(t => t.id !== todoId));
      }
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormPriority('medium');
    setFormDueAt('');
    setFormReminderMinutes(null);
    setFormIsRecurring(false);
    setFormRecurrencePattern('daily');
    setFormRecurrenceInterval(1);
    setFormRecurrenceWeekdays([1]);
    setFormRecurrenceDay(1);
    setFormRecurrenceMonth(0);
    setFormSelectedTags([]);
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getRecurrenceSummary = (todo: TodoWithRelations) => {
    if (!todo.recurrence_pattern) return null;

    const options = todo.recurrence_options ? JSON.parse(todo.recurrence_options) : {};
    const interval = options.interval || 1;

    switch (todo.recurrence_pattern) {
      case 'daily':
        return `Every ${interval === 1 ? '' : interval + ' '}day${interval > 1 ? 's' : ''}`;
      case 'weekly': {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weekdays = (options.weekdays || [1]).map((d: number) => days[d]).join(', ');
        return `Every ${interval === 1 ? '' : interval + ' '}week${interval > 1 ? 's' : ''} on ${weekdays}`;
      }
      case 'monthly':
        return `Every ${interval === 1 ? '' : interval + ' '}month${interval > 1 ? 's' : ''} on day ${options.day || 1}`;
      case 'yearly': {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `Every ${interval === 1 ? '' : interval + ' '}year${interval > 1 ? 's' : ''} on ${months[options.month || 0]} ${options.day || 1}`;
      }
    }
  };

  const activeTodos = todos.filter(t => t.status === 'active');
  const completedTodos = todos.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Todos</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'New Todo'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Todo</h2>
            <form onSubmit={handleCreateTodo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as Priority)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={formDueAt}
                    onChange={(e) => setFormDueAt(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formIsRecurring}
                    onChange={(e) => setFormIsRecurring(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Recurring</span>
                </label>
              </div>

              {formIsRecurring && (
                <div className="border-l-4 border-blue-500 pl-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Pattern</label>
                    <select
                      value={formRecurrencePattern}
                      onChange={(e) => setFormRecurrencePattern(e.target.value as RecurrencePattern)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Repeat every</label>
                    <input
                      type="number"
                      min="1"
                      value={formRecurrenceInterval}
                      onChange={(e) => setFormRecurrenceInterval(parseInt(e.target.value) || 1)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>

                  {formRecurrencePattern === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">On days</label>
                      <div className="flex gap-2 flex-wrap">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                          <label key={day} className="flex items-center space-x-1">
                            <input
                              type="checkbox"
                              checked={formRecurrenceWeekdays.includes(index)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormRecurrenceWeekdays([...formRecurrenceWeekdays, index]);
                                } else {
                                  setFormRecurrenceWeekdays(formRecurrenceWeekdays.filter(d => d !== index));
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {(formRecurrencePattern === 'monthly' || formRecurrencePattern === 'yearly') && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Day of month</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formRecurrenceDay}
                        onChange={(e) => setFormRecurrenceDay(parseInt(e.target.value) || 1)}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  )}

                  {formRecurrencePattern === 'yearly' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Month</label>
                      <select
                        value={formRecurrenceMonth}
                        onChange={(e) => setFormRecurrenceMonth(parseInt(e.target.value))}
                        className="w-full border rounded px-3 py-2"
                      >
                        {['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                          <option key={month} value={index}>{month}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create Todo
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Active Todos</h2>
            {activeTodos.length === 0 ? (
              <p className="text-gray-500">No active todos. Create one to get started!</p>
            ) : (
              <div className="space-y-3">
                {activeTodos.map(todo => (
                  <div key={todo.id} className="bg-white p-4 rounded-lg shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleToggleComplete(todo.id)}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{todo.title}</h3>
                          {todo.description && (
                            <p className="text-sm text-gray-600 mt-1">{todo.description}</p>
                          )}
                          
                          <div className="flex gap-2 mt-2 flex-wrap items-center">
                            <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(todo.priority)}`}>
                              {todo.priority.toUpperCase()}
                            </span>
                            
                            {todo.recurrence_pattern && (
                              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                                🔄 {getRecurrenceSummary(todo)}
                              </span>
                            )}
                            
                            {todo.due_at && (
                              <span className="text-xs text-gray-500">
                                Due: {new Date(todo.due_at).toLocaleString()}
                              </span>
                            )}

                            {todo.tags.map(tag => (
                              <span
                                key={tag.id}
                                className="text-xs px-2 py-1 rounded"
                                style={{ backgroundColor: tag.color + '20', color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-red-600 hover:text-red-800 ml-4"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Completed Todos</h2>
            {completedTodos.length === 0 ? (
              <p className="text-gray-500">No completed todos yet.</p>
            ) : (
              <div className="space-y-3">
                {completedTodos.map(todo => (
                  <div key={todo.id} className="bg-white p-4 rounded-lg shadow opacity-60">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={true}
                          disabled
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium line-through">{todo.title}</h3>
                          {todo.completed_at && (
                            <p className="text-xs text-gray-500 mt-1">
                              Completed: {new Date(todo.completed_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-red-600 hover:text-red-800 ml-4"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
