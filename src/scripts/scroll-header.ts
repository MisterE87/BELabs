export function initScrollHeader(): void {
	const header = document.querySelector<HTMLElement>('[data-site-header]');
	if (!header || header.dataset.headerTheme !== 'dark') return;

	const onScroll = () => {
		header.dataset.scrolled = window.scrollY > 32 ? 'true' : 'false';
	};

	onScroll();
	window.addEventListener('scroll', onScroll, { passive: true });
}
