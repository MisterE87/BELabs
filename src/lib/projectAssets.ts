import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const ASSET_ROOT = join(process.cwd(), 'public/images/projects');

export function projectAssetPath(slug: string, filename: string): string {
	return join(ASSET_ROOT, slug, filename);
}

export function hasProjectAsset(slug: string, filename: string): boolean {
	return existsSync(projectAssetPath(slug, filename));
}

export function projectIconUrl(slug: string, base: string): string {
	return `${base}images/projects/${slug}/icon.png`;
}

export function projectScreenshotUrl(slug: string, base: string): string {
	return `${base}images/projects/${slug}/screenshot.webp`;
}

const SCREENSHOT_SOURCE_NAMES = ['screenshot.png', 'screenshot.jpg', 'screenshot.jpeg', 'screenshot.heic'];

export function projectScreenshotLightboxUrl(slug: string, base: string): string {
	for (const name of SCREENSHOT_SOURCE_NAMES) {
		if (hasProjectAsset(slug, name)) {
			return `${base}images/projects/${slug}/${name}`;
		}
	}

	return projectScreenshotUrl(slug, base);
}

export function projectHasIcon(slug: string): boolean {
	return hasProjectAsset(slug, 'icon.png');
}

export function projectHasScreenshot(slug: string): boolean {
	return hasProjectAsset(slug, 'screenshot.webp');
}

export function projectGalleryBasename(filename: string): string {
	return basename(filename, extname(filename));
}

export function projectGalleryWebpName(filename: string): string {
	return `${projectGalleryBasename(filename)}.webp`;
}

export function projectGalleryUrl(slug: string, filename: string, base: string): string {
	const webpName = projectGalleryWebpName(filename);
	return `${base}images/projects/${slug}/gallery/${webpName}`;
}

export function projectHasGalleryAsset(slug: string, filename: string): boolean {
	const webpName = projectGalleryWebpName(filename);
	return hasProjectAsset(slug, `gallery/${webpName}`);
}
