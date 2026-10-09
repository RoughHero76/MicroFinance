// react-native-device-info on the web: the browser and system stand in for
// the phone's make and model (shown in login history and crash reports).

const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;

function browser(): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Browser';
}

function system(): string {
  if (/Windows/.test(ua)) return 'Windows';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

const ID_KEY = 'web.deviceId';

export const getVersion = () => __APP_VERSION__;
export const getBuildNumber = () => 'web';
export const getBrand = () => browser();
export const getModel = () => `${browser()} on ${system()}`;
export const getSystemVersion = () => system();

/** A random id kept in this browser, for crash reports. */
export function getUniqueIdSync(): string {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return 'web-unknown';
  }
}

export default {getVersion, getBuildNumber, getBrand, getModel, getSystemVersion, getUniqueIdSync};
