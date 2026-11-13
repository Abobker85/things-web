import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { computeFingerprint, readThingsServerSettings } from './serverSettings';

// A published MTProto server key with its known fingerprint
const KNOWN_KEY_N = BigInt(
  '2937959817066933702298617714945612856538843112005886376816255642404751219133084745514657634448776440866'
  + '1701890505066208632169112269581063774293102577308490531282748465986139880977280302242772832972539403531'
  + '3160108704012876427630091361567343395380424193887227773571344877461690935390938502512438971889287359033'
  + '8945177273024525306296338410881284207988753897636046529094613963869149149606209957083647645485599631919'
  + '2747663615955633778034897140982517446405334423701359108810182097749467210509584293428076654573384828809'
  + '574217079944388301239431309115013843331317877374435868468779972014486325557807783825502498215169806323',
);
const KNOWN_KEY_FINGERPRINT = BigInt('-3414540481677951611');
const PUBLIC_EXPONENT = Buffer.from('010001', 'hex');

describe('Things server settings', () => {
  it('computes the MTProto fingerprint of a public key', () => {
    const n = Buffer.from(KNOWN_KEY_N.toString(16), 'hex');

    expect(computeFingerprint(n, PUBLIC_EXPONENT)).toBe(KNOWN_KEY_FINGERPRINT);
  });

  it('reads the same key from a PEM block, escaped line breaks and a bare base64 body', () => {
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = publicKey.export({ type: 'pkcs1', format: 'pem' }).toString();
    const body = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
    const spki = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const jwk = publicKey.export({ format: 'jwk' });
    const expectedN = Buffer.from(jwk.n!, 'base64url').toString('hex');

    for (const value of [pem, pem.replace(/\n/g, '\n'), body, spki]) {
      const env = { THINGS_SERVER_HOST: 'example.test', THINGS_SERVER_PUBLIC_KEY: value };
      const settings = readThingsServerSettings(env, true);

      expect(settings.TG_THINGS_SERVER_KEY_N).toBe(expectedN);
      expect(settings.TG_THINGS_SERVER_KEY_E).toBe('65537');
      expect(settings.TG_THINGS_SERVER_PORT).toBe('443');
      expect(settings.TG_THINGS_SERVER_DC_ID).toBe('2');
    }
  });

  it('refuses to build without a server when one is required, and stays empty when it is not', () => {
    expect(() => readThingsServerSettings({}, true)).toThrow('THINGS_SERVER_HOST');
    expect(readThingsServerSettings({}, false).TG_THINGS_SERVER_HOST).toBe('');
  });
});
