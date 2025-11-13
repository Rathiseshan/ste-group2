'use client';

import { useState, useEffect, useCallback } from 'react';

interface Todo {
  id: number;
  title: string;
  due_at: string | null;
  reminder_minutes: number | null;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setEnabled(true);
      }
      return result;
    }
    return Notification.permission;
  }, []);

  const showNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'todo-reminder',
      });
    }
  }, []);

  const checkForNotifications = useCallback(async () => {
    if (!enabled || permission !== 'granted') return;

    try {
      const response = await fetch('/api/notifications/check');
      if (response.ok) {
        const data = await response.json();
        
        data.todos.forEach((todo: Todo) => {
          const reminderText = todo.reminder_minutes 
            ? `Reminder: ${formatReminderTime(todo.reminder_minutes)}`
            : 'Reminder';
          
          showNotification(
            `Todo Due Soon: ${todo.title}`,
            `${reminderText}\nDue: ${todo.due_at ? new Date(todo.due_at).toLocaleString() : 'N/A'}`
          );
        });
      }
    } catch (error) {
      console.error('Failed to check notifications:', error);
    }
  }, [enabled, permission, showNotification]);

  // Poll every 30 seconds
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(checkForNotifications, 30000);
    // Check immediately on enable
    checkForNotifications();

    return () => clearInterval(interval);
  }, [enabled, checkForNotifications]);

  return {
    permission,
    enabled,
    setEnabled,
    requestPermission,
    showNotification,
    checkForNotifications,
  };
}

function formatReminderTime(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes before`;
  if (minutes < 1440) return `${minutes / 60} hours before`;
  if (minutes < 10080) return `${minutes / 1440} days before`;
  return `${minutes / 10080} weeks before`;
}
