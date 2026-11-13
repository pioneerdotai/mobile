import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';

/** Native shell only. Copy the selected document into this app's cache; Rust
 * reads that local file and streams bytes using the existing Skills uploader. */
export const pickPluginArchive = async (skill = false) => {
    const selected = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
    });
    if (selected.canceled) return null;
    const asset = selected.assets[0];
    if (!asset) throw new Error('plugin_archive_required');
    const uri = new URL(asset.uri);
    const cache = new URL(Paths.cache.uri).pathname.replace(/\/?$/, '/');
    // Only delete a copy owned by this cache; never the original external file.
    if (
        uri.protocol !== 'file:' ||
        uri.hostname !== '' ||
        uri.search ||
        uri.hash ||
        !uri.pathname.startsWith(cache)
    )
        throw new Error('plugin_archive_required');
    const file = new File(asset.uri);
    const supported = (skill ? /\.(tar\.gz|tgz)$/i : /\.(zip|tar\.gz|tgz)$/i).test(asset.name);
    if (!supported || !file.exists || file.size <= 0 || file.size > 256 * 1024 * 1024) {
        try {
            file.delete();
        } catch {}
        throw new Error(supported ? 'plugin_archive_size_limit' : 'plugin_archive_required');
    }
    return {
        uri: asset.uri,
        remove: () => {
            try {
                file.delete();
            } catch {}
        },
    };
};
