import { NextRequest, NextResponse } from 'next/server';
import { getTestUser } from '@/lib/test-user';
import { todoDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  const testUser = getTestUser();
  
  try {
    // Get todos that need notifications
    const todos = todoDB.getTodosNeedingNotification(testUser.id);
    
    // Mark as notified
    const now = getSingaporeNow().toISOString();
    for (const todo of todos) {
      todoDB.update(todo.id, { last_notification_sent: now });
    }
    
    return NextResponse.json({ todos });
  } catch (error) {
    console.error('Failed to check notifications:', error);
    return NextResponse.json(
      { error: 'Failed to check notifications' },
      { status: 500 }
    );
  }
}
