import { expect, test, type Page } from '@playwright/test';
import { openLab } from './helpers';

const strip = (page: Page, name: string) => page.getByRole('region', { name }).locator('[data-strip]');
const rotorWindow = (page: Page, rotor: string) => page.getByText(new RegExp(`^${rotor}, rotor [IV]+, shows [A-Z]$`));

test.describe('the Enigma lab (spec R3 3)', () => {
  test('types WETTERBERICHT on the physical keyboard and lights PBJGOLIZQMQGZ', async ({ page }) => {
    await openLab(page, '/en/enigma');
    await page.keyboard.type('wetterbericht');
    await expect(strip(page, 'You typed')).toHaveText('WETTE RBERI CHT');
    await expect(strip(page, 'Lamps lit')).toHaveText('PBJGO LIZQM QGZ');
    await expect(rotorWindow(page, 'Right rotor')).toHaveText('Right rotor, rotor III, shows N');
    await expect(page.getByRole('status')).toHaveText('Lamp Z');
    await expect(page.getByRole('heading', { name: 'Where the current went for T' })).toBeVisible();
    await expect(page.getByText('The plug pair HZ turned H into Z (red ring).')).toBeVisible();
  });

  test('Backspace removes the last letter and turns the rotors back', async ({ page }) => {
    await openLab(page, '/en/enigma');
    await page.keyboard.type('WET');
    await page.keyboard.press('Backspace');
    await expect(strip(page, 'You typed')).toHaveText('WE');
    await expect(rotorWindow(page, 'Right rotor')).toHaveText('Right rotor, rotor III, shows C');
    await expect(page.getByRole('status')).toHaveText('Removed T');
  });

  test('"Back to start" and the lit letters decrypt the message', async ({ page }) => {
    await openLab(page, '/en/enigma');
    await page.keyboard.type('WETTERBERICHT');
    await page.getByRole('button', { name: 'Back to start (B L A)' }).click();
    await expect(page.getByText('Lamps lit before you went back: PBJGO LIZQM QGZ')).toBeVisible();
    await page.keyboard.type('PBJGOLIZQMQGZ');
    await expect(strip(page, 'Lamps lit')).toHaveText('WETTE RBERI CHT');
  });

  test('a ▲ turn in the middle of a message starts a new message, which still decrypts', async ({ page }) => {
    await openLab(page, '/en/enigma');
    await page.keyboard.type('WE');
    await page.getByRole('button', { name: 'Middle rotor: next letter' }).click();
    await expect(page.getByText('Lamps lit before you turned a rotor: PB')).toBeVisible();
    await expect(strip(page, 'You typed')).toHaveText('');
    await page.keyboard.type('T');
    const lit = await strip(page, 'Lamps lit').textContent();
    await page.getByRole('button', { name: 'Back to start (B M C)' }).click();
    await page.keyboard.type(lit ?? '');
    await expect(strip(page, 'Lamps lit')).toHaveText('T');
  });

  test('the on-screen keys and the ▲ and ▼ buttons work', async ({ page }) => {
    await openLab(page, '/en/enigma');
    await page.getByRole('button', { name: 'Left rotor: previous letter' }).click();
    await page.getByRole('button', { name: 'Right rotor: next letter' }).click();
    await expect(page.getByRole('button', { name: 'Back to start (A L B)' })).toBeVisible();
    const keyboard = page.getByRole('group', { name: 'Keyboard' });
    await keyboard.getByRole('button', { name: 'Q' }).click();
    // Keys still type from the physical keyboard after a click on an on-screen key.
    await page.keyboard.type('Q');
    await expect(strip(page, 'You typed')).toHaveText('QQ');
  });

  test('copies the lit letters', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openLab(page, '/en/enigma');
    await page.keyboard.type('WETTERBERICHT');
    await page.getByRole('button', { name: 'Copy lit letters' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('PBJGO LIZQM QGZ');
  });

  test('the settings dialog changes the rotors and plug pairs, shows errors, and closes with Esc', async ({ page }) => {
    await openLab(page, '/en/enigma');
    const change = page.getByRole('button', { name: 'Change settings' });
    await change.click();
    const dialog = page.getByRole('dialog', { name: 'Change settings' });
    await dialog.getByRole('combobox', { name: 'Right rotor' }).selectOption('I');
    await expect(dialog.getByText('Rotor I is there twice. Use each rotor only once.')).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Right rotor' }).selectOption('VIII');
    const plugs = dialog.getByRole('group', { name: 'Plug pairs' });
    await plugs.getByRole('button', { name: 'E', exact: true }).click();
    await plugs.getByRole('button', { name: 'J', exact: true }).click();
    await plugs.getByRole('button', { name: 'A, joined to V' }).click();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden();
    await expect(change).toBeFocused();
    await expect(strip(page, 'You typed')).toHaveText('');
    const settings = page.getByRole('region', { name: 'Settings' });
    await expect(settings.getByText('I II VIII', { exact: true })).toBeVisible();
    await expect(settings.getByText('BS CG DL FU HZ IN KM OW RX EJ', { exact: true })).toBeVisible();

    await change.click();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(change).toBeFocused();
  });
});

test.describe('the messages under the lab (spec R3 4)', () => {
  test('loads practice 3, decrypts it from the physical keyboard, and checks the answer', async ({ page }) => {
    await openLab(page, '/en/enigma');
    await page.getByRole('button', { name: 'Load into the machine: Practice 3: plug pairs and rings' }).click();
    const box = page.getByRole('region', { name: 'Decrypting: Practice 3: plug pairs and rings' });
    await expect(box.getByRole('heading')).toBeFocused();
    await expect(page.getByRole('button', { name: 'Back to start (Z O O)' })).toBeVisible();
    await page.keyboard.type('XMIWIPCLAIMUPHVNBXSLNFBESKQMR');
    await box.getByRole('button', { name: 'Check my answer' }).click();
    await expect(box.getByText('Right! The message says: A LETTER NEVER BECOMES ITSELF')).toBeVisible();
  });

  test('types Barbarossa part 1, and the lamps light the published plain text', async ({ page }) => {
    await openLab(page, '/en/enigma');
    await page.getByRole('button', { name: 'Load part 1: Operation Barbarossa, 1941' }).click();
    await page.getByRole('button', { name: 'Type it for me' }).click();
    await expect(strip(page, 'Lamps lit')).toHaveText(
      'AUFKL XABTE ILUNG XVONX KURTI NOWAX KURTI NOWAX NORDW ESTLX SEBEZ XSEBE ZXUAF FLIEG ERSTR ASZER IQTUN GXDUB ROWKI XDUBR OWKIX OPOTS CHKAX OPOTS CHKAX UMXEI NSAQT DREIN ULLXU HRANG ETRET ENXAN GRIFF XINFX RGTX',
    );
  });

  test('shows what the Scharnhorst message says, and links both sources', async ({ page }) => {
    await openLab(page, '/en/enigma');
    const card = page.getByRole('article', { name: 'The Scharnhorst’s last message, 1943' });
    await card.getByText('What it says').click();
    await expect(card.getByText('Am steering for Tanafjord. Position: square AC 4992. Speed: 20 knots. Scharnhorst.')).toBeVisible();
    await expect(card.getByRole('link')).toHaveCount(2);
  });
});

const PRACTICE_1 = [
  { path: '/en', load: 'Load into the machine: Practice 1: no plug pairs', box: 'Decrypting: Practice 1: no plug pairs', typeForMe: 'Type it for me', lit: 'HELLO XFROM XBLET CHLEY XPARK' },
  { path: '/pt-br', load: 'Carregar na máquina: Treino 1: sem pares de plugues', box: 'Decifrando: Treino 1: sem pares de plugues', typeForMe: 'Digitar para mim', lit: 'OLAXD EXBLE TCHLE YXPAR K' },
  { path: '/es', load: 'Cargar en la máquina: Práctica 1: sin pares de clavijas', box: 'Descifrando: Práctica 1: sin pares de clavijas', typeForMe: 'Escríbelo por mí', lit: 'HOLAX DESDE XBLET CHLEY XPARK' },
  { path: '/fr', load: 'Charger dans la machine: Entraînement 1 : sans paires de fiches', box: 'Déchiffrement : Entraînement 1 : sans paires de fiches', typeForMe: 'Taper pour moi', lit: 'BONJO URXDE XBLET CHLEY XPARK' },
  { path: '/de', load: 'In die Maschine laden: Übung 1: keine Steckerpaare', box: 'Entschlüsseln: Übung 1: keine Steckerpaare', typeForMe: 'Für mich tippen', lit: 'HALLO XAUSX BLETC HLEYX PARK' },
] as const;

for (const { path, load, box, typeForMe, lit } of PRACTICE_1) {
  test(`${path}/enigma decrypts practice 1 in its own language`, async ({ page }) => {
    await openLab(page, `${path}/enigma`);
    await page.getByRole('button', { name: load }).click();
    await page.getByRole('region', { name: box }).getByRole('button', { name: typeForMe }).click();
    await expect(page.locator('[data-strip]').first()).toHaveText(lit);
  });
}

const LANGUAGES = [
  { path: '/en', lit: 'Lamps lit', change: 'Change settings' },
  { path: '/pt-br', lit: 'Lâmpadas acesas', change: 'Mudar as configurações' },
  { path: '/es', lit: 'Lámparas encendidas', change: 'Cambiar la configuración' },
  { path: '/fr', lit: 'Lampes allumées', change: 'Changer les réglages' },
  { path: '/de', lit: 'Leuchtende Lampen', change: 'Einstellungen ändern' },
] as const;

for (const { path, lit, change } of LANGUAGES) {
  test(`${path}/enigma types and lights the same letters`, async ({ page }) => {
    await openLab(page, `${path}/enigma`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Enigma I');
    await expect(page.getByRole('button', { name: change })).toBeVisible();
    await page.keyboard.type('WETTERBERICHT');
    await expect(strip(page, lit)).toHaveText('PBJGO LIZQM QGZ');
  });
}

test.describe('on a phone, 390 × 844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('puts "Lamps lit" above the machine, draws the path top to bottom, and fits the width', async ({ page }) => {
    await openLab(page, '/en/enigma');
    await page.getByRole('group', { name: 'Keyboard' }).getByRole('button', { name: 'W' }).click();
    const litBox = await strip(page, 'Lamps lit').boundingBox();
    const machineBox = await page.getByRole('region', { name: 'The machine' }).boundingBox();
    if (litBox === null || machineBox === null) throw new Error('no strip or machine');
    expect(litBox.y + litBox.height).toBeLessThan(machineBox.y);
    await expect(page.getByRole('button', { name: 'Change', exact: true })).toBeVisible();
    // CSS hides the drawing across, so only the drawing top to bottom is left.
    const drawing = page.getByRole('img', { name: /^Key W/ });
    await expect(drawing).toHaveCount(1);
    await expect(drawing).toHaveAttribute('viewBox', '0 0 300 500');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });

  test('puts a loaded message above "Lamps lit", and the open messages fit the width', async ({ page }) => {
    await openLab(page, '/en/enigma');
    await page.getByRole('button', { name: 'Load part 2: Operation Barbarossa, 1941' }).click();
    const boxBox = await page.getByRole('region', { name: 'Decrypting: Operation Barbarossa, 1941, part 2' }).boundingBox();
    const litBox = await strip(page, 'Lamps lit').boundingBox();
    if (boxBox === null || litBox === null) throw new Error('no box or strip');
    expect(boxBox.y + boxBox.height).toBeLessThan(litBox.y);
    for (const summary of await page.locator('summary').all()) await summary.click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  });
});
