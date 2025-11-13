'use client';

import { useState, useEffect } from 'react';
import { getSingaporeNow } from '@/lib/timezone';
import Link from 'next/link';

interface Holiday {
  id: number;
  date: string;
  name: string;
  country: string;
}

interface TodoWithRelations {
  id: number;
  title: string;
  priority: string;
  due_at?: string;
  status: string;
  tags: any[];
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(getSingaporeNow());
  const [todos, setTodos] = useState<TodoWithRelations[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodos();
    fetchHolidays();
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

  const fetchHolidays = async () => {
    try {
      const response = await fetch('/api/holidays');
      const data = await response.json();
      setHolidays(data.holidays);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // End on Saturday
    
    const weeks: Date[][] = [];
    let week: Date[] = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      week.push(new Date(d));
      
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    
    return weeks;
  };

  const getTodosForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return todos.filter(todo => 
      todo.due_at && todo.due_at.startsWith(dateStr)
    );
  };

  const getHolidayForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return holidays.find(h => h.date === dateStr);
  };

  const isToday = (date: Date) => {
    const now = getSingaporeNow();
    return date.toDateString() === now.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const isWeekend = (date: Date) => {
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const weeks = generateCalendar();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">📅 Calendar View</h1>
          <Link 
            href="/" 
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Back to Todos
          </Link>
        </div>

        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
          <button 
            onClick={() => {
              const prev = new Date(currentMonth);
              prev.setMonth(prev.getMonth() - 1);
              setCurrentMonth(prev);
            }}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            ← Previous
          </button>

          <h2 className="text-3xl font-bold text-gray-800">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>

          <button 
            onClick={() => {
              const next = new Date(currentMonth);
              next.setMonth(next.getMonth() + 1);
              setCurrentMonth(next);
            }}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Next →
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <button 
            onClick={() => setCurrentMonth(getSingaporeNow())}
            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            📍 Today
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 border-2 border-blue-500 rounded"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-50 rounded"></div>
            <span>Weekend</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-200 rounded"></div>
            <span>Holiday</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 bg-gray-200">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
              <div key={day} className="p-3 text-center font-bold text-gray-700 border-r last:border-r-0 border-gray-300">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 border-t border-gray-200">
              {week.map((date, dayIdx) => {
                const dayTodos = getTodosForDate(date);
                const holiday = getHolidayForDate(date);

                return (
                  <div
                    key={dayIdx}
                    className={`
                      min-h-[140px] p-2 border-r last:border-r-0 border-gray-200 cursor-pointer transition-all
                      hover:bg-gray-100
                      ${!isCurrentMonth(date) ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                      ${isToday(date) ? 'bg-blue-50 border-2 border-blue-500 shadow-inner' : ''}
                      ${isWeekend(date) && isCurrentMonth(date) ? 'bg-red-50' : ''}
                      ${holiday && isCurrentMonth(date) ? 'bg-red-100' : ''}
                    `}
                    onClick={() => setSelectedDay(date)}
                  >
                    <div className={`font-bold mb-2 ${isToday(date) ? 'text-blue-600 text-lg' : ''}`}>
                      {date.getDate()}
                    </div>

                    {holiday && (
                      <div className="text-xs bg-red-600 text-white px-2 py-1 rounded mb-2 font-medium shadow-sm">
                        🎉 {holiday.name}
                      </div>
                    )}

                    {dayTodos.length > 0 && (
                      <div className="space-y-1">
                        {dayTodos.slice(0, 3).map(todo => (
                          <div 
                            key={todo.id}
                            className={`
                              text-xs p-1.5 rounded truncate shadow-sm border
                              ${getPriorityColor(todo.priority)}
                            `}
                            title={todo.title}
                          >
                            {todo.title}
                          </div>
                        ))}
                        {dayTodos.length > 3 && (
                          <div className="text-xs text-gray-600 font-semibold px-1">
                            +{dayTodos.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Day Detail Modal */}
        {selectedDay && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedDay.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {getHolidayForDate(selectedDay) && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <div className="font-semibold text-red-800">
                    🎉 {getHolidayForDate(selectedDay)!.name}
                  </div>
                  <div className="text-sm text-red-600">Singapore Public Holiday</div>
                </div>
              )}

              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {getTodosForDate(selectedDay).map(todo => (
                  <div key={todo.id} className="border border-gray-200 p-3 rounded-lg hover:shadow-md transition-shadow">
                    <div className="font-semibold text-gray-800 mb-1">{todo.title}</div>
                    <div className="flex gap-2 items-center text-sm text-gray-600">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                        {todo.priority.toUpperCase()}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        todo.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {todo.status}
                      </span>
                    </div>
                  </div>
                ))}

                {getTodosForDate(selectedDay).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No todos for this day</p>
                    <Link 
                      href="/"
                      className="text-blue-600 hover:underline mt-2 inline-block"
                    >
                      Create a new todo
                    </Link>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSelectedDay(null)}
                className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
