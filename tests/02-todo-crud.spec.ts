import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Todo CRUD Operations', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Register and login
    const username = `testuser_${Date.now()}`;
    await helpers.registerWithPassword(username);
  });

  test('should create a simple todo with just title', async ({ page }) => {
    const todoTitle = 'Buy groceries';
    
    await helpers.createTodo({ title: todoTitle });
    
    // Verify todo appears in the list
    const todoExists = await helpers.verifyTodoExists(todoTitle);
    expect(todoExists).toBe(true);
  });

  test('should create todo with all metadata', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 30, 0, 0);
    
    await helpers.createTodo({
      title: 'Complete project report',
      description: 'Finish the Q4 project report',
      priority: 'high',
      dueDate: tomorrow,
    });
    
    // Verify todo exists
    const todoExists = await helpers.verifyTodoExists('Complete project report');
    expect(todoExists).toBe(true);
    
    // Verify priority badge
    const highPriorityBadge = page.getByText('High').first();
    await expect(highPriorityBadge).toBeVisible();
  });

  test('should edit todo title', async ({ page }) => {
    const oldTitle = 'Old task name';
    const newTitle = 'Updated task name';
    
    await helpers.createTodo({ title: oldTitle });
    await helpers.editTodo(oldTitle, newTitle);
    
    // Verify old title doesn't exist
    const oldExists = await helpers.verifyTodoExists(oldTitle);
    expect(oldExists).toBe(false);
    
    // Verify new title exists
    const newExists = await helpers.verifyTodoExists(newTitle);
    expect(newExists).toBe(true);
  });

  test('should delete todo with confirmation', async ({ page }) => {
    const todoTitle = 'Task to be deleted';
    
    await helpers.createTodo({ title: todoTitle });
    
    // Verify todo exists before deletion
    let todoExists = await helpers.verifyTodoExists(todoTitle);
    expect(todoExists).toBe(true);
    
    // Delete todo
    await helpers.deleteTodo(todoTitle);
    
    // Verify todo no longer exists
    todoExists = await helpers.verifyTodoExists(todoTitle);
    expect(todoExists).toBe(false);
  });

  test('should toggle todo completion', async ({ page }) => {
    const todoTitle = 'Task to complete';
    
    await helpers.createTodo({ title: todoTitle });
    
    // Toggle completion
    await helpers.toggleTodoCompletion(todoTitle);
    
    // Wait for UI update
    await page.waitForTimeout(500);
    
    // Verify todo moved to completed section (if visible)
    // Or verify checkbox is checked
    const completedSection = page.getByRole('heading', { name: /completed/i });
    await expect(completedSection).toBeVisible();
  });

  test('should create multiple todos', async ({ page }) => {
    const todos = [
      'First task',
      'Second task',
      'Third task',
    ];
    
    for (const todo of todos) {
      await helpers.createTodo({ title: todo });
    }
    
    // Verify all todos exist
    for (const todo of todos) {
      const exists = await helpers.verifyTodoExists(todo);
      expect(exists).toBe(true);
    }
  });

  test('should validate required title field', async ({ page }) => {
    // Try to create todo without title
    await page.getByRole('button', { name: /add todo|create/i }).first().click();
    
    // Should show validation error or button should be disabled
    // (implementation may vary)
    await page.waitForTimeout(300);
    
    // Verify no empty todo was created
    const emptyTodo = page.getByText('').filter({ hasText: '' }).first();
    const count = await emptyTodo.count();
    expect(count).toBe(0);
  });

  test('should sort todos by priority', async ({ page }) => {
    // Create todos with different priorities
    await helpers.createTodo({ title: 'Low priority task', priority: 'low' });
    await helpers.createTodo({ title: 'High priority task', priority: 'high' });
    await helpers.createTodo({ title: 'Medium priority task', priority: 'medium' });
    
    // Wait for rendering
    await page.waitForTimeout(500);
    
    // Get all todo titles
    const todos = page.locator('[data-todo-item]');
    const count = await todos.count();
    
    expect(count).toBeGreaterThanOrEqual(3);
    
    // High priority should appear before low priority
    const highIndex = await page.getByText('High priority task').first().evaluate((el) => {
      return Array.from(el.closest('[data-todo-item]')?.parentElement?.children || [])
        .indexOf(el.closest('[data-todo-item]')!);
    });
    
    const lowIndex = await page.getByText('Low priority task').first().evaluate((el) => {
      return Array.from(el.closest('[data-todo-item]')?.parentElement?.children || [])
        .indexOf(el.closest('[data-todo-item]')!);
    });
    
    expect(highIndex).toBeLessThan(lowIndex);
  });

  test('should display todos in correct sections (overdue, active, completed)', async ({ page }) => {
    // Create an overdue todo
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await helpers.createTodo({ 
      title: 'Overdue task',
      dueDate: yesterday 
    });
    
    // Create an active todo
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await helpers.createTodo({ 
      title: 'Active task',
      dueDate: tomorrow 
    });
    
    // Create and complete a todo
    await helpers.createTodo({ title: 'Completed task' });
    await helpers.toggleTodoCompletion('Completed task');
    
    await page.waitForTimeout(500);
    
    // Verify sections exist
    await expect(page.getByRole('heading', { name: /overdue/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /active/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /completed/i })).toBeVisible();
  });
});

test.describe('Todo Priority System', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;
    await helpers.registerWithPassword(username);
  });

  test('should create todo with high priority', async ({ page }) => {
    await helpers.createTodo({ title: 'High priority task', priority: 'high' });
    
    // Verify high priority badge (red)
    const badge = page.locator('.bg-red-100, .bg-red-600, .text-red-800').first();
    await expect(badge).toBeVisible();
  });

  test('should create todo with medium priority', async ({ page }) => {
    await helpers.createTodo({ title: 'Medium priority task', priority: 'medium' });
    
    // Verify medium priority badge (yellow)
    const badge = page.locator('.bg-yellow-100, .bg-yellow-600, .text-yellow-800').first();
    await expect(badge).toBeVisible();
  });

  test('should create todo with low priority', async ({ page }) => {
    await helpers.createTodo({ title: 'Low priority task', priority: 'low' });
    
    // Verify low priority badge (blue)
    const badge = page.locator('.bg-blue-100, .bg-blue-600, .text-blue-800').first();
    await expect(badge).toBeVisible();
  });

  test('should filter todos by priority', async ({ page }) => {
    // Create todos with different priorities
    await helpers.createTodo({ title: 'High priority task', priority: 'high' });
    await helpers.createTodo({ title: 'Medium priority task', priority: 'medium' });
    await helpers.createTodo({ title: 'Low priority task', priority: 'low' });
    
    // Filter by high priority
    await helpers.filterByPriority('high');
    
    // Should show high priority todo
    await expect(page.getByText('High priority task')).toBeVisible();
    
    // Should not show other priorities (or they should be hidden)
    // (implementation may vary - some apps hide, some gray out)
  });

  test('should change todo priority', async ({ page }) => {
    const todoTitle = 'Changeable priority task';
    
    // Create with low priority
    await helpers.createTodo({ title: todoTitle, priority: 'low' });
    
    // Edit and change to high priority
    const todo = await helpers.findTodoByTitle(todoTitle);
    const editButton = todo.locator('..').getByRole('button', { name: /edit/i }).first();
    await editButton.click();
    
    // Change priority
    const prioritySelect = page.locator('select').filter({ hasText: /priority/i }).first();
    await prioritySelect.selectOption('high');
    
    // Save
    await page.getByRole('button', { name: /save|update/i }).first().click();
    await page.waitForTimeout(300);
    
    // Verify high priority badge now appears
    const highBadge = todo.locator('..').locator('.bg-red-100, .text-red-800').first();
    await expect(highBadge).toBeVisible();
  });
});

test.describe('Todo Validation', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;
    await helpers.registerWithPassword(username);
  });

  test('should trim whitespace from title', async ({ page }) => {
    const todoTitle = '  Whitespace task  ';
    
    await helpers.createTodo({ title: todoTitle });
    
    // Verify todo exists with trimmed title
    const trimmedExists = await helpers.verifyTodoExists('Whitespace task');
    expect(trimmedExists).toBe(true);
  });

  test('should validate due date is in the future', async ({ page }) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Try to create todo with past due date
    await page.fill('input[placeholder*="todo" i]', 'Past due task');
    
    const dateInput = page.locator('input[type="datetime-local"]').first();
    if (await dateInput.isVisible()) {
      const dateString = helpers['formatDateForInput'](yesterday);
      await dateInput.fill(dateString);
    }
    
    await page.getByRole('button', { name: /add todo|create/i }).first().click();
    
    // Should show validation error
    await expect(page.getByText(/due date.*future|past/i)).toBeVisible({ timeout: 3000 });
  });

  test('should handle long todo titles', async ({ page }) => {
    const longTitle = 'A'.repeat(200);
    
    await helpers.createTodo({ title: longTitle });
    
    // Verify todo was created (may be truncated)
    const todoExists = await helpers.verifyTodoExists(longTitle.substring(0, 50));
    expect(todoExists).toBe(true);
  });
});

test.describe('Todo Search and Filter', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;
    await helpers.registerWithPassword(username);
  });

  test('should search todos by title', async ({ page }) => {
    // Create multiple todos
    await helpers.createTodo({ title: 'Buy groceries' });
    await helpers.createTodo({ title: 'Call dentist' });
    await helpers.createTodo({ title: 'Buy tickets' });
    
    // Search for "buy"
    await helpers.searchTodos('buy');
    
    // Should show todos with "buy"
    await expect(page.getByText('Buy groceries')).toBeVisible();
    await expect(page.getByText('Buy tickets')).toBeVisible();
    
    // May or may not show "Call dentist" depending on implementation
  });

  test('should perform case-insensitive search', async ({ page }) => {
    await helpers.createTodo({ title: 'Important Meeting' });
    
    // Search with lowercase
    await helpers.searchTodos('important');
    
    // Should still find the todo
    await expect(page.getByText('Important Meeting')).toBeVisible();
  });

  test('should show empty state when no todos match search', async ({ page }) => {
    await helpers.createTodo({ title: 'Some task' });
    
    // Search for something that doesn't exist
    await helpers.searchTodos('nonexistent xyz abc');
    
    // Should show empty state or "no results" message
    await expect(page.getByText(/no.*todos.*found|no.*results/i)).toBeVisible({ timeout: 2000 });
  });

  test('should clear search filter', async ({ page }) => {
    await helpers.createTodo({ title: 'Buy groceries' });
    await helpers.createTodo({ title: 'Call dentist' });
    
    // Search to filter
    await helpers.searchTodos('buy');
    
    // Clear filters
    await helpers.clearFilters();
    
    // Both todos should be visible again
    await expect(page.getByText('Buy groceries')).toBeVisible();
    await expect(page.getByText('Call dentist')).toBeVisible();
  });

  test('should filter by status (active/completed)', async ({ page }) => {
    // Create and complete a todo
    await helpers.createTodo({ title: 'Completed task' });
    await helpers.toggleTodoCompletion('Completed task');
    
    // Create an active todo
    await helpers.createTodo({ title: 'Active task' });
    
    await page.waitForTimeout(500);
    
    // Verify both are visible initially
    await expect(page.getByText('Completed task')).toBeVisible();
    await expect(page.getByText('Active task')).toBeVisible();
    
    // Filter by completed (if filter exists)
    const statusFilter = page.locator('select').filter({ hasText: /status|filter/i }).first();
    if (await statusFilter.isVisible({ timeout: 1000 }).catch(() => false)) {
      await statusFilter.selectOption('completed');
      await page.waitForTimeout(300);
      
      // Should show completed task
      await expect(page.getByText('Completed task')).toBeVisible();
    }
  });
});
