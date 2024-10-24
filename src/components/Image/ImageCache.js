import * as RNFS from '@dr.pogodin/react-native-fs';

export const getImageDetails = (url) => {
    try {
        // Extract UID from URL - it's between /storage.../UID/profile/
        const uidMatch = url.match(/\/([^\/]+)\/profile\//);
        const uid = uidMatch ? uidMatch[1] : null;

        // Extract filename - it's after the last / before the ?
        const fileNameMatch = url.match(/\/([^\/]+)\?/);
        const fileName = fileNameMatch ? fileNameMatch[1] : null;

        return { uid, fileName };
    } catch (error) {
        console.error('Error extracting image details:', error);
        return { uid: null, fileName: null };
    }
};

// Image caching utilities
export const getImageFilename = (url) => {
    const { uid, fileName } = getImageDetails(url);
    if (!uid || !fileName) {
        console.error('Could not extract UID or filename from URL:', url);
        return null;
    }
    return `${uid}_${fileName}`;
};


export const checkImageInCache = async (url) => {
    const filename = getImageFilename(url);
    if (!filename) return null;

    const filePath = `${RNFS.CachesDirectoryPath}/${filename}`;

    try {
        const exists = await RNFS.exists(filePath);
        if (exists) {
            return `file://${filePath}`;
        }
        return null;
    } catch (error) {
        console.error('Error checking cache:', error);
        return null;
    }
};

export const cacheImage = async (url) => {
    try {
        const cachedPath = await checkImageInCache(url);
        if (cachedPath) {
            return cachedPath;
        }

        const filename = getImageFilename(url);
        if (!filename) return null;

        const filePath = `${RNFS.CachesDirectoryPath}/${filename}`;

        await RNFS.downloadFile({
            fromUrl: url,
            toFile: filePath,
        }).promise;

        return `file://${filePath}`;
    } catch (error) {
        console.error('Error caching image:', error);
        return null;
    }
};

export const deleteImage = async (url) => {
    try {
        const cachedPath = await checkImageInCache(url);
        if (cachedPath) {
            await RNFS.unlink(cachedPath);
        }
    } catch (error) {
        console.error('Error deleting image:', error);
    }
}
