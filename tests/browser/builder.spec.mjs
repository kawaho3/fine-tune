import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

// Resolve the ZIP reader from the API workspace that declares the dependency.
const { unzipSync, strFromU8 } = createRequire(new URL('../../apps/builder-api/package.json', import.meta.url))('fflate');

test('prompt, plan, inert preview and HTML download use the actual generation response', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#download')).toBeDisabled();
  const resultPromise = page.waitForResponse((response) => response.url().endsWith('/api/generate'));
  await page.getByRole('button', { name: 'Boutique store' }).click();
  await page.locator('#generate').click();
  const result = await (await resultPromise).json();
  await expect(page.locator('#status')).toContainText('Mock preview created');
  await expect(page.locator('#template-label')).toContainText('Boutique Store');
  await expect(page.locator('#plan .plan-step')).toHaveCount(3);
  await expect(page.locator('#preview')).toHaveAttribute('sandbox', '');
  await expect(page.frameLocator('#preview').getByRole('heading', { level: 1 })).toHaveText('Thoughtful finds for everyday living.');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('index.html');
  expect(await readFile(await download.path(), 'utf8')).toBe(result.files.find((file) => file.path === 'index.html').content);
  await page.screenshot({ path: testInfo.outputPath('builder.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('complete ZIP download matches the preview even after the prompt is edited', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#download-project')).toBeDisabled();
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/api/generate'));
  await page.locator('#generate').click();
  const result = await (await responsePromise).json();
  await expect(page.locator('#download-project')).toBeEnabled();
  await page.locator('#prompt').fill('Create a completely different coffee shop website');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download-project').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  const files = unzipSync(new Uint8Array(await readFile(await download.path())));
  expect(Object.keys(files).sort()).toEqual(result.files.map((file) => file.path).sort());
  for (const file of result.files) expect(strFromU8(files[file.path])).toBe(file.content);
});

test('generation errors clear stale preview and downloads, then recover', async ({ page }) => {
  await page.goto('/');
  await page.locator('#generate').click();
  await expect(page.locator('#download')).toBeEnabled();
  await page.route('**/api/generate', (route) => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Fixture service unavailable.' }),
  }));
  await page.locator('#generate').click();
  await expect(page.locator('#status')).toHaveText('Fixture service unavailable.');
  await expect(page.locator('#preview')).not.toHaveAttribute('srcdoc');
  await expect(page.locator('#download')).toBeDisabled();
  await expect(page.locator('#download-project')).toBeDisabled();
  await page.unroute('**/api/generate');
  await page.locator('#generate').click();
  await expect(page.locator('#download-project')).toBeEnabled();
});

test('export failure keeps the preview and HTML available and can be retried', async ({ page }) => {
  await page.goto('/');
  await page.locator('#generate').click();
  await expect(page.locator('#download-project')).toBeEnabled();
  await page.route('**/api/export', (route) => route.fulfill({
    status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Export fixture unavailable.' }),
  }));
  await page.locator('#download-project').click();
  await expect(page.locator('#status')).toHaveText('Export fixture unavailable.');
  await expect(page.locator('#download')).toBeEnabled();
  await expect(page.locator('#download-project')).toBeEnabled();
  await expect(page.frameLocator('#preview').getByRole('heading', { level: 1 })).toBeVisible();
  await page.unroute('**/api/export');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download-project').click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.zip$/);
});

test('untrusted prompt stays text in an opaque-origin script-disabled preview', async ({ page }) => {
  await page.goto('/');
  await page.locator('#prompt').fill('Build a store <script>parent.document.body.innerHTML="COMPROMISED"</script>');
  await page.locator('#generate').click();
  await expect(page.locator('#download')).toBeEnabled();
  await expect(page.frameLocator('#preview').locator('footer .notice')).toContainText('<script>');
  await expect(page.frameLocator('#preview').locator('script')).toHaveCount(0);
  await expect(page.locator('#builder-form')).toBeVisible();
  const canReadParent = await page.locator('#preview').evaluate((frame) => frame.contentDocument !== null);
  expect(canReadParent).toBe(false);
});

test('mobile example flow has visible controls and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Neighborhood cafe' }).click();
  await page.locator('#generate').click();
  await expect(page.locator('#template-label')).toContainText('Neighborhood Cafe');
  await expect(page.locator('#download-project')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
