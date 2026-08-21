export function initReveal(): void {
	const revealElements = document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)');

	const markVisible = (element: HTMLElement): void => {
		element.classList.add('is-visible');
	};

	if (!('IntersectionObserver' in window)) {
		for (const element of revealElements) {
			markVisible(element);
		}
		return;
	}

	const observer = new IntersectionObserver(
		(entries: IntersectionObserverEntry[]) => {
			for (const entry of entries) {
				if (entry.isIntersecting && entry.target instanceof HTMLElement) {
					markVisible(entry.target);
					observer.unobserve(entry.target);
				}
			}
		},
		{ threshold: 0.05, rootMargin: '0px 0px -10px 0px' },
	);

	for (const element of revealElements) {
		const rect = element.getBoundingClientRect();
		if (rect.top < window.innerHeight && rect.bottom > 0) {
			markVisible(element);
			continue;
		}

		observer.observe(element);
	}
}
