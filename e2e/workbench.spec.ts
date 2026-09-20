import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
test('seven routes render, refresh, and remain free of runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const routes = [
    ['chat', 'AI Chat'],
    ['knowledge', 'Knowledge Base'],
    ['retrieval', 'Retrieval Debug'],
    ['tools', 'Agent Tools'],
    ['prompts', 'Prompt Lab'],
    ['monitoring', 'Monitoring'],
    ['settings', 'Settings'],
  ];
  mkdirSync('test-results/smoke', { recursive: true });
  for (const [route, heading] of routes) {
    await page.goto(`/${route}`);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByText('API connected', { exact: true })).toBeVisible();
    if (route === 'monitoring') await expect(page.locator('canvas').first()).toBeVisible();
    await page.screenshot({ path: `test-results/smoke/${route}.png`, fullPage: true });
    await page.reload();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test('chat streams, stops, retries, persists and switches conversations', async ({ page }) => {
  await page.goto('/chat');
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('Explain streaming cancellation.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('Streaming response', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop generation', exact: true }).click();
  await expect(page.getByText('Generation stopped · partial response retained')).toBeVisible();
  await page.getByRole('button', { name: 'Regenerate response' }).click();
  await expect(page.getByRole('button', { name: 'Stop generation', exact: true })).not.toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText('A practical starting point', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Explain streaming cancellation.', { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole('button', { name: /Designing a grounded AI assistant/ }).click();
  await expect(page.getByText('Give every answer a source', { exact: true })).toBeVisible();
});
test('mock failure is recoverable with Retry', async ({ page }) => {
  await page.goto('/chat');
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await page.getByText('Diagnostics', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Next request behavior' }).press('Enter');
  await page.getByRole('option', { name: 'Simulate provider error' }).click();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Test retry recovery');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByText('Show details', { exact: true }).click();
  await expect(page.getByText('MOCK_ERROR', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Streaming response', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop generation', exact: true })).not.toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText('MOCK_ERROR', { exact: true })).not.toBeVisible();
});
test('knowledge upload indexes actual text and retrieval produces cited answer', async ({
  page,
}) => {
  await page.goto('/knowledge');
  await page.getByTestId('knowledge-upload').setInputFiles({
    name: 'smoke-retrieval.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(
      'Workbench retrieval finds source chunks. Streaming cancellation uses AbortController. These documents provide traceable evidence.',
    ),
  });
  await expect(page.getByText('smoke-retrieval.md', { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'smoke-retrieval.md' })
      .getByText('READY', { exact: true })
      .first(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Retrieval Debug', exact: true }).click();
  await page.getByRole('textbox', { name: 'Retrieval query' }).fill('retrieval');
  await page.getByRole('button', { name: 'Search knowledge' }).click();
  await expect(page.getByRole('button', { name: 'Generate answer' })).toBeVisible();
  await page.getByRole('button', { name: 'Generate answer' }).click();
  await expect(page.getByRole('heading', { name: '03 · Generated answer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop generation', exact: true })).not.toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText('Source 1', { exact: true })).toBeVisible();
});
test('tool workflow succeeds, fails and recovers', async ({ page }) => {
  await page.goto('/tools');
  await page.getByRole('button', { name: /calculate/ }).click();
  await page.getByRole('button', { name: 'Run workflow' }).click();
  await expect(page.getByText('Calculation complete', { exact: true })).toBeVisible();
  await expect(page.locator('.trace-step').last().getByText('576', { exact: true })).toBeVisible();
  await page.getByText('Diagnostics', { exact: true }).click();
  await page.getByText('Simulate tool failure', { exact: true }).click();
  await page.getByRole('button', { name: 'Run workflow' }).click();
  await page.getByText('Show details', { exact: true }).click();
  await expect(page.getByText('TOOL_FAILED', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Calculation complete', { exact: true })).toBeVisible();
});
test('prompt variables render, version saves, and test streams', async ({ page }) => {
  await page.goto('/prompts');
  await page.getByRole('textbox', { name: 'Variable topic', exact: true }).fill('streaming UX');
  await page.getByRole('button', { name: 'Save version' }).click();
  await expect(page.getByText('Version saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Test prompt' }).click();
  await expect(
    page.getByText(
      'Help me understand streaming UX. Respond in English with a structured explanation.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).not.toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText('A practical starting point', { exact: true })).toBeVisible();
});
test('settings theme and mobile navigation work', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: /Dark A softer view/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: /Light Clear/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Toggle sidebar' }).click();
  await expect(page.getByRole('link', { name: 'Knowledge Base', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Knowledge Base', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Knowledge Base', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/smoke/mobile.png', fullPage: true });
});
test('chat timeout has explicit state and can be retried', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('spinbutton', { name: 'Request timeout' }).fill('1000');
  await page.getByRole('spinbutton', { name: 'Request timeout' }).press('Tab');
  await page.goto('/chat');
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await page.getByText('Diagnostics', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Next request behavior' }).press('Enter');
  await page.getByRole('option', { name: 'Simulate timeout' }).click();
  await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Timeout recovery test');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByText('Show details', { exact: true }).click();
  await expect(page.getByText('TIMEOUT', { exact: true })).toBeVisible();
  await page.goto('/settings');
  await page.getByRole('spinbutton', { name: 'Request timeout' }).fill('60000');
  await page.getByRole('spinbutton', { name: 'Request timeout' }).press('Tab');
  await page.goto('/chat');
  await page.getByRole('button', { name: 'Regenerate response' }).click();
  await expect(page.getByText('Streaming response', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop generation', exact: true })).not.toBeVisible({
    timeout: 20000,
  });
});
test('route change aborts generation and leaves chat usable', async ({ page }) => {
  await page.goto('/chat');
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Message', exact: true })
    .fill('Navigate while streaming');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('Streaming response', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Knowledge Base', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Knowledge Base', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'AI Chat 01', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeEnabled();
  await expect(page.getByText('Generation stopped · partial response retained')).toBeVisible();
});
test('failed documents expose a parsing retry and empty search has a helpful state', async ({
  page,
}) => {
  await page.goto('/knowledge');
  await page
    .getByTestId('knowledge-upload')
    .setInputFiles({ name: 'empty-smoke.txt', mimeType: 'text/plain', buffer: Buffer.from('') });
  await expect(page.getByText('Document has no readable text.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Retry parsing', exact: true }).last().click();
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'empty-smoke.txt' })
      .getByText('FAILED', { exact: true })
      .first(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Retrieval Debug', exact: true }).click();
  await page.getByRole('textbox', { name: 'Retrieval query' }).fill('qzvzxk928381');
  await page.getByRole('button', { name: 'Search knowledge' }).click();
  await expect(page.getByRole('heading', { name: 'No matching chunks' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate answer' })).not.toBeVisible();
});
