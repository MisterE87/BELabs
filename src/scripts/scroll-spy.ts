export function initScrollSpy(): void {
	const nav = document.querySelector('[data-scroll-nav]');
	if (!nav) return;

	const links = nav.querySelectorAll<HTMLAnchorElement>('[data-section]');
	const sections = [...links]
		.map((link) => {
			const id = link.dataset.section;
			return id ? document.getElementById(id) : null;
		})
		.filter((section): section is HTMLElement => section !== null);

	if (sections.length === 0) return;

	const setActive = (activeId: string | null) => {
		links.forEach((link) => {
			link.classList.toggle('is-active', link.dataset.section === activeId);
		});
	};

	const observer = new IntersectionObserver(
		(entries) => {
			const visible = entries
				.filter((entry) => entry.isIntersecting)
				.sort((a, b) => b.intersectionRatio - a.intersectionRatio);

			if (visible[0]?.target.id) {
				setActive(visible[0].target.id);
			}
		},
		{ rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
	);

	sections.forEach((section) => observer.observe(section));
}
