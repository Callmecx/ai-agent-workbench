import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Conversation } from '../shared/types';

const routes = ['chat', 'knowledge', 'retrieval', 'tools', 'prompts', 'monitoring', 'settings'];
async function ready(page: Page, route: string) {
  await page.goto(`/${route}?presentation=1`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('API connected', { exact: true })).toHaveText('API connected');
  await page.evaluate(() => document.fonts.ready);
}
async function shot(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await page
    .locator(':focus')
    .evaluateAll((elements) => elements.forEach((el) => (el as HTMLElement).blur()));
  await page.screenshot({ path: `docs/screenshots/${name}.png`, animations: 'disabled' });
}

test('portfolio screenshots show completed workflows with isolated demo data', async ({
  page,
  request,
}) => {
  mkdirSync('docs/screenshots', { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // This isolated API fixture is explicitly a sample conversation, not a model evaluation.
  const list = await (await request.get('/api/conversations')).json();
  const sample = list.data.find((c: Conversation) => c.id === 'welcome') as Conversation;
  sample.messages = sample.messages.filter((m) => m.role !== 'system');
  sample.messages[1]!.content =
    '## Give every answer a source\n\nRetrieve relevant chunks, keep their source IDs, then pass that context to the model.\n\n```typescript\nconst sources = await retrieve(question);\nconst answer = await generate(question, sources);\n```\n\nSource cards make every claim easier to inspect.\n\n*Sample conversation · demo responses and retrieval.*';
  sample.messages[1]!.usage = undefined;
  sample.messages[1]!.latencyMs = undefined;
  expect((await request.put('/api/conversations/welcome', { data: sample })).ok()).toBeTruthy();
  await ready(page, 'chat');
  await expect(page.getByRole('heading', { name: 'Give every answer a source' })).toBeVisible();
  await expect(page.getByText('Diagnostics', { exact: true })).not.toBeVisible();
  await shot(page, 'chat');
  await page.getByRole('button', { name: 'New conversation', exact: true }).click();
  await expect(page.locator('.suggestion-grid button')).toHaveCount(4);
  const suggestionBounds = await page.locator('.suggestion-grid').boundingBox();
  const composerBounds = await page.locator('.composer').boundingBox();
  expect(suggestionBounds!.y + suggestionBounds!.height).toBeLessThan(composerBounds!.y);
  await shot(page, 'chat-welcome');
  await page.getByRole('button', { name: /Understand the market/ }).click();
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toHaveValue(
    /market analysis/,
  );
  await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeFocused();
  await page.getByRole('link', { name: 'Context', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Retrieval Debug', exact: true })).toBeVisible();

  await ready(page, 'knowledge');
  await expect(page.getByText('workbench-architecture.md', { exact: true })).toBeVisible();
  await shot(page, 'knowledge');
  await ready(page, 'retrieval');
  await page.getByRole('button', { name: 'Search knowledge', exact: true }).click();
  await expect(page.locator('.retrieval-card')).not.toHaveCount(0);
  await expect(page.getByRole('meter').first()).toBeVisible();
  await shot(page, 'retrieval');
  await page.getByRole('button', { name: 'Generate answer' }).click();
  await expect(page.locator('.answer-panel .markdown')).toContainText('Source');
  await expect(page.getByRole('button', { name: 'Stop generation', exact: true })).not.toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator('.citations .citation').first()).toBeVisible();
  await page.locator('.answer-panel').scrollIntoViewIfNeeded();
  await shot(page, 'retrieval-answer');

  await ready(page, 'tools');
  await page.getByRole('button', { name: /calculate/ }).click();
  await page.getByRole('button', { name: 'Run workflow', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Calculation complete' })).toBeVisible();
  await expect(page.locator('.trace-step.complete')).toHaveCount(6);
  await page.getByText('Arguments · 1 field', { exact: true }).click();
  await expect(page.locator('.trace-content .markdown code').first()).toContainText('expression');
  await page.getByText('Arguments · 1 field', { exact: true }).click();
  await shot(page, 'agent');

  await ready(page, 'prompts');
  await page
    .getByRole('textbox', { name: 'Variable topic', exact: true })
    .fill('evidence-based AI applications');
  await page.getByRole('button', { name: 'Save version', exact: true }).click();
  await expect(page.getByText('Version saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Test prompt', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).not.toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator('.prompt-test .markdown')).toContainText('A practical starting point');
  await expect(page.getByText('Version saved', { exact: true })).not.toBeVisible();
  await shot(page, 'prompt');
  await ready(page, 'monitoring');
  await expect(page.locator('canvas')).toHaveCount(7);
  await expect(page.locator('.stat-value').first()).not.toHaveText('0');
  await shot(page, 'monitoring');
  await ready(page, 'settings');
  await shot(page, 'settings');
  await page.getByRole('button', { name: /Dark A softer view/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await shot(page, 'settings-dark');
  await ready(page, 'chat');
  await page.getByRole('button', { name: /Designing a grounded AI assistant/ }).click();
  await shot(page, 'chat-dark');
  await ready(page, 'monitoring');
  await expect(page.locator('canvas')).toHaveCount(7);
  await shot(page, 'monitoring-dark');
  expect(errors).toEqual([]);
});

test('all pages fit 1440, 1280, 1024 and mobile in both themes', async ({ page }) => {
  const failures: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await ready(page, 'settings');
    await page
      .getByRole('button', { name: theme === 'dark' ? /Dark A softer view/ : /Light Clear/ })
      .click();
    for (const width of [1440, 1280, 1024, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await ready(page, route);
        const dimensions = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          content: document.documentElement.scrollWidth,
        }));
        if (dimensions.content > dimensions.width + 1)
          failures.push(`${theme}/${width}/${route}: ${JSON.stringify(dimensions)}`);
        if (route === 'chat' && width >= 1024) {
          const bounds = await page.locator('.composer').boundingBox();
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
        }
        if (theme === 'light' && [1024, 1280, 390].includes(width) && route === 'chat')
          await shot(page, `chat-${width}`);
      }
    }
  }
  mkdirSync('test-results/visual', { recursive: true });
  writeFileSync(
    'test-results/visual/responsive.json',
    JSON.stringify(
      { viewports: [1440, 1280, 1024, 390], themes: ['light', 'dark'], routes, failures, errors },
      null,
      2,
    ),
  );
  expect(failures).toEqual([]);
  expect(errors).toEqual([]);
});

test('theme text contrast and narrow-screen navigation stay usable', async ({ page }) => {
  const contrasts: unknown[] = [];
  for (const theme of ['light', 'dark']) {
    await ready(page, 'settings');
    await page
      .getByRole('button', { name: theme === 'dark' ? /Dark A softer view/ : /Light Clear/ })
      .click();
    const values = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      const lum = (hex: string) => {
        const channels = hex
          .trim()
          .slice(1)
          .match(/.{2}/g)!
          .map((c) => parseInt(c, 16) / 255)
          .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
        return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
      };
      return ['--text-primary', '--text-secondary', '--text-tertiary', '--accent-primary'].map(
        (name) => {
          const a = lum(css.getPropertyValue(name));
          const b = lum(css.getPropertyValue('--surface-primary'));
          return { name, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
        },
      );
    });
    contrasts.push({ theme, values });
    values.forEach((v) => expect(v.ratio, `${theme} ${v.name}`).toBeGreaterThanOrEqual(4.5));
  }
  mkdirSync('test-results/visual', { recursive: true });
  writeFileSync('test-results/visual/contrast.json', JSON.stringify(contrasts, null, 2));
  await page.setViewportSize({ width: 1024, height: 900 });
  await ready(page, 'chat');
  await expect(page.locator('.config-panel')).not.toBeVisible();
  await page.getByRole('button', { name: 'Configuration', exact: true }).click();
  await expect(page.locator('.config-panel')).toBeVisible();
  await page.getByRole('button', { name: 'Close configuration' }).click();
  await expect(page.locator('.config-panel')).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Conversation history' }).click();
  await expect(page.locator('.conversation-panel')).toBeVisible();
  await page.getByRole('button', { name: /Designing a grounded AI assistant/ }).click();
  await expect(page.locator('.conversation-panel')).not.toBeVisible();
});
