import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = join(root, 'node_modules', 'react-native-enriched-markdown');
const assetsRoot = join(root, 'patches', 'react-native-enriched-markdown-assets');

const assets = [
    ['android/enrm_link_globe.xml', 'android/src/main/res/drawable/enrm_link_globe.xml'],
    ['android/enrm_link_file.xml', 'android/src/main/res/drawable/enrm_link_file.xml'],
    ['ios/Contents.json', 'ios/assets/LinkIcons.xcassets/LinkGlobe.imageset/Contents.json'],
    ['ios/globe.svg', 'ios/assets/LinkIcons.xcassets/LinkGlobe.imageset/globe.svg'],
    ['ios/FileContents.json', 'ios/assets/LinkIcons.xcassets/LinkFile.imageset/Contents.json'],
    ['ios/file.svg', 'ios/assets/LinkIcons.xcassets/LinkFile.imageset/file.svg'],
];

for (const [source, destination] of assets) {
    const destinationPath = join(packageRoot, destination);
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(join(assetsRoot, source), destinationPath);
}
