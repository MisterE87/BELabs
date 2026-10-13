/**
 * Capture Boardgamestats portfolio assets:
 * - Public landing light/dark (Appearance* + hero screenshot)
 * - Logged-in gallery pages (Dashboard, Collection, Sessions, BGG, Friends)
 *
 * Requires CAPTURE_AUTH_board_stats=user:pass in .env (or the environment).
 * Defaults to local PHP: http://127.0.0.1:3000
 *
 *   PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:3000 -t /path/to/boardgamer
 *   npm run assets:capture:board-stats
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outRoot = join(root, 'public/images/projects/board-stats');
const galleryDir = join(outRoot, 'gallery');

mkdirSync(galleryDir, { recursive: true });

loadEnvFile(join(root, '.env'));

function loadEnvFile(path) {
	if (!existsSync(path)) return;
	for (const line of readFileSync(path, 'utf8').split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const separator = trimmed.indexOf('=');
		if (separator === -1) continue;
		const key = trimmed.slice(0, separator).trim();
		const value = trimmed.slice(separator + 1).trim();
		if (!(key in process.env)) process.env[key] = value;
	}
}

function resolveBaseUrl() {
	const fromCapture = process.env.CAPTURE_URL_board_stats;
	if (fromCapture) {
		try {
			const url = new URL(fromCapture);
			return `${url.origin}${url.pathname.replace(/\/[^/]*$/, '') || ''}`.replace(/\/$/, '') || url.origin;
		} catch {
			/* fall through */
		}
	}
	return (process.env.CAPTURE_BASE_board_stats || 'http://127.0.0.1:3000').replace(/\/$/, '');
}

function getAuth() {
	const raw = process.env.CAPTURE_AUTH_board_stats;
	if (!raw) return null;
	const separator = raw.indexOf(':');
	if (separator === -1) return null;
	return {
		user: raw.slice(0, separator),
		password: raw.slice(separator + 1),
	};
}

async function downloadIcon(browser, baseUrl) {
	const context = await browser.newContext();
	const page = await context.newPage();
	try {
		const iconUrl = `${baseUrl}/icons/icon-512.png`;
		const response = await page.request.get(iconUrl);
		if (!response.ok()) throw new Error(`Icon download failed: ${response.status()}`);
		const buffer = await response.body();
		const { default: sharp } = await import('sharp');
		await sharp(buffer).resize(256, 256, { fit: 'inside' }).png().toFile(join(outRoot, 'icon.png'));
		console.log('  icon.png');
	} finally {
		await context.close();
	}
}

async function captureLanding(browser, baseUrl, { dark, screenshotPath, galleryName }) {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		deviceScaleFactor: 1,
	});
	const page = await context.newPage();

	try {
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

		await page.goto(`${baseUrl}/index.php`, { waitUntil: 'networkidle', timeout: 60_000 });
		await page.waitForSelector('.public-hero', { timeout: 30_000 });
		await page.waitForTimeout(500);
		await page.screenshot({ path: screenshotPath, type: 'png', fullPage: false });
		if (galleryName) {
			await page.screenshot({ path: join(galleryDir, galleryName), type: 'png', fullPage: false });
		}
		console.log(`  ${galleryName ?? screenshotPath.split('/').pop()}${dark ? ' (dark)' : ' (light)'}`);
	} finally {
		await context.close();
	}
}

async function login(context, baseUrl, auth) {
	const loginUrl = process.env.CAPTURE_LOGIN_URL_board_stats || `${baseUrl}/index.php`;
	const response = await context.request.post(loginUrl, {
		form: {
			action: 'login',
			user: auth.user,
			password: auth.password,
		},
		maxRedirects: 0,
	});

	const status = response.status();
	const location = response.headers()['location'] ?? '';
	const okRedirect =
		(status >= 300 && status < 400 && location.includes('dashboard')) ||
		(status >= 200 && status < 400 && !location.includes('index.php'));

	if (!okRedirect && status >= 300 && status < 400 && location.includes('index.php')) {
		throw new Error('Login rejected — check CAPTURE_AUTH_board_stats credentials');
	}
	if (!response.ok() && !(status >= 300 && status < 400)) {
		throw new Error(`Login failed with status ${status}`);
	}
}

async function dismissWhatsNew(page) {
	const dismiss = page.locator('[data-whats-new-dismiss]');
	if ((await dismiss.count()) === 0) return;
	const visible = await dismiss.first().isVisible().catch(() => false);
	if (!visible) return;
	await dismiss.first().click({ timeout: 2_000 }).catch(() => {});
	await page.waitForTimeout(300);
}

async function waitForDashboard(page) {
	await page.waitForSelector('.dashboard-charts, #purchasesChart', { timeout: 30_000 });
	await page.waitForFunction(
		() => {
			const loading = document.querySelector('.chart-loading');
			const canvas = document.querySelector('#purchasesChart');
			return (!loading || loading.textContent?.trim() !== 'Loading ranking data...') && canvas;
		},
		undefined,
		{ timeout: 30_000 },
	);
	await dismissWhatsNew(page);
	await page.waitForTimeout(2_000);
}

async function waitForListReady(page, selectors) {
	await page.waitForSelector(selectors.join(', '), { timeout: 30_000 });
	await dismissWhatsNew(page);
	await page.waitForTimeout(1_000);
}

async function shot(page, name) {
	await page.screenshot({ path: join(galleryDir, name), type: 'png', fullPage: false });
	console.log(`  ${name}`);
}

async function captureLoggedInGallery(browser, baseUrl, auth) {
	const context = await browser.newContext({
		viewport: { width: 1280, height: 800 },
		deviceScaleFactor: 1,
	});

	try {
		await login(context, baseUrl, auth);
		const page = await context.newPage();

		// Prefer light Cartographer for in-app gallery consistency with AppearanceLight.
		await page.addInitScript(() => {
			localStorage.setItem('appearance', 'light');
			delete document.documentElement.dataset.theme;
		});

		// Dashboard
		await page.goto(`${baseUrl}/dashboard.php`, { waitUntil: 'networkidle', timeout: 60_000 });
		await waitForDashboard(page);
		await shot(page, 'Dashboard.png');

		// Collection
		await page.goto(`${baseUrl}/collection.php`, { waitUntil: 'networkidle', timeout: 60_000 });
		await waitForListReady(page, ['#collectionTableBody tr', '.mobile-card', '#collectionTableBody']);
		await shot(page, 'Collection.png');

		// BGG integration (Board Games + add modal + typeahead)
		await page.goto(`${baseUrl}/boardgames.php`, { waitUntil: 'networkidle', timeout: 60_000 });
		await waitForListReady(page, ['#gamesTableBody tr', '.mobile-card', '#gamesTableBody', '#addBggBtn']);
		await page.click('#addBggBtn');
		await page.waitForFunction(
			() => {
				const modal = document.getElementById('addBggModal');
				return modal && modal.style.display === 'flex' && modal.classList.contains('show');
			},
			undefined,
			{ timeout: 10_000 },
		);
		await page.waitForSelector('#bggGameSearch', { timeout: 10_000 });
		await page.fill('#bggGameSearch', 'santor');
		await page.waitForSelector('#bggSuggestions:not(.hidden) li', { timeout: 20_000 }).catch(() => {});
		await page.waitForTimeout(800);
		await shot(page, 'BGG_API.png');
		await page.keyboard.press('Escape').catch(() => {});

		// Sessions list
		await page.goto(`${baseUrl}/sessions.php`, { waitUntil: 'networkidle', timeout: 60_000 });
		await waitForListReady(page, ['#sessionsBody tr', '.mobile-card', '#sessionsBody']);
		await shot(page, 'Sessions.png');

		// Add session modal
		await page.click('#addSessionBtn');
		await page.waitForFunction(
			() => {
				const modal = document.getElementById('sessionModal');
				return modal && modal.style.display === 'flex';
			},
			undefined,
			{ timeout: 10_000 },
		);
		await page.waitForTimeout(600);
		await shot(page, 'Sessions2.png');
		await page.keyboard.press('Escape').catch(() => {});

		// Friend invite QR
		await page.goto(`${baseUrl}/friends.php`, { waitUntil: 'networkidle', timeout: 60_000 });
		await waitForListReady(page, ['#friendsTableBody', '#showShareQrBtn']);
		await page.click('#showShareQrBtn');
		await page.waitForFunction(
			() => {
				const modal = document.getElementById('shareQrModal');
				const qr = document.getElementById('shareQrCode');
				return (
					modal &&
					modal.style.display === 'flex' &&
					qr &&
					(qr.childElementCount > 0 || qr.querySelector('canvas, img, svg'))
				);
			},
			undefined,
			{ timeout: 15_000 },
		);
		await page.waitForTimeout(500);
		await shot(page, 'FriendInvite.png');

		await page.close();
	} finally {
		await context.close();
	}
}

async function main() {
	const baseUrl = resolveBaseUrl();
	const auth = getAuth();
	if (!auth) {
		console.error(
			'Missing CAPTURE_AUTH_board_stats=username:password (set in .env or the environment).',
		);
		process.exit(1);
	}

	console.log(`Capturing Boardgamestats gallery from ${baseUrl}`);
	const browser = await chromium.launch({ headless: true });
	try {
		await downloadIcon(browser, baseUrl);
		await captureLanding(browser, baseUrl, {
			dark: false,
			screenshotPath: join(outRoot, 'screenshot.png'),
			galleryName: 'AppearanceLight.png',
		});
		await captureLanding(browser, baseUrl, {
			dark: true,
			screenshotPath: join(outRoot, 'gallery', 'AppearanceDark.png'),
			galleryName: null,
		});
		await captureLoggedInGallery(browser, baseUrl, auth);
		console.log('Done. Run npm run assets:optimize to refresh WebP derivatives.');
	} finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
