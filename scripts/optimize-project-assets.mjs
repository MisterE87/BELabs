import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const projectsRoot = join(root, 'public/images/projects');

const SCREENSHOT_WIDTH = 1280;
const SCREENSHOT_HEIGHT = 800;
const ICON_SIZE = 256;
const GALLERY_PORTRAIT_WIDTH = 720;
const GALLERY_LANDSCAPE_WIDTH = 1280;
const GALLERY_LANDSCAPE_HEIGHT = 800;

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.heic'];

const SCREENSHOT_EXACT = [
	'screenshot.png',
	'screenshot.jpg',
	'screenshot.jpeg',
	'screenshot.webp',
	'screenshot.heic',
	'dashboard.png',
	'source.png',
	'source.jpg',
	'source.jpeg',
	'source.webp',
	'source.heic',
];

const ICON_EXACT = ['icon.png', 'icon.jpg', 'icon.jpeg', 'icon.webp', 'icon.heic'];

const OUTPUT_SCREENSHOT = 'screenshot.webp';
const OUTPUT_ICON = 'icon.png';

function listImages(dir) {
	return readdirSync(dir)
		.filter((name) => {
			const lower = name.toLowerCase();
			return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
		})
		.map((name) => {
			const path = join(dir, name);
			return { name, path, mtimeMs: statSync(path).mtimeMs };
		});
}

function findExactMatch(images, candidates) {
	for (const candidate of candidates) {
		const match = images.find((image) => image.name.toLowerCase() === candidate);
		if (match) return match.path;
	}
	return null;
}

function discoverScreenshotSource(dir) {
	const outputPath = join(dir, OUTPUT_SCREENSHOT);
	const iconOutputPath = join(dir, OUTPUT_ICON);
	const images = listImages(dir).filter((image) => image.path !== outputPath && image.path !== iconOutputPath);

	const exact = findExactMatch(images, SCREENSHOT_EXACT);
	if (exact) return exact;

	const namedScreenshots = images
		.filter((image) => /screenshot/i.test(image.name))
		.sort((a, b) => b.mtimeMs - a.mtimeMs);
	if (namedScreenshots.length > 0) return namedScreenshots[0].path;

	return null;
}

function discoverIconSource(dir) {
	const outputPath = join(dir, OUTPUT_ICON);
	const images = listImages(dir).filter((image) => image.path !== outputPath);

	const exact = findExactMatch(images, ICON_EXACT);
	if (exact) return exact;

	const namedIcons = images
		.filter((image) => /^icon\./i.test(image.name))
		.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
	if (namedIcons.length > 0) return namedIcons[0].path;

	return null;
}

async function getImageSize(path) {
	const metadata = await sharp(path).metadata();
	return { width: metadata.width ?? 0, height: metadata.height ?? 0 };
}

function isScreenshotSized(width, height) {
	return width === SCREENSHOT_WIDTH && height === SCREENSHOT_HEIGHT;
}

function isIconSized(width, height) {
	return width === ICON_SIZE && height === ICON_SIZE;
}

async function optimizeScreenshot(sourcePath, outputPath) {
	const buffer = await sharp(sourcePath)
		.resize(SCREENSHOT_WIDTH, SCREENSHOT_HEIGHT, { fit: 'cover', position: 'top' })
		.webp({ quality: 85 })
		.toBuffer();
	writeFileSync(outputPath, buffer);
}

async function optimizeIcon(sourcePath, outputPath) {
	const buffer = await sharp(sourcePath)
		.resize(ICON_SIZE, ICON_SIZE, { fit: 'inside', withoutEnlargement: false })
		.png()
		.toBuffer();
	writeFileSync(outputPath, buffer);
}

async function optimizeGalleryPortrait(sourcePath, outputPath) {
	const buffer = await sharp(sourcePath)
		.resize(GALLERY_PORTRAIT_WIDTH, null, { fit: 'inside', withoutEnlargement: false })
		.webp({ quality: 85 })
		.toBuffer();
	writeFileSync(outputPath, buffer);
}

async function optimizeGalleryLandscape(sourcePath, outputPath) {
	const buffer = await sharp(sourcePath)
		.resize(GALLERY_LANDSCAPE_WIDTH, GALLERY_LANDSCAPE_HEIGHT, { fit: 'cover', position: 'top' })
		.webp({ quality: 85 })
		.toBuffer();
	writeFileSync(outputPath, buffer);
}

function galleryOutputName(sourceName) {
	return `${basename(sourceName, extname(sourceName))}.webp`;
}

function isGalleryOutput(name) {
	return name.toLowerCase().endsWith('.webp');
}

function discoverGallerySources(galleryDir) {
	if (!existsSync(galleryDir)) return [];

	const images = listImages(galleryDir);
	const sources = new Map();

	for (const image of images) {
		if (isGalleryOutput(image.name)) continue;

		const outputName = galleryOutputName(image.name);
		const outputPath = join(galleryDir, outputName);
		const existing = sources.get(outputName);

		if (!existing || isNewer(image.path, existing.path)) {
			sources.set(outputName, { sourcePath: image.path, outputPath, outputName });
		}
	}

	return [...sources.values()].filter(({ sourcePath, outputPath }) => {
		if (!existsSync(outputPath)) return true;
		return isNewer(sourcePath, outputPath);
	});
}

async function optimizeGalleryDir(galleryDir) {
	const pending = discoverGallerySources(galleryDir);
	const optimized = [];

	for (const { sourcePath, outputPath, outputName } of pending) {
		const { width, height } = await getImageSize(sourcePath);
		const isPortrait = height > width;

		if (isPortrait) {
			await optimizeGalleryPortrait(sourcePath, outputPath);
			console.log(`  gallery: ${basename(sourcePath)} → gallery/${outputName} (portrait, max ${GALLERY_PORTRAIT_WIDTH}px wide)`);
		} else {
			await optimizeGalleryLandscape(sourcePath, outputPath);
			console.log(
				`  gallery: ${basename(sourcePath)} → gallery/${outputName} (landscape, ${GALLERY_LANDSCAPE_WIDTH}×${GALLERY_LANDSCAPE_HEIGHT})`,
			);
		}

		optimized.push(outputName);
	}

	return optimized;
}

function isNewer(sourcePath, outputPath) {
	if (!existsSync(outputPath)) return true;
	return statSync(sourcePath).mtimeMs > statSync(outputPath).mtimeMs;
}

async function resolveScreenshotSource(dir) {
	const rawSource = discoverScreenshotSource(dir);
	const outputPath = join(dir, OUTPUT_SCREENSHOT);

	if (rawSource) {
		if (rawSource === outputPath) {
			const { width, height } = await getImageSize(outputPath);
			if (!isScreenshotSized(width, height)) return outputPath;
			return null;
		}
		if (!existsSync(outputPath) || isNewer(rawSource, outputPath)) return rawSource;
		return null;
	}

	if (!existsSync(outputPath)) return null;

	const { width, height } = await getImageSize(outputPath);
	if (!isScreenshotSized(width, height)) return outputPath;

	return null;
}

async function resolveIconSource(dir) {
	const rawSource = discoverIconSource(dir);
	const outputPath = join(dir, OUTPUT_ICON);

	if (rawSource) {
		if (rawSource === outputPath) {
			const { width, height } = await getImageSize(outputPath);
			if (!isIconSized(width, height)) return outputPath;
			return null;
		}
		if (!existsSync(outputPath) || isNewer(rawSource, outputPath)) return rawSource;
		return null;
	}

	if (!existsSync(outputPath)) return null;

	const { width, height } = await getImageSize(outputPath);
	if (!isIconSized(width, height)) return outputPath;

	return null;
}

async function main() {
	if (!existsSync(projectsRoot)) return;

	const slugs = readdirSync(projectsRoot, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);

	if (slugs.length === 0) return;

	let optimized = 0;

	for (const slug of slugs) {
		const dir = join(projectsRoot, slug);
		const screenshotSource = await resolveScreenshotSource(dir);
		const iconSource = await resolveIconSource(dir);
		const galleryDir = join(dir, 'gallery');
		const galleryPending = existsSync(galleryDir) ? discoverGallerySources(galleryDir) : [];

		if (!screenshotSource && !iconSource && galleryPending.length === 0) continue;

		if (optimized === 0) console.log('Optimizing project assets...');
		console.log(`\n→ ${slug}`);

		if (screenshotSource) {
			const outputPath = join(dir, OUTPUT_SCREENSHOT);
			await optimizeScreenshot(screenshotSource, outputPath);
			console.log(`  screenshot: ${screenshotSource} → ${OUTPUT_SCREENSHOT} (${SCREENSHOT_WIDTH}×${SCREENSHOT_HEIGHT})`);
			optimized += 1;
		}

		if (iconSource) {
			const outputPath = join(dir, OUTPUT_ICON);
			await optimizeIcon(iconSource, outputPath);
			console.log(`  icon: ${iconSource} → ${OUTPUT_ICON} (${ICON_SIZE}×${ICON_SIZE})`);
			optimized += 1;
		}

		if (galleryPending.length > 0) {
			const galleryOptimized = await optimizeGalleryDir(galleryDir);
			optimized += galleryOptimized.length;
		}
	}

	if (optimized > 0) {
		console.log(`\nDone. Optimized ${optimized} asset(s).`);
	} else {
		console.log(
			'No project assets to optimize. Drop images in public/images/projects/{slug}/ — e.g. screenshot.png, Screenshot_1.png, or Icon.png. Gallery images go in public/images/projects/{slug}/gallery/.',
		);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
