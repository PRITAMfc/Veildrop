import { describe, expect, it } from 'vitest';
import { bigintToNumber, bytesToHex, hexToBytes, shorten } from './format';

describe('format helpers', () => {
  it('bytesToHex encodes bytes as lowercase hex', () => {
    expect(bytesToHex(new Uint8Array([0, 1, 15, 16, 255]))).toBe(
      '00010f10ff',
    );
  });

  it('hexToBytes decodes hex, tolerating a 0x prefix', () => {
    expect(hexToBytes('0xdeadbeef')).toEqual(
      new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    );
    expect(hexToBytes('deadbeef')).toEqual(
      new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    );
  });

  it('bytesToHex and hexToBytes are inverses', () => {
    const bytes = new Uint8Array(Array.from({ length: 64 }, (_, i) => i));
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
  });

  it('shorten keeps head and tail with an ellipsis', () => {
    expect(shorten('abcdefghijklmnop', 8, 6)).toBe('abcdefgh...klmnop');
  });

  it('shorten returns short values unchanged', () => {
    expect(shorten('abc', 8, 6)).toBe('abc');
  });

  it('bigintToNumber converts bigints to numbers', () => {
    expect(bigintToNumber(42n)).toBe(42);
  });
});
