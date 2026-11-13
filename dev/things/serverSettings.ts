import { createHash, createPublicKey } from 'node:crypto';

const DEFAULT_DC_ID = '2';
const DEFAULT_PORT = '443';
const TL_SHORT_LENGTH_LIMIT = 254;
const TL_PADDING = 4;
const FINGERPRINT_BYTES = 8;

/**
 * Reads the Things server's address and RSA public key from the build settings
 * and returns them as the `TG_THINGS_*` values the app reads at run time.
 * The key's MTProto fingerprint is computed here, so the app only carries numbers.
 */
export function readThingsServerSettings(env: Record<string, string>, isRequired: boolean) {
  const host = env.THINGS_SERVER_HOST || '';
  const publicKey = env.THINGS_SERVER_PUBLIC_KEY || '';

  if (!host || !publicKey) {
    if (isRequired) {
      throw new Error('Missing required Things server settings: THINGS_SERVER_HOST, THINGS_SERVER_PUBLIC_KEY');
    }

    return {
      TG_THINGS_SERVER_HOST: '',
      TG_THINGS_SERVER_PORT: DEFAULT_PORT,
      TG_THINGS_SERVER_DC_ID: DEFAULT_DC_ID,
      TG_THINGS_SERVER_KEY_N: '',
      TG_THINGS_SERVER_KEY_E: '',
      TG_THINGS_SERVER_KEY_FINGERPRINT: '',
    };
  }

  const { n, e } = parseRsaPublicKey(publicKey);

  return {
    TG_THINGS_SERVER_HOST: host,
    TG_THINGS_SERVER_PORT: env.THINGS_SERVER_PORT || DEFAULT_PORT,
    TG_THINGS_SERVER_DC_ID: env.THINGS_SERVER_DC_ID || DEFAULT_DC_ID,
    TG_THINGS_SERVER_KEY_N: n.toString('hex'),
    TG_THINGS_SERVER_KEY_E: String(Number.parseInt(e.toString('hex'), 16)),
    TG_THINGS_SERVER_KEY_FINGERPRINT: computeFingerprint(n, e).toString(),
  };
}

// Accepts a PEM block (real or escaped line breaks) or only its base64 body, PKCS#1 or SPKI
function parseRsaPublicKey(value: string) {
  const body = value
    .replace(/\\n/g, '')
    .replace(/-----[A-Z ]+-----/g, '')
    .replace(/\s+/g, '');
  const der = Buffer.from(body, 'base64');

  let key;
  try {
    key = createPublicKey({ key: der, format: 'der', type: 'pkcs1' });
  } catch {
    key = createPublicKey({ key: der, format: 'der', type: 'spki' });
  }

  const jwk = key.export({ format: 'jwk' });
  if (!jwk.n || !jwk.e) {
    throw new Error('THINGS_SERVER_PUBLIC_KEY is not an RSA public key');
  }

  return {
    n: Buffer.from(jwk.n, 'base64url'),
    e: Buffer.from(jwk.e, 'base64url'),
  };
}

// MTProto: the lower 64 bits of SHA-1 over the TL-serialized `rsa_public_key n:string e:string`
export function computeFingerprint(n: Buffer, e: Buffer) {
  const hash = createHash('sha1')
    .update(serializeTlBytes(n))
    .update(serializeTlBytes(e))
    .digest();

  return hash.subarray(hash.length - FINGERPRINT_BYTES).readBigInt64LE();
}

function serializeTlBytes(data: Buffer) {
  const header = data.length < TL_SHORT_LENGTH_LIMIT
    ? Buffer.from([data.length])
    : Buffer.from([TL_SHORT_LENGTH_LIMIT, data.length & 0xff, (data.length >> 8) & 0xff, (data.length >> 16) & 0xff]);
  const padding = (TL_PADDING - ((header.length + data.length) % TL_PADDING)) % TL_PADDING;

  return Buffer.concat([header, data, Buffer.alloc(padding)]);
}
