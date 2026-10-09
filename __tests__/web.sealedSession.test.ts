import {describe, expect, it} from '@jest/globals';
import {fromBase64, isValidPin, sealToken, toBase64, unsealToken} from '@/lib/sealedSession';

describe('sealed session token', () => {
  it('opens with the right PIN', async () => {
    const sealed = await sealToken('jwt.token.value', '123456');
    expect(await unsealToken(sealed, '123456')).toBe('jwt.token.value');
  });

  it('does not open with a wrong PIN', async () => {
    const sealed = await sealToken('jwt.token.value', '123456');
    expect(await unsealToken(sealed, '654321')).toBeNull();
  });

  it('does not store the token or the PIN in the clear', async () => {
    const sealed = await sealToken('jwt.token.value', '123456');
    const text = JSON.stringify(sealed);
    expect(text).not.toContain('jwt.token.value');
    expect(text).not.toContain('123456');
  });

  it('uses a new salt and iv every time', async () => {
    const a = await sealToken('t', '123456');
    const b = await sealToken('t', '123456');
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });

  it('rejects a tampered copy', async () => {
    const sealed = await sealToken('t', '123456');
    const bytes = fromBase64(sealed.data);
    bytes[0] ^= 1;
    expect(await unsealToken({...sealed, data: toBase64(bytes)}, '123456')).toBeNull();
  });
});

describe('isValidPin', () => {
  it('wants exactly 6 digits', () => {
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a456')).toBe(false);
  });
});
