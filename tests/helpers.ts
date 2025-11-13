import { Page, expect } from '@playwright/test';

/**
 * Test helper class for common operations in E2E tests
 * Provides reusable methods for authentication, todo operations, and UI interactions
 */
export class TestHelpers {
  constructor(public page: Page) {}

  /**
   * Register a new user with password authentication
   */
  async registerWithPassword(username: string, password: string = 'password123') {
    await this.page.goto('/login');
    await this.page.getByRole('button', { name: /register/i }).click();
    await this.page.fill('input[type="text"]', username);
    await this.page.fill('input[type="password"]', password);
    await this.page.getByRole('button', { name: /sign up/i }).click();
    
    // Wait for redirect to main page
    await this.page.waitForURL('/');
    await expect(this.page).toHaveURL('/');
  }

  /**
   * Login with password authentication
   */
  async loginWithPassword(username: string, password: string = 'password123') {
    await this.page.goto('/login');
    await this.page.fill('input[type="text"]', username);
    await this.page.fill('input[type="password"]', password);
    await this.page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect to main page
    await this.page.waitForURL('/');
    await expect(this.page).toHaveURL('/');
  }

  /**
   * Logout current user
   */
  async logout() {
    const logoutButton = this.page.getByRole('button', { name: /logout/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await this.page.waitForURL('/login');
    }
  }

  /**
   * Create a new todo with specified properties
   */
  async createTodo(options: {
    title: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low';
    dueDate?: Date;
    recurring?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    reminder?: string;
  }) {
    // Fill title
    await this.page.fill('input[placeholder*="todo" i]', options.title);

    // Fill description if provided
    if (options.description) {
      const descInput = this.page.locator('textarea, input[placeholder*="description" i]').first();
      if (await descInput.isVisible()) {
        await descInput.fill(options.description);
      }
    }

    // Select priority if provided
    if (options.priority) {
      const prioritySelect = this.page.locator('select').filter({ hasText: /priority/i }).first();
      if (await prioritySelect.isVisible()) {
        await prioritySelect.selectOption(options.priority);
      }
    }

    // Set due date if provided
    if (options.dueDate) {
      const dateInput = this.page.locator('input[type="datetime-local"]').first();
      if (await dateInput.isVisible()) {
        const dateString = this.formatDateForInput(options.dueDate);
        await dateInput.fill(dateString);
      }
    }

    // Set recurring if provided
    if (options.recurring) {
      const recurringCheckbox = this.page.locator('input[type="checkbox"]').filter({ hasText: /repeat/i }).first();
      if (await recurringCheckbox.isVisible()) {
        await recurringCheckbox.check();
        await this.page.selectOption('select', options.recurring);
      }
    }

    // Set reminder if provided
    if (options.reminder) {
      const reminderSelect = this.page.locator('select').filter({ hasText: /reminder/i }).first();
      if (await reminderSelect.isVisible()) {
        await reminderSelect.selectOption(options.reminder);
      }
    }

    // Click Add/Create button
    await this.page.getByRole('button', { name: /add todo|create/i }).first().click();

    // Wait for todo to appear in the list
    await this.page.waitForTimeout(500);
  }

  /**
   * Find a todo by title
   */
  async findTodoByTitle(title: string) {
    return this.page.getByText(title, { exact: false }).first();
  }

  /**
   * Toggle todo completion
   */
  async toggleTodoCompletion(title: string) {
    const todo = await this.findTodoByTitle(title);
    const checkbox = todo.locator('..').locator('input[type="checkbox"]').first();
    await checkbox.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Delete a todo
   */
  async deleteTodo(title: string) {
    const todo = await this.findTodoByTitle(title);
    const deleteButton = todo.locator('..').getByRole('button', { name: /delete|×|trash/i }).first();
    await deleteButton.click();
    
    // Confirm deletion if there's a confirmation dialog
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
    
    await this.page.waitForTimeout(300);
  }

  /**
   * Edit a todo
   */
  async editTodo(oldTitle: string, newTitle: string) {
    const todo = await this.findTodoByTitle(oldTitle);
    const editButton = todo.locator('..').getByRole('button', { name: /edit|✏️/i }).first();
    await editButton.click();
    
    // Wait for edit modal/form
    await this.page.waitForTimeout(300);
    
    // Clear and fill new title
    const titleInput = this.page.locator('input[value*="' + oldTitle + '"]').first();
    await titleInput.clear();
    await titleInput.fill(newTitle);
    
    // Save changes
    await this.page.getByRole('button', { name: /save|update/i }).first().click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Add a subtask to a todo
   */
  async addSubtask(todoTitle: string, subtaskTitle: string) {
    const todo = await this.findTodoByTitle(todoTitle);
    
    // Expand subtasks section if collapsed
    const expandButton = todo.locator('..').getByRole('button', { name: /subtask|expand/i }).first();
    if (await expandButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expandButton.click();
      await this.page.waitForTimeout(300);
    }
    
    // Find subtask input and add button
    const subtaskInput = this.page.locator('input[placeholder*="subtask" i]').first();
    await subtaskInput.fill(subtaskTitle);
    
    const addSubtaskButton = this.page.getByRole('button', { name: /add subtask/i }).first();
    await addSubtaskButton.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Create a new tag
   */
  async createTag(name: string, color: string = '#3b82f6') {
    // Open tag management modal
    await this.page.getByRole('button', { name: /manage tags/i }).click();
    await this.page.waitForTimeout(300);
    
    // Fill tag name and color
    await this.page.fill('input[placeholder*="tag name" i]', name);
    
    const colorInput = this.page.locator('input[type="color"]').first();
    if (await colorInput.isVisible()) {
      await colorInput.fill(color);
    }
    
    // Create tag
    await this.page.getByRole('button', { name: /create tag|add tag/i }).first().click();
    await this.page.waitForTimeout(300);
    
    // Close modal
    const closeButton = this.page.getByRole('button', { name: /close|×/i }).first();
    await closeButton.click();
  }

  /**
   * Assign a tag to a todo
   */
  async assignTagToTodo(todoTitle: string, tagName: string) {
    const todo = await this.findTodoByTitle(todoTitle);
    const editButton = todo.locator('..').getByRole('button', { name: /edit/i }).first();
    await editButton.click();
    await this.page.waitForTimeout(300);
    
    // Find and check the tag checkbox
    const tagCheckbox = this.page.getByLabel(tagName, { exact: false });
    if (await tagCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tagCheckbox.check();
    }
    
    // Save changes
    await this.page.getByRole('button', { name: /save|update/i }).first().click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Save current todo as template
   */
  async saveAsTemplate(todoTitle: string, templateName: string, category?: string) {
    const todo = await this.findTodoByTitle(todoTitle);
    const saveTemplateButton = todo.locator('..').getByRole('button', { name: /template|save/i }).first();
    await saveTemplateButton.click();
    await this.page.waitForTimeout(300);
    
    // Fill template details
    await this.page.fill('input[placeholder*="template name" i]', templateName);
    
    if (category) {
      await this.page.fill('input[placeholder*="category" i]', category);
    }
    
    // Save template
    await this.page.getByRole('button', { name: /save template/i }).first().click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Use a template to create a todo
   */
  async useTemplate(templateName: string) {
    await this.page.getByRole('button', { name: /use template/i }).click();
    await this.page.waitForTimeout(300);
    
    // Find and click the template
    const template = this.page.getByText(templateName, { exact: false });
    await template.click();
    
    // Confirm template usage
    const useButton = this.page.getByRole('button', { name: /use|create/i }).first();
    await useButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Navigate to calendar view
   */
  async goToCalendar() {
    await this.page.getByRole('link', { name: /calendar|📅/i }).click();
    await this.page.waitForURL('/calendar');
  }

  /**
   * Export todos
   */
  async exportTodos(): Promise<string> {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.getByRole('button', { name: /export/i }).click();
    const download = await downloadPromise;
    
    // Get the downloaded file content
    const path = await download.path();
    return path || '';
  }

  /**
   * Import todos from JSON
   */
  async importTodos(jsonContent: string) {
    // Create a temporary file
    const buffer = Buffer.from(jsonContent, 'utf-8');
    
    // Set up file chooser
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.getByRole('button', { name: /import/i }).click();
    
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'import.json',
      mimeType: 'application/json',
      buffer: buffer,
    });
    
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if notification permission is granted
   */
  async enableNotifications() {
    const enableButton = this.page.getByRole('button', { name: /enable notifications/i });
    if (await enableButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Grant notification permission via context
      await this.page.context().grantPermissions(['notifications']);
      await enableButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Filter todos by priority
   */
  async filterByPriority(priority: 'high' | 'medium' | 'low' | 'all') {
    const priorityFilter = this.page.locator('select').filter({ hasText: /priority/i }).first();
    await priorityFilter.selectOption(priority);
    await this.page.waitForTimeout(300);
  }

  /**
   * Filter todos by tag
   */
  async filterByTag(tagName: string) {
    const tagBadge = this.page.getByText(tagName, { exact: false }).first();
    await tagBadge.click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Search todos
   */
  async searchTodos(query: string) {
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.fill(query);
    await this.page.waitForTimeout(300);
  }

  /**
   * Clear all filters
   */
  async clearFilters() {
    const clearButton = this.page.getByRole('button', { name: /clear filter/i });
    if (await clearButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clearButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Format date for datetime-local input
   */
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Wait for API response
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout: number = 5000) {
    await this.page.waitForResponse(
      response => {
        const url = response.url();
        if (typeof urlPattern === 'string') {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout }
    );
  }

  /**
   * Get count of todos in a section
   */
  async getTodoCount(section: 'overdue' | 'active' | 'completed'): Promise<number> {
    const sectionHeading = this.page.getByRole('heading', { name: new RegExp(section, 'i') });
    const todos = sectionHeading.locator('..').locator('[data-todo-item]');
    return await todos.count();
  }

  /**
   * Verify todo exists
   */
  async verifyTodoExists(title: string): Promise<boolean> {
    const todo = await this.findTodoByTitle(title);
    return await todo.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Verify todo does not exist
   */
  async verifyTodoNotExists(title: string): Promise<boolean> {
    const todo = await this.findTodoByTitle(title);
    return !(await todo.isVisible({ timeout: 1000 }).catch(() => false));
  }
}
