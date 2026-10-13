import { existsSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const ASSET_ROOT = join(process.cwd(), 'public/images/projects');

export function projectAssetPath(slug: string, filename: string): string {
	return join(ASSET_ROOT, slug, filename);
}

export function hasProjectAsset(slug: string, filename: string): boolean {
	return existsSync(projectAssetPath(slug, filename));
}

/** Cache-bust query so Cloudflare/browsers fetch updated public/ assets after deploys. */
function withAssetVersion(url: string, absolutePath: string): string {
	try {
		const version = Math.floor(statSync(absolutePath).mtimeMs);
		return `${url}?v=${version}`;
	} catch {
		return url;
	}
}

function projectAssetUrl(slug: string, filename: string, base: string): string {
	const relative = `images/projects/${slug}/${filename}`;
	return withAssetVersion(`${base}${relative}`, projectAssetPath(slug, filename));
}

export function projectIconUrl(slug: string, base: string): string {
	return projectAssetUrl(slug, 'icon.png', base);
}

export function projectScreenshotUrl(slug: string, base: string): string {
	return projectAssetUrl(slug, 'screenshot.webp', base);
}

const SCREENSHOT_SOURCE_NAMES = ['screenshot.png', 'screenshot.jpg', 'screenshot.jpeg', 'screenshot.heic'];

export function projectScreenshotLightboxUrl(slug: string, base: string): string {
	for (const name of SCREENSHOT_SOURCE_NAMES) {
		if (hasProjectAsset(slug, name)) {
			return projectAssetUrl(slug, name, base);
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
	return projectAssetUrl(slug, `gallery/${webpName}`, base);
}

export function projectHasGalleryAsset(slug: string, filename: string): boolean {
	const webpName = projectGalleryWebpName(filename);
	return hasProjectAsset(slug, `gallery/${webpName}`);
}
