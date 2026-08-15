import { describe, expect, it } from 'vitest';
import {
  DEMO_CREDENTIAL_SECRET,
  DEMO_CREDENTIAL_SECRET_HEX,
  isDemoCredential,
} from './demo-credential';
import { bytesToHex, hexToBytes } from './format';

describe('demo credential', () => {
  it('decodes to the documented ASCII secret', () => {
    const ascii = new TextDecoder().decode(DEMO_CREDENTIAL_SECRET);
    expect(ascii).toBe('veildrop-demo-credential-secret!');
  });

  it('isDemoCredential matches the demo secret only', () => {
    expect(isDemoCredential(DEMO_CREDENTIAL_SECRET)).toBe(true);
    expect(
      isDemoCredential(hexToBytes('0011'.repeat(16))),
    ).toBe(false);
  });

  it('bytesToHex agrees with the documented hex form', () => {
    expect(bytesToHex(DEMO_CREDENTIAL_SECRET)).toBe(
      DEMO_CREDENTIAL_SECRET_HEX,
    );
  });
});
