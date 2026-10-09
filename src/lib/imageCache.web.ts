// Photos load straight from their URL; the browser's own cache keeps them.

export function cachedPathSync(url: string): string | null {
  return url || null;
}

export async function cachedImage(url: string): Promise<string | null> {
  return url || null;
}

export async function forgetImage(_url: string): Promise<void> {}
