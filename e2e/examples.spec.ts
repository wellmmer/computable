import { expect, test } from '@playwright/test';
import { openSimulator, pickExample, runFast } from './helpers';

test.describe('the examples (spec 5.3 and R3 spec 5)', () => {
  test('Binary +1 accepts after 8 steps with 1100 on the tape', async ({ page }) => {
    await openSimulator(page);
    for (let i = 0; i < 8; i++) await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect(page.getByTestId('result-line')).toHaveText('Accepted after 8 steps. The tape now reads 1100.');
  });

  test('the palindrome checker accepts its input 0110', async ({ page }) => {
    await openSimulator(page);
    await pickExample(page, 'Palindrome checker');
    await expect(await runFast(page)).toHaveText('Accepted after 15 steps. The tape is now blank.');
  });

  test('the 2016 machine accepts after 71 steps', async ({ page }) => {
    await openSimulator(page);
    await pickExample(page, 'TCC machine (2016)');
    await expect(await runFast(page)).toHaveText('Accepted after 71 steps. The tape now reads _WYZX_WYZX_.');
  });

  test("Turing's 1936 machine pauses at the step limit", async ({ page }) => {
    await openSimulator(page);
    await pickExample(page, 'Turing 1936: 0 1 0 1…');
    await expect(await runFast(page)).toHaveText('Paused after 10,000 steps. This machine may never halt. Continue?', { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
  });

  test('the one-rotor cipher turns AAAA into BCCD, and its note links to the Enigma lab', async ({ page }) => {
    await openSimulator(page);
    await pickExample(page, 'One-rotor cipher');
    const note = page.getByTestId('example-note');
    await expect(note).toContainText('26 × 26 = 676 rules');
    await expect(await runFast(page)).toHaveText('Accepted after 5 steps. The tape now reads BCCD.');
    await note.getByRole('link', { name: 'Enigma lab' }).click();
    await expect(page).toHaveURL(/\/en\/enigma$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Enigma lab');
  });

  test('in Portuguese, the one-rotor cipher turns DCBA into CBAD', async ({ page }) => {
    await page.goto('/pt-br/simulator');
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
    await page.getByRole('combobox', { name: 'Exemplo' }).selectOption({ label: 'Cifra de um rotor' });
    await expect(page.getByTestId('example-note')).toContainText('26 × 26 = 676 regras');
    await page.getByRole('textbox', { name: 'Entrada' }).fill('DCBA');
    await page.getByRole('slider', { name: 'Velocidade' }).fill('5');
    await page.getByRole('button', { name: 'Rodar', exact: true }).click();
    await expect(page.getByTestId('result-line')).toHaveText('Aceita após 5 passos. A fita agora diz CBAD.');
    await expect(page.getByTestId('example-note').getByRole('link', { name: 'laboratório da Enigma' })).toHaveAttribute(
      'href',
      '/pt-br/enigma',
    );
  });
});
