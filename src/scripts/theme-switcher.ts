export type SiteTheme = 'electric-kiwi' | 'mountain-mist' | 'alchemical-reaction' | 'belabs-brand';

export const DEFAULT_THEME: SiteTheme = 'belabs-brand';

const STORAGE_KEY = 'belabs-theme';
const VALID_THEMES: SiteTheme[] = ['electric-kiwi', 'mountain-mist', 'alchemical-reaction', 'belabs-brand'];

export function getStoredTheme(): SiteTheme {
	if (typeof localStorage === 'undefined') return DEFAULT_THEME;
	const stored = localStorage.getItem(STORAGE_KEY);
	return VALID_THEMES.includes(stored as SiteTheme) ? (stored as SiteTheme) : DEFAULT_THEME;
}

export function applyTheme(theme: SiteTheme): void {
	document.documentElement.dataset.theme = theme;
	localStorage.setItem(STORAGE_KEY, theme);
}

export function initThemeSwitcher(): void {
	const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-option]');
	if (buttons.length === 0) return;

	const setActive = (theme: SiteTheme) => {
		buttons.forEach((button) => {
			const isActive = button.dataset.themeOption === theme;
			button.classList.toggle('is-active', isActive);
			button.setAttribute('aria-pressed', String(isActive));
		});
	};

	setActive(getStoredTheme());

	buttons.forEach((button) => {
		button.addEventListener('click', () => {
			const theme = button.dataset.themeOption as SiteTheme;
			applyTheme(theme);
			setActive(theme);
		});
	});
}
