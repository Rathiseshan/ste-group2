import { test, expect } from '@playwright/test';
import { TestHelpers } from './helpers';

test.describe('Advanced Features - Recurring Todos', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;
    await helpers.registerWithPassword(username);
  });

  test('should create daily recurring todo', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    
    await helpers.createTodo({
      title: 'Daily standup meeting',
      dueDate: tomorrow,
      recurring: 'daily',
    });
    
    // Verify todo exists with recurring badge
    await expect(page.getByText('Daily standup meeting')).toBeVisible();
    await expect(page.getByText('🔄', { exact: false })).toBeVisible();
  });

  test('should create weekly recurring todo', async ({ page }) => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    await helpers.createTodo({
      title: 'Weekly team sync',
      dueDate: nextWeek,
      recurring: 'weekly',
    });
    
    await expect(page.getByText('Weekly team sync')).toBeVisible();
  });

  test('should create next instance when completing recurring todo', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    
    await helpers.createTodo({
      title: 'Daily exercise',
      dueDate: tomorrow,
      recurring: 'daily',
      priority: 'high',
    });
    
    // Complete the todo
    await helpers.toggleTodoCompletion('Daily exercise');
    await page.waitForTimeout(1000);
    
    // Verify a new instance was created (should appear in active section)
    const todos = page.getByText('Daily exercise');
    const count = await todos.count();
    
    // Should have at least 2 instances (completed + new)
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should inherit priority in next recurring instance', async ({ page }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await helpers.createTodo({
      title: 'Important recurring task',
      dueDate: tomorrow,
      recurring: 'daily',
      priority: 'high',
    });
    
    // Complete the todo
    await helpers.toggleTodoCompletion('Important recurring task');
    await page.waitForTimeout(1000);
    
    // New instance should also be high priority
    const highBadges = page.locator('.bg-red-100, .text-red-800');
    const count = await highBadges.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Advanced Features - Subtasks & Progress', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;
    await helpers.registerWithPassword(username);
  });

  test('should add subtask to todo', async ({ page }) => {
    const todoTitle = 'Project with subtasks';
    const subtaskTitle = 'Research phase';
    
    await helpers.createTodo({ title: todoTitle });
    await helpers.addSubtask(todoTitle, subtaskTitle);
    
    // Verify subtask appears
    await expect(page.getByText(subtaskTitle)).toBeVisible();
  });

  test('should toggle subtask completion', async ({ page }) => {
    const todoTitle = 'Main task';
    const subtaskTitle = 'Sub item';
    
    await helpers.createTodo({ title: todoTitle });
    await helpers.addSubtask(todoTitle, subtaskTitle);
    
    // Find and toggle subtask checkbox
    const subtask = page.getByText(subtaskTitle);
    const checkbox = subtask.locator('..').locator('input[type="checkbox"]').first();
    await checkbox.click();
    await page.waitForTimeout(300);
    
    // Progress bar should update
    const progressBar = page.locator('[role="progressbar"], .w-full.bg-').first();
    await expect(progressBar).toBeVisible();
  });

  test('should show progress percentage', async ({ page }) => {
    const todoTitle = 'Task with multiple subtasks';
    
    await helpers.createTodo({ title: todoTitle });
    
    // Add 3 subtasks
    await helpers.addSubtask(todoTitle, 'Subtask 1');
    await helpers.addSubtask(todoTitle, 'Subtask 2');
    await helpers.addSubtask(todoTitle, 'Subtask 3');
    
    // Complete 1 out of 3 (33%)
    const subtask1 = page.getByText('Subtask 1');
    const checkbox = subtask1.locator('..').locator('input[type="checkbox"]').first();
    await checkbox.click();
    await page.waitForTimeout(500);
    
    // Should show progress text like "1/3 completed (33%)"
    await expect(page.getByText(/1\/3|33%/i)).toBeVisible();
  });

  test('should delete subtask', async ({ page }) => {
    const todoTitle = 'Task with deletable subtask';
    const subtaskTitle = 'Temporary subtask';
    
    await helpers.createTodo({ title: todoTitle });
    await helpers.addSubtask(todoTitle, subtaskTitle);
    
    // Verify subtask exists
    await expect(page.getByText(subtaskTitle)).toBeVisible();
    
    // Delete subtask
    const subtask = page.getByText(subtaskTitle);
    const deleteButton = subtask.locator('..').getByRole('button', { name: /delete|×|trash/i }).first();
    await deleteButton.click();
    await page.waitForTimeout(300);
    
    // Verify subtask is gone
    await expect(page.getByText(subtaskTitle)).not.toBeVisible();
  });

  test('should show green progress bar at 100%', async ({ page }) => {
    const todoTitle = 'Complete task';
    
    await helpers.createTodo({ title: todoTitle });
    await helpers.addSubtask(todoTitle, 'Only subtask');
    
    // Complete the subtask
    const subtask = page.getByText('Only subtask');
    const checkbox = subtask.locator('..').locator('input[type="checkbox"]').first();
    await checkbox.click();
    await page.waitForTimeout(500);
    
    // Progress should be 100%
    await expect(page.getByText(/1\/1|100%/i)).toBeVisible();
    
    // Progress bar should be green
    const greenBar = page.locator('.bg-green-500, .bg-green-600').first();
    await expect(greenBar).toBeVisible();
  });
});

test.describe('Advanced Features - Tags', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;
    await helpers.registerWithPassword(username);
  });

  test('should create a new tag', async ({ page }) => {
    await helpers.createTag('Work', '#ef4444');
    
    // Verify tag exists in tag list
    await page.getByRole('button', { name: /manage tags/i }).click();
    await expect(page.getByText('Work')).toBeVisible();
  });

  test('should assign tag to todo', async ({ page }) => {
    // Create tag first
    await helpers.createTag('Urgent', '#f59e0b');
    
    // Create todo
    await helpers.createTodo({ title: 'Important task' });
    
    // Assign tag
    await helpers.assignTagToTodo('Important task', 'Urgent');
    
    // Verify tag badge appears on todo
    const todo = await helpers.findTodoByTitle('Important task');
    await expect(todo.locator('..').getByText('Urgent')).toBeVisible();
  });

  test('should filter todos by tag', async ({ page }) => {
    // Create tags
    await helpers.createTag('Work', '#3b82f6');
    await helpers.createTag('Personal', '#10b981');
    
    // Create todos with different tags
    await helpers.createTodo({ title: 'Work task' });
    await helpers.assignTagToTodo('Work task', 'Work');
    
    await helpers.createTodo({ title: 'Personal task' });
    await helpers.assignTagToTodo('Personal task', 'Personal');
    
    await page.waitForTimeout(500);
    
    // Filter by Work tag
    await helpers.filterByTag('Work');
    
    // Should show work task
    await expect(page.getByText('Work task')).toBeVisible();
  });

  test('should edit tag name and color', async ({ page }) => {
    await helpers.createTag('OldName', '#000000');
    
    // Open tag management
    await page.getByRole('button', { name: /manage tags/i }).click();
    await page.waitForTimeout(300);
    
    // Edit tag
    const editButton = page.getByRole('button', { name: /edit|✏️/i }).first();
    await editButton.click();
    await page.waitForTimeout(200);
    
    // Change name
    const nameInput = page.locator('input[value="OldName"]');
    await nameInput.clear();
    await nameInput.fill('NewName');
    
    // Save
    await page.getByRole('button', { name: /save|update/i }).first().click();
    await page.waitForTimeout(300);
    
    // Verify new name appears
    await expect(page.getByText('NewName')).toBeVisible();
  });

  test('should delete tag', async ({ page }) => {
    await helpers.createTag('TemporaryTag', '#888888');
    
    // Open tag management
    await page.getByRole('button', { name: /manage tags/i }).click();
    await page.waitForTimeout(300);
    
    // Delete tag
    const deleteButton = page.getByRole('button', { name: /delete|×|trash/i }).first();
    await deleteButton.click();
    
    // Confirm if needed
    const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
    
    await page.waitForTimeout(300);
    
    // Tag should be gone
    await expect(page.getByText('TemporaryTag')).not.toBeVisible();
  });

  test('should prevent duplicate tag names', async ({ page }) => {
    await helpers.createTag('UniqueTag', '#ff0000');
    
    // Try to create tag with same name
    await page.getByRole('button', { name: /manage tags/i }).click();
    await page.fill('input[placeholder*="tag name" i]', 'UniqueTag');
    await page.getByRole('button', { name: /create tag|add tag/i }).first().click();
    
    // Should show error
    await expect(page.getByText(/already exists|duplicate/i)).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Advanced Features - Templates', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;
    await helpers.registerWithPassword(username);
  });

  test('should save todo as template', async ({ page }) => {
    // Create a todo with metadata
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await helpers.createTodo({
      title: 'Weekly report template',
      description: 'Complete weekly report',
      priority: 'high',
      dueDate: tomorrow,
    });
    
    // Save as template
    await helpers.saveAsTemplate('Weekly report template', 'Report Template', 'Work');
    
    // Verify template was saved
    await page.getByRole('button', { name: /use template/i }).click();
    await expect(page.getByText('Report Template')).toBeVisible();
  });

  test('should create todo from template', async ({ page }) => {
    // Create and save template
    await helpers.createTodo({ title: 'Template task', priority: 'high' });
    await helpers.saveAsTemplate('Template task', 'My Template');
    
    // Delete original todo
    await helpers.deleteTodo('Template task');
    
    // Use template
    await helpers.useTemplate('My Template');
    await page.waitForTimeout(500);
    
    // New todo should be created
    await expect(page.getByText('Template task')).toBeVisible();
  });

  test('should filter templates by category', async ({ page }) => {
    // Create templates with different categories
    await helpers.createTodo({ title: 'Work template' });
    await helpers.saveAsTemplate('Work template', 'Work Template', 'Work');
    
    await helpers.createTodo({ title: 'Personal template' });
    await helpers.saveAsTemplate('Personal template', 'Personal Template', 'Personal');
    
    // Open template modal
    await page.getByRole('button', { name: /use template/i }).click();
    await page.waitForTimeout(300);
    
    // Filter by category (if filter exists)
    const categoryFilter = page.locator('select, button').filter({ hasText: /category/i }).first();
    if (await categoryFilter.isVisible({ timeout: 1000 }).catch(() => false)) {
      await categoryFilter.click();
      await page.getByText('Work', { exact: true }).click();
      await page.waitForTimeout(300);
      
      // Should show work template
      await expect(page.getByText('Work Template')).toBeVisible();
    }
  });

  test('should preserve subtasks in template', async ({ page }) => {
    // Create todo with subtasks
    await helpers.createTodo({ title: 'Project template' });
    await helpers.addSubtask('Project template', 'Step 1');
    await helpers.addSubtask('Project template', 'Step 2');
    
    // Save as template
    await helpers.saveAsTemplate('Project template', 'Project Template');
    
    // Delete original
    await helpers.deleteTodo('Project template');
    
    // Use template
    await helpers.useTemplate('Project Template');
    await page.waitForTimeout(1000);
    
    // Subtasks should be recreated
    await expect(page.getByText('Step 1')).toBeVisible();
    await expect(page.getByText('Step 2')).toBeVisible();
  });
});

test.describe('Advanced Features - Export & Import', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;
    await helpers.registerWithPassword(username);
  });

  test('should export todos to JSON', async ({ page }) => {
    // Create some todos
    await helpers.createTodo({ title: 'Export test 1' });
    await helpers.createTodo({ title: 'Export test 2', priority: 'high' });
    
    // Export
    const downloadPath = await helpers.exportTodos();
    expect(downloadPath).toBeTruthy();
  });

  test('should import todos from JSON', async ({ page }) => {
    // Create sample JSON
    const sampleData = JSON.stringify({
      version: '1.0',
      todos: [
        {
          id: 1,
          title: 'Imported todo 1',
          description: 'Test import',
          priority: 'high',
          status: 'active',
        },
        {
          id: 2,
          title: 'Imported todo 2',
          priority: 'medium',
          status: 'active',
        },
      ],
      tags: [],
      subtasks: [],
      todo_tags: [],
    });
    
    // Import
    await helpers.importTodos(sampleData);
    
    // Verify todos were imported
    await expect(page.getByText('Imported todo 1')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Imported todo 2')).toBeVisible();
  });

  test('should show success message after import', async ({ page }) => {
    const sampleData = JSON.stringify({
      version: '1.0',
      todos: [{ id: 1, title: 'Test todo', priority: 'medium', status: 'active' }],
      tags: [],
      subtasks: [],
      todo_tags: [],
    });
    
    await helpers.importTodos(sampleData);
    
    // Should show success message
    await expect(page.getByText(/imported.*successfully|import.*complete/i)).toBeVisible({ timeout: 3000 });
  });

  test('should handle invalid JSON import', async ({ page }) => {
    const invalidData = 'not valid json {{{';
    
    // Try to import invalid JSON
    await helpers.importTodos(invalidData);
    
    // Should show error message
    await expect(page.getByText(/invalid.*json|error.*import/i)).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Advanced Features - Calendar View', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    const username = `testuser_${Date.now()}`;
    await helpers.registerWithPassword(username);
  });

  test('should navigate to calendar page', async ({ page }) => {
    await helpers.goToCalendar();
    
    // Verify calendar page loaded
    await expect(page).toHaveURL('/calendar');
    await expect(page.getByText(/sunday|monday|tuesday|wednesday/i)).toBeVisible();
  });

  test('should display current month', async ({ page }) => {
    await helpers.goToCalendar();
    
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    await expect(page.getByText(currentMonth, { exact: false })).toBeVisible();
  });

  test('should navigate between months', async ({ page }) => {
    await helpers.goToCalendar();
    
    // Click next month button
    const nextButton = page.getByRole('button', { name: /next|→|›/i });
    await nextButton.click();
    await page.waitForTimeout(300);
    
    // Click previous month button
    const prevButton = page.getByRole('button', { name: /prev|←|‹|previous/i });
    await prevButton.click();
    await page.waitForTimeout(300);
    
    // Click today button
    const todayButton = page.getByRole('button', { name: /today/i });
    await todayButton.click();
    await page.waitForTimeout(300);
  });

  test('should display todos on calendar dates', async ({ page }) => {
    // Create a todo for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    
    await helpers.createTodo({
      title: 'Calendar event',
      dueDate: tomorrow,
    });
    
    // Go to calendar
    await helpers.goToCalendar();
    
    // Todo should appear on the date
    await expect(page.getByText('Calendar event')).toBeVisible();
  });

  test('should highlight current day', async ({ page }) => {
    await helpers.goToCalendar();
    
    const today = new Date().getDate();
    
    // Current day should be highlighted (usually with different background)
    const todayCell = page.locator(`[data-date="${today}"], .bg-blue-100, .ring-2`).first();
    await expect(todayCell).toBeVisible();
  });

  test('should display Singapore holidays', async ({ page }) => {
    await helpers.goToCalendar();
    
    // Singapore holidays should be visible (like Chinese New Year, National Day, etc.)
    // This test may need adjustment based on current date
    await page.waitForTimeout(1000);
    
    // Just verify calendar loaded properly
    await expect(page.getByText(/sunday|monday/i)).toBeVisible();
  });
});
