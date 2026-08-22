export function initGalleryLightbox() {
	const dialog = document.getElementById('gallery-lightbox');
	if (!(dialog instanceof HTMLDialogElement)) return;

	const image = dialog.querySelector<HTMLImageElement>('.gallery-lightbox-image');
	const caption = dialog.querySelector<HTMLElement>('.gallery-lightbox-caption');
	const closeButtons = dialog.querySelectorAll<HTMLElement>('[data-lightbox-close]');

	if (!image || !caption) return;

	const open = (src: string, alt: string, text: string) => {
		image.src = src;
		image.alt = alt;
		caption.textContent = text;
		dialog.showModal();
	};

	const close = () => {
		dialog.close();
		image.removeAttribute('src');
		caption.textContent = '';
	};

	document.querySelectorAll<HTMLButtonElement>('[data-lightbox-src]').forEach((trigger) => {
		if (trigger.dataset.lightboxBound === 'true') return;

		trigger.dataset.lightboxBound = 'true';
		trigger.addEventListener('click', () => {
			const src = trigger.dataset.lightboxSrc;
			if (!src) return;

			open(src, trigger.dataset.lightboxAlt ?? '', trigger.dataset.lightboxCaption ?? '');
		});
	});

	closeButtons.forEach((button) => {
		if (button.dataset.lightboxCloseBound === 'true') return;

		button.dataset.lightboxCloseBound = 'true';
		button.addEventListener('click', close);
	});

	if (dialog.dataset.lightboxBound === 'true') return;

	dialog.dataset.lightboxBound = 'true';
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) close();
	});

	dialog.addEventListener('cancel', (event) => {
		event.preventDefault();
		close();
	});
}
