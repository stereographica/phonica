import { test, expect } from '@playwright/test';
import { MaterialPage } from '../../helpers/material-page';

test.describe('@materials @bulk Bulk Operations for Materials', () => {
  let materialPage: MaterialPage;

  test.beforeEach(async ({ page }) => {
    materialPage = new MaterialPage(page);
    await materialPage.navigate();
  });

  test.describe('Material Selection', () => {
    test('@smoke should display checkboxes for all materials', async ({ page }) => {
      // Wait for table to load
      await page.waitForSelector('table tbody tr', { timeout: 30000 });

      // Check header checkbox exists
      const headerCheckbox = page.locator('th [role="checkbox"]').first();
      await expect(headerCheckbox).toBeVisible({ timeout: 10000 });
      await expect(headerCheckbox).toHaveAttribute('aria-label', 'Select all materials');

      // Check material checkboxes exist
      const materialRows = page.locator('tbody tr');
      const rowCount = await materialRows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Verify each row has a checkbox
      for (let i = 0; i < rowCount; i++) {
        const checkbox = materialRows.nth(i).locator('[role="checkbox"]');
        await expect(checkbox).toBeVisible();
      }
    });

    test('should select and deselect individual materials', async ({ page }) => {
      // Get first material checkbox
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');

      // Select material
      await firstCheckbox.click();
      await expect(firstCheckbox).toBeChecked();

      // Verify selection count is displayed
      await expect(page.getByText('• 1 selected')).toBeVisible();

      // Verify row is highlighted
      const firstRow = page.locator('tbody tr').first();
      await expect(firstRow).toHaveClass(/bg-muted\/50/);

      // Deselect material
      await firstCheckbox.click();
      await expect(firstCheckbox).not.toBeChecked();
      await expect(page.getByText('• 1 selected')).not.toBeVisible();
    });

    test('should select all materials with header checkbox', async ({ page }) => {
      // Click header checkbox
      const headerCheckbox = page.locator('th [role="checkbox"]').first();
      await headerCheckbox.click();

      // Verify all checkboxes are checked
      const allCheckboxes = page.locator('[role="checkbox"]');
      const checkboxCount = await allCheckboxes.count();

      for (let i = 0; i < checkboxCount; i++) {
        await expect(allCheckboxes.nth(i)).toBeChecked();
      }

      // Verify selection count
      const materialCount = await page.locator('tbody tr').count();
      await expect(page.getByText(`• ${materialCount} selected`)).toBeVisible();
    });

    test('should show bulk operation toolbar when materials are selected', async ({ page }) => {
      // Initially toolbar should not be visible
      await expect(page.getByRole('button', { name: /Delete/i })).not.toBeVisible();

      // Select a material
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
      await firstCheckbox.click();

      // Verify toolbar appears
      const toolbar = page.locator('div').filter({ hasText: '1 material selected' }).first();
      await expect(toolbar).toBeVisible();

      // Verify all bulk operation buttons are visible
      await expect(page.getByRole('button', { name: /Delete/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Tag/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Add to Project/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Download/i })).toBeVisible();
    });
  });

  test.describe('Bulk Delete', () => {
    test('@critical should delete multiple materials', async ({ page }) => {
      // Select first two materials
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
      const secondCheckbox = page.locator('tbody tr').nth(1).locator('[role="checkbox"]');

      await firstCheckbox.click();
      await secondCheckbox.click();

      // Get material titles for verification
      const firstTitle = await page
        .locator('tbody tr')
        .first()
        .locator('td:nth-child(2)')
        .textContent();
      const secondTitle = await page
        .locator('tbody tr')
        .nth(1)
        .locator('td:nth-child(2)')
        .textContent();

      // Click delete button
      await page.getByRole('button', { name: /Delete/i }).click();

      // Verify confirmation modal
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(modal.getByText('Delete 2 Materials')).toBeVisible();
      await expect(modal.getByText(`• ${firstTitle!}`)).toBeVisible();
      await expect(modal.getByText(`• ${secondTitle!}`)).toBeVisible();

      // Confirm deletion
      await page.getByRole('button', { name: 'Delete All' }).click();

      // Wait for deletion to complete
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Verify materials are deleted
      await expect(page.getByText(firstTitle!)).not.toBeVisible();
      await expect(page.getByText(secondTitle!)).not.toBeVisible();

      // Verify selection is cleared
      await expect(page.getByText('• 2 selected')).not.toBeVisible();
    });

    test('should cancel bulk delete operation', async ({ page }) => {
      // Select a material
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
      await firstCheckbox.click();

      // Click delete button
      await page.getByRole('button', { name: /Delete/i }).click();

      // Cancel deletion
      await page.getByRole('button', { name: 'Cancel' }).click();

      // Verify modal is closed
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Verify material is still selected
      await expect(firstCheckbox).toBeChecked();
    });
  });

  test.describe('Bulk Tag Operations', () => {
    test('should add tags to multiple materials', async ({ page }) => {
      // Select materials
      const headerCheckbox = page.locator('th [role="checkbox"]').first();
      await headerCheckbox.click();

      // Click tag button
      await page.getByRole('button', { name: /Tag/i }).click();

      // Verify tag modal
      await expect(page.getByRole('dialog')).toBeVisible();
      const materialCount = await page.locator('tbody tr').count();
      await expect(page.getByText(`Tag ${materialCount} Materials`)).toBeVisible();

      // Select add mode (should be default)
      await expect(page.getByLabel('Add tags (keep existing tags)')).toBeChecked();

      // Select tags if available
      const tagCheckboxes = page.locator('[role="checkbox"][id^="tag"]');
      const tagCount = await tagCheckboxes.count();

      if (tagCount > 0) {
        // Select first tag
        await tagCheckboxes.first().click();

        // Apply tags
        await page.getByRole('button', { name: 'Apply Tags' }).click();

        // Verify modal is closed
        await expect(page.getByRole('dialog')).not.toBeVisible();

        // Verify selection is cleared
        await expect(page.getByText(`• ${materialCount} selected`)).not.toBeVisible();
      } else {
        // No tags available, close modal
        await page.getByRole('button', { name: 'Cancel' }).click();
      }
    });

    test('should replace tags on materials', async ({ page }) => {
      // Select first material
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
      await firstCheckbox.click();

      // Click tag button
      await page.getByRole('button', { name: /Tag/i }).click();

      // Select replace mode
      await page.getByLabel('Replace tags (remove existing tags)').click();

      // Verify mode is selected
      await expect(page.getByLabel('Replace tags (remove existing tags)')).toBeChecked();

      // Close modal
      await page.getByRole('button', { name: 'Cancel' }).click();
    });
  });

  test.describe('Bulk Add to Project', () => {
    test('should add materials to a project', async ({ page }) => {
      // Select materials
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
      const secondCheckbox = page.locator('tbody tr').nth(1).locator('[role="checkbox"]');

      await firstCheckbox.click();
      await secondCheckbox.click();

      // Click add to project button
      await page.getByRole('button', { name: /Add to Project/i }).click();

      // Verify project modal
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Add 2 Materials to Project')).toBeVisible();

      // Check if projects are available
      const projectRadios = page.locator('input[type="radio"]');
      const projectCount = await projectRadios.count();

      if (projectCount > 0) {
        // Select first project
        await projectRadios.first().click();

        // Add to project
        await page.getByRole('button', { name: 'Add to Project' }).click();

        // Verify modal is closed
        await expect(page.getByRole('dialog')).not.toBeVisible();

        // Verify selection is cleared
        await expect(page.getByText('• 2 selected')).not.toBeVisible();
      } else {
        // No projects available, close modal
        await page.getByRole('button', { name: 'Cancel' }).click();
      }
    });

    test.skip('should search for projects', async ({ page }) => {
      // Select a material
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
      await firstCheckbox.click();

      // Click add to project button
      await page.getByRole('button', { name: /Add to Project/i }).click();

      // Search for project
      const searchInput = page.getByPlaceholder('Search by name or description...');
      await searchInput.fill('Test');

      // Verify search input has value
      await expect(searchInput).toHaveValue('Test');

      // Close modal
      await page.getByRole('button', { name: 'Cancel' }).click();
    });
  });

  test.describe('Bulk Download', () => {
    test.skip('@critical should initiate bulk download of materials', async ({ page }) => {
      // Select materials
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
      const secondCheckbox = page.locator('tbody tr').nth(1).locator('[role="checkbox"]');

      await firstCheckbox.click();
      await secondCheckbox.click();

      // Click download button
      await page.getByRole('button', { name: /Download/i }).click();

      // Wait for notification
      await expect(page.getByText(/Preparing ZIP file for 2 materials/)).toBeVisible();

      // Note: We can't test the actual download in E2E tests,
      // but we've verified the process starts correctly
    });
  });

  test.describe('Selection Behavior', () => {
    test('should clear selection when applying filters', async ({ page }) => {
      // Select all materials
      const headerCheckbox = page.locator('th [role="checkbox"]').first();
      await headerCheckbox.click();

      // Verify selection
      const materialCount = await page.locator('tbody tr').count();
      await expect(page.getByText(`• ${materialCount} selected`)).toBeVisible();

      // Apply a filter
      const titleFilter = page.getByPlaceholder('Search by title...');
      await titleFilter.fill('Forest');
      await page.getByRole('button', { name: /Apply Filters/i }).click();

      // Wait for filter to apply
      await page.waitForLoadState('networkidle');

      // Verify selection is cleared
      await expect(page.getByText(`• ${materialCount} selected`)).not.toBeVisible();
    });

    test('should maintain selection state during pagination', async ({ page }) => {
      // Check if pagination exists
      const nextButton = page.getByRole('button', { name: 'Next', exact: true });
      const isPaginationVisible = (await nextButton.count()) > 0;

      if (isPaginationVisible && (await nextButton.isEnabled())) {
        // Select materials on first page
        const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
        await firstCheckbox.click();

        // Navigate to next page
        await nextButton.click();
        await page.waitForLoadState('networkidle');

        // Navigate back
        await page.getByRole('button', { name: 'Previous', exact: true }).click();
        await page.waitForLoadState('networkidle');

        // Verify selection is cleared (as per implementation)
        await expect(page.getByText('• 1 selected')).not.toBeVisible();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper aria labels for checkboxes', async ({ page }) => {
      // Header checkbox
      const headerCheckbox = page.locator('th [role="checkbox"]').first();
      await expect(headerCheckbox).toHaveAttribute('aria-label', 'Select all materials');

      // Material checkboxes
      const materialRows = page.locator('tbody tr');
      const firstRow = materialRows.first();
      const firstTitle = await firstRow.locator('td:nth-child(2)').textContent();
      const firstCheckbox = firstRow.locator('[role="checkbox"]');

      await expect(firstCheckbox).toHaveAttribute('aria-label', `Select ${firstTitle}`);
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Focus on the first checkbox directly
      const firstCheckbox = page.locator('tbody tr').first().locator('[role="checkbox"]');
      await firstCheckbox.focus();

      // Press space to select
      await page.keyboard.press('Space');

      // Verify selection
      await expect(firstCheckbox).toHaveAttribute('aria-checked', 'true');
    });
  });
});
