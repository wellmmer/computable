export type MenuId = 'learn' | 'simulator' | 'enigma' | 'bombe';

export interface MenuItem {
  id: MenuId;
  /** The page, or null while the section is coming soon. */
  href: string | null;
}

/** The menu's sections (spec 4.2). Learn opened in R2a and Enigma in R3a; Bombe comes in R4. */
export const MENU_ITEMS: readonly MenuItem[] = [
  { id: 'learn', href: '/learn' },
  { id: 'simulator', href: '/simulator' },
  { id: 'enigma', href: '/enigma' },
  { id: 'bombe', href: null },
];

/** True when `pathname` (without the language) is the page at `href` or a page under it. */
export function isCurrentPage(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
