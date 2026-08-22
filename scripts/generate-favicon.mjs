import { existsSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const sourcePath = join(root, 'public/images/BELabsIcon.png');
const favicon32Path = join(root, 'public/favicon-32.png');
const appleTouchPath = join(root, 'public/apple-touch-icon.png');

function isNewer(source, output) {
	if (!existsSync(output)) return true;
	return statSync(source).mtimeMs > statSync(output).mtimeMs;
}

async function main() {
	if (!existsSync(sourcePath)) {
		console.log('No BELabsIcon.png found at public/images/BELabsIcon.png — skipping favicon generation.');
		return;
	}

	if (!isNewer(sourcePath, favicon32Path) && !isNewer(sourcePath, appleTouchPath)) {
		console.log('Favicons up to date.');
		return;
	}

	console.log('Generating favicons from BELabsIcon.png...');

	const favicon32 = await sharp(sourcePath).resize(32, 32, { fit: 'cover' }).png().toBuffer();
	writeFileSync(favicon32Path, favicon32);
	console.log('  → public/favicon-32.png');

	const appleTouch = await sharp(sourcePath).resize(180, 180, { fit: 'cover' }).png().toBuffer();
	writeFileSync(appleTouchPath, appleTouch);
	console.log('  → public/apple-touch-icon.png');

	console.log('Done.');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
