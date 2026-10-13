import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outRoot = join(__dirname, '../public/images/projects/board-stats');
const galleryDir = join(outRoot, 'gallery');

mkdirSync(galleryDir, { recursive: true });

async function captureLanding(browser, { dark, screenshotPath, galleryName }) {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();

	if (dark) {
		await page.addInitScript(() => {
			localStorage.setItem('appearance', 'dark');
			document.documentElement.dataset.theme = 'dark';
		});
	} else {
		await page.addInitScript(() => {
			localStorage.setItem('appearance', 'light');
			delete document.documentElement.dataset.theme;
		});
	}

	await page.goto('https://www.boardgamestats.nl/index.php', {
		waitUntil: 'networkidle',
		timeout: 60_000,
	});
	await page.waitForSelector('.public-hero', { timeout: 30_000 });
	await page.waitForTimeout(500);

	await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false });

	if (galleryName) {
		await page.screenshot({
			path: join(galleryDir, galleryName),
			type: 'png',
			fullPage: false,
		});
	}

	await context.close();
}

async function downloadIcon(browser) {
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto('https://www.boardgamestats.nl/index.php', { waitUntil: 'domcontentloaded' });
	const iconUrl = 'https://www.boardgamestats.nl/icons/icon-512.png';
	const response = await page.request.get(iconUrl);
	const buffer = await response.body();
	const { default: sharp } = await import('sharp');
	await sharp(buffer).resize(256, 256, { fit: 'inside' }).png().toFile(join(outRoot, 'icon.png'));
	await context.close();
}

async function main() {
	const browser = await chromium.launch({ headless: true });
	try {
		await downloadIcon(browser);
		await captureLanding(browser, {
			dark: false,
			screenshotPath: join(outRoot, 'screenshot.png'),
			galleryName: 'AppearanceLight.png',
		});
		await captureLanding(browser, {
			dark: true,
			screenshotPath: join(outRoot, 'gallery', 'AppearanceDark.png'),
			galleryName: null,
		});
		console.log('Captured board-stats public light/dark screenshots');
	} finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
