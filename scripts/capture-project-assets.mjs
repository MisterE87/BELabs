import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const projectsDir = join(root, 'src/content/projects');
const outputRoot = join(root, 'public/images/projects');

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

function parseFrontmatter(content) {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	const data = {};
	for (const line of match[1].split('\n')) {
		const entry = line.match(/^([a-zA-Z]+):\s*(.+)$/);
		if (!entry) continue;
		const [, key, raw] = entry;
		data[key] = raw.replace(/^["']|["']$/g, '');
	}

	return data;
}

function loadProjects() {
	return readdirSync(projectsDir)
		.filter((file) => file.endsWith('.md'))
		.map((file) => {
			const slug = file.replace(/\.md$/, '');
			const content = readFileSync(join(projectsDir, file), 'utf8');
			const frontmatter = parseFrontmatter(content);
			return {
				slug,
				title: frontmatter.title ?? slug,
				icon: frontmatter.icon ?? '🧪',
				projectUrl: frontmatter.projectUrl,
				captureUrl: frontmatter.captureUrl,
			};
		});
}

function authEnvKey(slug) {
	return `CAPTURE_AUTH_${slug.replaceAll('-', '_')}`;
}

function captureUrlEnvKey(slug) {
	return `CAPTURE_URL_${slug.replaceAll('-', '_')}`;
}

function loginUrlEnvKey(slug) {
	return `CAPTURE_LOGIN_URL_${slug.replaceAll('-', '_')}`;
}

function getCaptureAuth(slug) {
	const raw = process.env[authEnvKey(slug)];
	if (!raw) return null;

	const separator = raw.indexOf(':');
	if (separator === -1) return null;

	return {
		user: raw.slice(0, separator),
		password: raw.slice(separator + 1),
	};
}

function resolveUrl(baseUrl, href) {
	try {
		return new URL(href, baseUrl).href;
	} catch {
		return null;
	}
}

async function fetchHtml(pageUrl) {
	const response = await fetch(pageUrl, {
		headers: { 'User-Agent': 'BELabs-Asset-Capture/1.0' },
	});
	if (!response.ok) throw new Error(`Failed to fetch ${pageUrl}: ${response.status}`);
	return response.text();
}

async function findIconUrl(pageUrl) {
	const html = await fetchHtml(pageUrl);
	const candidates = [];

	for (const match of html.matchAll(/<link[^>]+>/gi)) {
		const tag = match[0];
		const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
		const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
		if (!href) continue;

		if (rel.includes('apple-touch-icon')) candidates.unshift(resolveUrl(pageUrl, href));
		else if (rel.includes('icon')) candidates.push(resolveUrl(pageUrl, href));
	}

	const unique = [...new Set(candidates.filter(Boolean))];
	if (unique.length > 0) return unique[0];

	return `${new URL(pageUrl).origin}/favicon.ico`;
}

async function findOgImageUrl(pageUrl) {
	const html = await fetchHtml(pageUrl);
	const patterns = [
		/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
		/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
		/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) return resolveUrl(pageUrl, match[1]);
	}

	return null;
}

async function downloadIcon(iconUrl, outputPath) {
	const response = await fetch(iconUrl, {
		headers: { 'User-Agent': 'BELabs-Asset-Capture/1.0' },
	});
	if (!response.ok) throw new Error(`Failed to download icon ${iconUrl}: ${response.status}`);

	const buffer = Buffer.from(await response.arrayBuffer());
	await sharp(buffer)
		.resize(256, 256, { fit: 'inside', withoutEnlargement: false })
		.png()
		.toFile(outputPath);
}

async function saveScreenshotFromImage(imageUrl, outputPath) {
	const response = await fetch(imageUrl, {
		headers: { 'User-Agent': 'BELabs-Asset-Capture/1.0' },
	});
	if (!response.ok) throw new Error(`Failed to download image ${imageUrl}: ${response.status}`);

	const buffer = Buffer.from(await response.arrayBuffer());
	await sharp(buffer)
		.resize(1280, 800, { fit: 'cover', position: 'top' })
		.webp({ quality: 85 })
		.toFile(outputPath);
}

async function loginToBoardStats(context, projectUrl, auth) {
	const response = await context.request.post(projectUrl, {
		form: {
			action: 'login',
			user: auth.user,
			password: auth.password,
		},
	});

	if (!response.ok()) {
		throw new Error(`Login failed with status ${response.status()}`);
	}

	const location = response.headers()['location'] ?? '';
	if (location.includes('index.php') && !location.includes('dashboard')) {
		throw new Error('Login rejected — check CAPTURE_AUTH_board_stats credentials');
	}
}

async function waitForScreenshotReady(page, captureUrl) {
	const host = new URL(captureUrl).hostname;

	if (host.includes('bluechickenboardgames.nl')) {
		await page.waitForSelector('article img[alt*="hero"], .grid article', { timeout: 30_000 });
		await page.evaluate(() => {
			const heading = [...document.querySelectorAll('h2')].find((node) =>
				node.textContent?.includes('Published'),
			);
			heading?.scrollIntoView({ block: 'start' });
		});
		await page.waitForTimeout(750);
		return;
	}

	if (host.includes('boardgamestats.nl') || host === 'localhost') {
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
		await page.waitForTimeout(2_000);
	}
}

async function captureScreenshotWithPlaywright(browser, captureUrl, outputPath, options = {}) {
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

	try {
		if (options.auth && options.loginUrl) {
			await loginToBoardStats(context, options.loginUrl, options.auth);
		}

		const page = await context.newPage();
		await page.goto(captureUrl, { waitUntil: 'networkidle', timeout: 60_000 });
		await waitForScreenshotReady(page, captureUrl);
		await page.screenshot({ path: outputPath, type: 'webp', fullPage: false });
		await page.close();
	} finally {
		await context.close();
	}
}

async function generatePlaceholderScreenshot(project, outputPath) {
	const iconPath = join(outputRoot, project.slug, 'icon.png');
	const width = 1280;
	const height = 800;
	const title = escapeXml(project.title);
	const emoji = escapeXml(project.icon);

	let iconLayer = '';
	if (existsSync(iconPath)) {
		const iconBuffer = await sharp(iconPath).resize(220, 220, { fit: 'inside' }).png().toBuffer();
		const iconBase64 = iconBuffer.toString('base64');
		iconLayer = `<image href="data:image/png;base64,${iconBase64}" x="530" y="220" width="220" height="220" />`;
	} else {
		iconLayer = `<text x="640" y="340" text-anchor="middle" font-size="120">${emoji}</text>`;
	}

	const svg = `
		<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
			<defs>
				<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" stop-color="#7dd3fc" />
					<stop offset="55%" stop-color="#d9f99d" />
					<stop offset="100%" stop-color="#fff7ed" />
				</linearGradient>
			</defs>
			<rect width="100%" height="100%" fill="url(#bg)" />
			${iconLayer}
			<text x="640" y="520" text-anchor="middle" font-family="system-ui, sans-serif" font-size="42" font-weight="700" fill="#1f2937">${title}</text>
			<text x="640" y="575" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" fill="#4b5563">B&amp;E Labs project</text>
		</svg>
	`;

	await sharp(Buffer.from(svg)).webp({ quality: 85 }).toFile(outputPath);
}

function escapeXml(value) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

async function launchBrowser() {
	try {
		return await chromium.launch({ headless: true });
	} catch (error) {
		console.warn(`  playwright unavailable: ${error instanceof Error ? error.message : error}`);
		return null;
	}
}

async function main() {
	const allProjects = loadProjects();
	const captureProjects = allProjects.filter((project) => project.projectUrl || project.captureUrl);

	const browser = await launchBrowser();

	for (const project of captureProjects) {
		const outDir = join(outputRoot, project.slug);
		mkdirSync(outDir, { recursive: true });

		const iconPath = join(outDir, 'icon.png');
		const screenshotPath = join(outDir, 'screenshot.webp');
		const iconSourceUrl = project.projectUrl ?? project.captureUrl;
		const screenshotUrl =
			process.env[captureUrlEnvKey(project.slug)] ?? project.captureUrl ?? project.projectUrl;
		const loginUrl =
			process.env[loginUrlEnvKey(project.slug)] ?? project.projectUrl ?? screenshotUrl;
		const auth = getCaptureAuth(project.slug);

		console.log(`\n→ ${project.slug}`);
		console.log(`  screenshot: ${screenshotUrl}`);

		if (iconSourceUrl) {
			try {
				const iconUrl = await findIconUrl(iconSourceUrl);
				console.log(`  icon: ${iconUrl}`);
				await downloadIcon(iconUrl, iconPath);
				console.log(`  saved ${iconPath}`);
			} catch (error) {
				console.warn(`  icon failed: ${error instanceof Error ? error.message : error}`);
			}
		}

		let screenshotSaved = false;

		if (browser && screenshotUrl) {
			if (auth) {
				console.log(`  auth: ${authEnvKey(project.slug)}`);
			} else if (screenshotUrl.includes('dashboard.php')) {
				console.warn(`  auth missing: set ${authEnvKey(project.slug)} in .env for dashboard capture`);
			}

			try {
				await captureScreenshotWithPlaywright(browser, screenshotUrl, screenshotPath, {
					auth,
					loginUrl,
				});
				console.log(`  saved ${screenshotPath} (playwright)`);
				screenshotSaved = true;
			} catch (error) {
				console.warn(`  playwright screenshot failed: ${error instanceof Error ? error.message : error}`);
			}
		}

		if (!screenshotSaved && screenshotUrl) {
			try {
				const ogImageUrl = await findOgImageUrl(screenshotUrl);
				if (!ogImageUrl) throw new Error('no og:image found');
				console.log(`  screenshot fallback: ${ogImageUrl}`);
				await saveScreenshotFromImage(ogImageUrl, screenshotPath);
				console.log(`  saved ${screenshotPath} (og:image)`);
				screenshotSaved = true;
			} catch (error) {
				console.warn(`  og:image screenshot failed: ${error instanceof Error ? error.message : error}`);
			}
		}

		if (!screenshotSaved) {
			console.warn(`  screenshot not captured for ${project.slug}`);
		}
	}

	if (browser) await browser.close();

	const placeholderProjects = allProjects.filter((project) => !project.projectUrl && !project.captureUrl);
	if (placeholderProjects.length > 0) {
		console.log('\nPlaceholder screenshots:');
		for (const project of placeholderProjects) {
			const outDir = join(outputRoot, project.slug);
			mkdirSync(outDir, { recursive: true });
			const screenshotPath = join(outDir, 'screenshot.webp');

			try {
				await generatePlaceholderScreenshot(project, screenshotPath);
				console.log(`  saved ${screenshotPath} (${project.slug})`);
			} catch (error) {
				console.warn(`  placeholder failed for ${project.slug}: ${error instanceof Error ? error.message : error}`);
			}
		}
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
