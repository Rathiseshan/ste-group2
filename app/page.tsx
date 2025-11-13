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

  // Edit/delete state
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Filter state
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

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

  const handleEditClick = (todo: TodoWithRelations) => {
    setEditingTodoId(todo.id);
    setFormTitle(todo.title);
    setFormDescription(todo.description || '');
    setFormPriority(todo.priority);
    setFormDueAt(todo.due_at || '');
    setFormReminderMinutes(todo.reminder_minutes ?? null);
    setFormIsRecurring(!!todo.recurrence_pattern);
    setFormRecurrencePattern(todo.recurrence_pattern || 'daily');
    
    if (todo.recurrence_options) {
      const options = JSON.parse(todo.recurrence_options);
      setFormRecurrenceInterval(options.interval || 1);
      setFormRecurrenceWeekdays(options.weekdays || [1]);
      setFormRecurrenceDay(options.day || 1);
      setFormRecurrenceMonth(options.month || 0);
    }
    
    setFormSelectedTags(todo.tags.map(tag => tag.id));
    setShowForm(true);
  };

  const handleUpdateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTodoId) return;

    if (!formTitle.trim()) {
      alert('Title is required');
      return;
    }

    if (formIsRecurring && !formDueAt) {
      alert('Recurring todos must have a due date');
      return;
    }

    // Build recurrence options
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
      const response = await fetch(`/api/todos/${editingTodoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription || undefined,
          priority: formPriority,
          dueAt: formDueAt || undefined,
          reminderMinutes: formReminderMinutes || undefined,
          recurrencePattern: formIsRecurring ? formRecurrencePattern : undefined,
          recurrenceOptions: formIsRecurring ? recurrenceOptions : undefined,
          tagIds: formSelectedTags.length > 0 ? formSelectedTags : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTodos(todos.map(t => t.id === editingTodoId ? data.todo : t));
        resetForm();
        setEditingTodoId(null);
        setShowForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update todo');
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
      alert('Failed to update todo');
    }
  };

  const handleCancelEdit = () => {
    setEditingTodoId(null);
    resetForm();
    setShowForm(false);
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

  // Filter and sort todos
  const now = new Date();
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  
  let filteredTodos = todos;
  if (priorityFilter !== 'all') {
    filteredTodos = filteredTodos.filter(t => t.priority === priorityFilter);
  }

  const activeTodos = filteredTodos
    .filter(t => t.status === 'active' && (!t.due_at || new Date(t.due_at) >= now))
    .sort((a, b) => {
      // Sort by priority first
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date
      if (a.due_at && b.due_at) {
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      }
      if (a.due_at) return -1;
      if (b.due_at) return 1;
      return 0;
    });

  const overdueTodos = filteredTodos
    .filter(t => t.status === 'active' && t.due_at && new Date(t.due_at) < now)
    .sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime();
    });

  const completedTodos = filteredTodos
    .filter(t => t.status === 'completed')
    .sort((a, b) => {
      if (a.completed_at && b.completed_at) {
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
      }
      return 0;
    });

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

        {/* Priority Filter */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Priority:</label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
            className="border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority Only</option>
            <option value="medium">Medium Priority Only</option>
            <option value="low">Low Priority Only</option>
          </select>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {editingTodoId ? 'Edit Todo' : 'Create New Todo'}
            </h2>
            <form onSubmit={editingTodoId ? handleUpdateTodo : handleCreateTodo} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  required
                  placeholder="Enter todo title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                  rows={3}
                  placeholder="Add a description (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as Priority)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={formDueAt}
                    onChange={(e) => setFormDueAt(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsRecurring}
                    onChange={(e) => setFormIsRecurring(e.target.checked)}
                    className="rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">Recurring</span>
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
                  {editingTodoId ? 'Update Todo' : 'Create Todo'}
                </button>
                <button
                  type="button"
                  onClick={editingTodoId ? handleCancelEdit : () => setShowForm(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-6">
          {/* Overdue Section */}
          {overdueTodos.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-red-600">Overdue Todos</h2>
              <div className="space-y-3">
                {overdueTodos.map(todo => (
                  <div key={todo.id} className="bg-red-50 p-5 rounded-lg shadow-sm border-2 border-red-200 hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleToggleComplete(todo.id)}
                          className="mt-1.5 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          aria-label={`Mark ${todo.title} as complete`}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{todo.title}</h3>
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
                              <span className="text-xs text-red-700 font-bold bg-red-100 px-2 py-1 rounded">
                                ⚠ Overdue: {new Date(todo.due_at).toLocaleString()}
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
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditClick(todo)}
                          className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors duration-150"
                          aria-label={`Edit ${todo.title}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(todo.id)}
                          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors duration-150"
                          aria-label={`Delete ${todo.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-semibold mb-4">Active Todos</h2>
            {activeTodos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active todos. Create one to get started!</p>
            ) : (
              <div className="space-y-3">
                {activeTodos.map(todo => (
                  <div key={todo.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleToggleComplete(todo.id)}
                          className="mt-1.5 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          aria-label={`Mark ${todo.title} as complete`}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{todo.title}</h3>
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
                              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                📅 Due: {new Date(todo.due_at).toLocaleString()}
                              </span>
                            )}

                            {todo.tags.map(tag => (
                              <span
                                key={tag.id}
                                className="text-xs px-2 py-1 rounded font-medium"
                                style={{ backgroundColor: tag.color + '20', color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditClick(todo)}
                          className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-150"
                          aria-label={`Edit ${todo.title}`}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(todo.id)}
                          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors duration-150"
                          aria-label={`Delete ${todo.title}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-700">Completed Todos</h2>
            {completedTodos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No completed todos yet.</p>
            ) : (
              <div className="space-y-3">
                {completedTodos.map(todo => (
                  <div key={todo.id} className="bg-gray-50 p-5 rounded-lg shadow-sm border border-gray-200 opacity-75 hover:opacity-90 transition-opacity duration-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={true}
                          disabled
                          className="mt-1.5 rounded cursor-not-allowed"
                          aria-label={`${todo.title} is completed`}
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
                        onClick={() => setDeleteConfirmId(todo.id)}
                        className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors duration-150 ml-4"
                        aria-label={`Delete ${todo.title}`}
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

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
              <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this todo? This will also delete all associated subtasks and tag relationships.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteTodo(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
