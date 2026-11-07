import { test, expect } from '@playwright/test';

// Toolchain check only. The real smoke test (TC1 -> result -> PDF) comes in Phase 7.
test('app shell loads with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/');
  await expect(page.locator('#root main')).toHaveCount(1);
  expect(errors).toEqual([]);
});
