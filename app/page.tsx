'use client';

import { useState, useEffect } from 'react';
import { Priority, RecurrencePattern, Todo, Tag } from '@/lib/db';
import { useNotifications } from '@/lib/hooks/useNotifications';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Subtask state
  const [expandedTodoId, setExpandedTodoId] = useState<number | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Tag management state
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3B82F6'); // Default blue
  const [tagFilter, setTagFilter] = useState<number | null>(null);

  // Template state
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [savingTodoId, setSavingTodoId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');

  // Notifications hook
  const { permission, enabled, setEnabled, requestPermission } = useNotifications();

  useEffect(() => {
    fetchTodos();
    fetchTags();
    fetchTemplates();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
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

  const handleAddSubtask = async (todoId: number) => {
    if (!newSubtaskTitle.trim()) return;

    try {
      const response = await fetch(`/api/todos/${todoId}/subtasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSubtaskTitle }),
      });

      if (response.ok) {
        const data = await response.json();
        setTodos(todos.map(t => 
          t.id === todoId ? { ...t, subtasks: [...t.subtasks, data.subtask] } : t
        ));
        setNewSubtaskTitle('');
      }
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  };

  const handleToggleSubtask = async (subtaskId: number, completed: boolean, todoId: number) => {
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        const data = await response.json();
        setTodos(todos.map(t => 
          t.id === todoId 
            ? { ...t, subtasks: t.subtasks.map(s => s.id === subtaskId ? data.subtask : s) }
            : t
        ));
      }
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: number, todoId: number) => {
    try {
      const response = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTodos(todos.map(t => 
          t.id === todoId 
            ? { ...t, subtasks: t.subtasks.filter(s => s.id !== subtaskId) }
            : t
        ));
      }
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  };

  const calculateProgress = (subtasks: any[]) => {
    if (subtasks.length === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = subtasks.filter(s => s.completed).length;
    const total = subtasks.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  };

  const handleCreateTag = async () => {
    if (!tagName.trim()) return;

    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName, color: tagColor }),
      });

      if (response.ok) {
        const data = await response.json();
        setTags([...tags, data.tag]);
        setTagName('');
        setTagColor('#3B82F6');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create tag');
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleUpdateTag = async (tagId: number) => {
    if (!tagName.trim()) return;

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName, color: tagColor }),
      });

      if (response.ok) {
        const data = await response.json();
        setTags(tags.map(t => t.id === tagId ? data.tag : t));
        setEditingTagId(null);
        setTagName('');
        setTagColor('#3B82F6');
      }
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm('Delete this tag? It will be removed from all todos.')) return;

    try {
      const response = await fetch(`/api/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTags(tags.filter(t => t.id !== tagId));
        // Refresh todos to update tag relationships
        fetchTodos();
      }
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setTagName(tag.name);
    setTagColor(tag.color);
  };

  const handleCancelTagEdit = () => {
    setEditingTagId(null);
    setTagName('');
    setTagColor('#3B82F6');
  };

  // Template handlers
  const handleSaveAsTemplate = (todoId: number) => {
    setSavingTodoId(todoId);
    setShowSaveTemplateModal(true);
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || !savingTodoId) {
      alert('Template name is required');
      return;
    }

    const todo = todos.find(t => t.id === savingTodoId);
    if (!todo) return;

    // Calculate due date offset if todo has a due date
    let dueDaysOffset = 0;
    if (todo.due_at) {
      const now = new Date();
      const dueDate = new Date(todo.due_at);
      const diffTime = dueDate.getTime() - now.getTime();
      dueDaysOffset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Prepare subtasks for serialization
    const subtasks = todo.subtasks.map((st: any, index: number) => ({
      title: st.title,
      position: index,
    }));

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          category: templateCategory.trim() || null,
          priority: todo.priority,
          reminder_minutes: todo.reminder_minutes,
          recurrence_pattern: todo.recurrence_pattern,
          recurrence_options: todo.recurrence_options,
          due_days_offset: dueDaysOffset,
          subtasks: subtasks.length > 0 ? subtasks : null,
        }),
      });

      if (response.ok) {
        fetchTemplates();
        setShowSaveTemplateModal(false);
        setTemplateName('');
        setTemplateDescription('');
        setTemplateCategory('');
        setSavingTodoId(null);
        alert('Template saved successfully!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('Failed to save template');
    }
  };

  const handleUseTemplate = async (templateId: number) => {
    const customTitle = prompt('Enter a title for the new todo:');
    if (!customTitle || !customTitle.trim()) return;

    try {
      const response = await fetch(`/api/templates/${templateId}/use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim(),
          tag_ids: [], // Could add tag selection in the future
        }),
      });

      if (response.ok) {
        fetchTodos();
        setShowTemplateModal(false);
        alert('Todo created from template!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create todo from template');
      }
    } catch (error) {
      console.error('Failed to use template:', error);
      alert('Failed to create todo from template');
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTemplates(templates.filter(t => t.id !== templateId));
      } else {
        alert('Failed to delete template');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template');
    }
  };

  // Export/Import handlers
  const handleExport = async () => {
    try {
      const response = await fetch('/api/todos/export');
      const data = await response.json();

      // Create downloadable file
      const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `todos-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Export successful!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        // Refresh data
        fetchTodos();
        fetchTags();
      } else {
        const error = await response.json();
        alert(`Import failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Invalid file format. Please select a valid export file.');
    }

    // Reset file input
    event.target.value = '';
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

  const getReminderText = (minutes: number | null | undefined) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m before`;
    if (minutes < 1440) return `${minutes / 60}h before`;
    if (minutes < 10080) return `${minutes / 1440}d before`;
    return `${minutes / 10080}w before`;
  };

  // Filter and sort todos
  const now = new Date();
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  
  let filteredTodos = todos;
  
  // Search filter (title, description, tag names)
  if (debouncedSearch) {
    const query = debouncedSearch.toLowerCase();
    filteredTodos = filteredTodos.filter(todo => {
      const titleMatch = todo.title.toLowerCase().includes(query);
      const descriptionMatch = todo.description?.toLowerCase().includes(query);
      const tagMatch = todo.tags.some(tag => tag.name.toLowerCase().includes(query));
      return titleMatch || descriptionMatch || tagMatch;
    });
  }
  
  // Priority filter
  if (priorityFilter !== 'all') {
    filteredTodos = filteredTodos.filter(t => t.priority === priorityFilter);
  }
  
  // Tag filter
  if (tagFilter !== null) {
    filteredTodos = filteredTodos.filter(t => 
      t.tags.some(tag => tag.id === tagFilter)
    );
  }

  // Status filter
  if (statusFilter !== 'all') {
    filteredTodos = filteredTodos.filter(t => t.status === statusFilter);
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
          <div className="flex gap-3">
            {/* Notifications Toggle */}
            {permission === 'default' && (
              <button
                onClick={async () => {
                  const result = await requestPermission();
                  if (result === 'granted') setEnabled(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                🔔 Enable Notifications
              </button>
            )}
            {permission === 'granted' && (
              <button
                onClick={() => setEnabled(!enabled)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  enabled 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                🔔 Notifications {enabled ? 'On' : 'Off'}
              </button>
            )}
            <button
              onClick={() => setShowTagModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              🏷️ Manage Tags
            </button>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
            >
              📋 Templates
            </button>
            <a
              href="/calendar"
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 inline-block"
            >
              📅 Calendar
            </a>
            <button
              onClick={handleExport}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              💾 Export
            </button>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 cursor-pointer inline-block"
            >
              📥 Import
            </label>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : 'New Todo'}
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          {/* Search Input */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">🔍 Search Todos:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, or tag name..."
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Priority:</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority Only</option>
                <option value="medium">Medium Priority Only</option>
                <option value="low">Low Priority Only</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'completed')}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="completed">Completed Only</option>
              </select>
            </div>
            
            {/* Clear Filters Button */}
            {(searchQuery || priorityFilter !== 'all' || tagFilter !== null || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPriorityFilter('all');
                  setTagFilter(null);
                  setStatusFilter('all');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>

          {/* Active Filters Indicator */}
          {(debouncedSearch || priorityFilter !== 'all' || tagFilter !== null || statusFilter !== 'all') && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm text-gray-700">
                <strong>Active filters:</strong>
                {debouncedSearch && <span className="ml-2">Search: &ldquo;{debouncedSearch}&rdquo;</span>}
                {priorityFilter !== 'all' && <span className="ml-2">• Priority: {priorityFilter}</span>}
                {tagFilter !== null && <span className="ml-2">• Tag: {tags.find(t => t.id === tagFilter)?.name}</span>}
                {statusFilter !== 'all' && <span className="ml-2">• Status: {statusFilter}</span>}
              </div>
            </div>
          )}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Reminder</label>
                <select
                  value={formReminderMinutes || ''}
                  onChange={(e) => setFormReminderMinutes(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={!formDueAt}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">No reminder</option>
                  <option value="15">15 minutes before</option>
                  <option value="30">30 minutes before</option>
                  <option value="60">1 hour before</option>
                  <option value="120">2 hours before</option>
                  <option value="1440">1 day before</option>
                  <option value="2880">2 days before</option>
                  <option value="10080">1 week before</option>
                </select>
                {!formDueAt && (
                  <p className="text-xs text-gray-500 mt-1">Set a due date to enable reminders</p>
                )}
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

              {/* Tag Selection */}
              {tags.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tags</label>
                  <div className="flex gap-2 flex-wrap">
                    {tags.map(tag => (
                      <label 
                        key={tag.id} 
                        className="flex items-center gap-2 px-3 py-2 rounded-md border-2 cursor-pointer transition-all"
                        style={{
                          borderColor: formSelectedTags.includes(tag.id) ? tag.color : '#e5e7eb',
                          backgroundColor: formSelectedTags.includes(tag.id) ? tag.color + '20' : '#ffffff'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formSelectedTags.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormSelectedTags([...formSelectedTags, tag.id]);
                            } else {
                              setFormSelectedTags(formSelectedTags.filter(id => id !== tag.id));
                            }
                          }}
                          className="rounded focus:ring-2 focus:ring-blue-500"
                          style={{ accentColor: tag.color }}
                        />
                        <span className="text-sm font-medium" style={{ color: tag.color }}>
                          {tag.name}
                        </span>
                      </label>
                    ))}
                  </div>
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
                            
                            {todo.reminder_minutes && (
                              <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1">
                                🔔 {getReminderText(todo.reminder_minutes)}
                              </span>
                            )}
                            
                            {todo.due_at && (
                              <span className="text-xs text-red-700 font-bold bg-red-100 px-2 py-1 rounded">
                                ⚠ Overdue: {new Date(todo.due_at).toLocaleString()}
                              </span>
                            )}

                            {todo.tags.map(tag => (
                              <button
                                key={tag.id}
                                onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                                className="text-xs px-2 py-1 rounded font-medium border-2 transition-all hover:scale-105"
                                style={{ 
                                  backgroundColor: tag.color + '20', 
                                  color: tag.color,
                                  borderColor: tagFilter === tag.id ? tag.color : 'transparent'
                                }}
                                title={`Click to filter by ${tag.name}`}
                              >
                                {tag.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleSaveAsTemplate(todo.id)}
                          className="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors duration-150"
                          aria-label={`Save ${todo.title} as template`}
                        >
                          📋 Template
                        </button>
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
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg mb-2">No active todos found</p>
                {(debouncedSearch || priorityFilter !== 'all' || tagFilter !== null || statusFilter !== 'all') ? (
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setPriorityFilter('all');
                      setTagFilter(null);
                      setStatusFilter('all');
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    Clear filters to see all todos
                  </button>
                ) : (
                  <p className="text-gray-400">Create one to get started!</p>
                )}
              </div>
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
                            
                            {todo.reminder_minutes && (
                              <span className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-800 border border-orange-300 flex items-center gap-1">
                                🔔 {getReminderText(todo.reminder_minutes)}
                              </span>
                            )}
                            
                            {todo.due_at && (
                              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                📅 Due: {new Date(todo.due_at).toLocaleString()}
                              </span>
                            )}

                            {todo.tags.map(tag => (
                              <button
                                key={tag.id}
                                onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                                className="text-xs px-2 py-1 rounded font-medium border-2 transition-all hover:scale-105"
                                style={{ 
                                  backgroundColor: tag.color + '20', 
                                  color: tag.color,
                                  borderColor: tagFilter === tag.id ? tag.color : 'transparent'
                                }}
                                title={`Click to filter by ${tag.name}`}
                              >
                                {tag.name}
                              </button>
                            ))}
                          </div>

                          {/* Subtasks Section */}
                          {todo.subtasks.length > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        calculateProgress(todo.subtasks).percentage === 100 
                                          ? 'bg-green-500' 
                                          : 'bg-blue-500'
                                      }`}
                                      style={{ width: `${calculateProgress(todo.subtasks).percentage}%` }}
                                    />
                                  </div>
                                </div>
                                <span className="text-xs text-gray-600 font-medium">
                                  {calculateProgress(todo.subtasks).completed}/{calculateProgress(todo.subtasks).total} ({calculateProgress(todo.subtasks).percentage}%)
                                </span>
                              </div>
                              <button
                                onClick={() => setExpandedTodoId(expandedTodoId === todo.id ? null : todo.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {expandedTodoId === todo.id ? '▼ Hide' : '▶'} {todo.subtasks.length} subtask{todo.subtasks.length !== 1 ? 's' : ''}
                              </button>
                            </div>
                          )}

                          {expandedTodoId === todo.id && (
                            <div className="mt-3 space-y-2 border-t pt-3">
                              {todo.subtasks.map((subtask: any) => (
                                <div key={subtask.id} className="flex items-center gap-2 group">
                                  <input
                                    type="checkbox"
                                    checked={subtask.completed}
                                    onChange={(e) => handleToggleSubtask(subtask.id, e.target.checked, todo.id)}
                                    className="rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                    {subtask.title}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteSubtask(subtask.id, todo.id)}
                                    className="text-red-600 hover:text-red-800 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              <div className="flex gap-2 mt-2">
                                <input
                                  type="text"
                                  value={expandedTodoId === todo.id ? newSubtaskTitle : ''}
                                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleAddSubtask(todo.id);
                                  }}
                                  placeholder="Add subtask..."
                                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                                <button
                                  onClick={() => handleAddSubtask(todo.id)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Add subtask button if no subtasks */}
                          {todo.subtasks.length === 0 && expandedTodoId !== todo.id && (
                            <button
                              onClick={() => setExpandedTodoId(todo.id)}
                              className="mt-2 text-xs text-gray-500 hover:text-blue-600"
                            >
                              + Add subtask
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleSaveAsTemplate(todo.id)}
                          className="px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors duration-150"
                          aria-label={`Save ${todo.title} as template`}
                        >
                          📋 Template
                        </button>
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

        {/* Tag Management Modal */}
        {showTagModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold">Manage Tags</h3>
                <button
                  onClick={() => {
                    setShowTagModal(false);
                    handleCancelTagEdit();
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close tag management"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Create/Edit Tag Form */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {editingTagId ? 'Edit Tag' : 'Create New Tag'}
                </h4>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label htmlFor="tag-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Tag Name
                    </label>
                    <input
                      id="tag-name"
                      type="text"
                      value={tagName}
                      onChange={(e) => setTagName(e.target.value)}
                      placeholder="Enter tag name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      maxLength={50}
                    />
                  </div>
                  <div>
                    <label htmlFor="tag-color" className="block text-sm font-medium text-gray-700 mb-1">
                      Color
                    </label>
                    <input
                      id="tag-color"
                      type="color"
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                      className="h-10 w-20 border border-gray-300 rounded-md cursor-pointer"
                    />
                  </div>
                  {editingTagId ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateTag(editingTagId)}
                        disabled={!tagName.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        Update
                      </button>
                      <button
                        onClick={handleCancelTagEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateTag}
                      disabled={!tagName.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Create
                    </button>
                  )}
                </div>
              </div>

              {/* Tag List */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Tags</h4>
                {tags.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No tags yet. Create one above!</p>
                ) : (
                  <div className="space-y-2">
                    {tags.map(tag => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded border-2 border-gray-300"
                            style={{ backgroundColor: tag.color }}
                            title={`Color: ${tag.color}`}
                          />
                          <span className="font-medium">{tag.name}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditTag(tag)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                            aria-label={`Edit ${tag.name}`}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                            aria-label={`Delete ${tag.name}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save Template Modal */}
        {showSaveTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Save as Template</h3>
                <button
                  onClick={() => {
                    setShowSaveTemplateModal(false);
                    setTemplateName('');
                    setTemplateDescription('');
                    setTemplateCategory('');
                    setSavingTodoId(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Weekly Report Template"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={100}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Describe what this template is for..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    placeholder="e.g., Work, Personal, Project"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={50}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowSaveTemplateModal(false);
                      setTemplateName('');
                      setTemplateDescription('');
                      setTemplateCategory('');
                      setSavingTodoId(null);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTemplate}
                    disabled={!templateName.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Save Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Templates Library Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-semibold">Templates Library</h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Category Filter */}
              {templates.some(t => t.category) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Category:
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Categories</option>
                    {Array.from(new Set(templates.map(t => t.category).filter(Boolean))).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Templates List */}
              {templates.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No templates yet. Save a todo as a template to get started!
                </p>
              ) : (
                <div className="space-y-3">
                  {templates
                    .filter(t => categoryFilter === 'all' || t.category === categoryFilter)
                    .map(template => (
                      <div
                        key={template.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{template.name}</h4>
                            {template.description && (
                              <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {template.category && (
                                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                  📁 {template.category}
                                </span>
                              )}
                              {template.priority && (
                                <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(template.priority as Priority)}`}>
                                  {template.priority.toUpperCase()}
                                </span>
                              )}
                              {template.recurrence_pattern && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  🔄 {template.recurrence_pattern}
                                </span>
                              )}
                              {template.reminder_minutes && (
                                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                                  🔔 Reminder
                                </span>
                              )}
                              {template.subtasks_json && (
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                  ✓ {JSON.parse(template.subtasks_json).length} subtasks
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleUseTemplate(template.id)}
                              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                            >
                              Use
                            </button>
                            <button
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
