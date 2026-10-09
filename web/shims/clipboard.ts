// @react-native-clipboard/clipboard on the web.

const Clipboard = {
  setString(text: string) {
    navigator.clipboard?.writeText(text).catch(() => undefined);
  },
  async getString(): Promise<string> {
    try {
      return (await navigator.clipboard.readText()) ?? '';
    } catch {
      return '';
    }
  },
};

export default Clipboard;
