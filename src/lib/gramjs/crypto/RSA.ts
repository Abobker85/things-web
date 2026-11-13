import { THINGS_SERVER_KEY_E, THINGS_SERVER_KEY_FINGERPRINT, THINGS_SERVER_KEY_N } from '../../../config';
import { concat } from '../../../util/encoding/buffer';

import {
  generateRandomBytes,
  modExp,
  readBigIntFromBuffer,
  readBufferFromBigInt,
  sha1,
} from '../Helpers';

// Things: the server's public key comes from the build settings
export const SERVER_KEYS = new Map<bigint, { n: bigint; e: number }>(
  THINGS_SERVER_KEY_N ? [[
    BigInt(THINGS_SERVER_KEY_FINGERPRINT),
    { n: BigInt(`0x${THINGS_SERVER_KEY_N}`), e: THINGS_SERVER_KEY_E },
  ]] : [],
);

/**
 * Encrypts the given data known the fingerprint to be used
 * in the way Telegram requires us to do so (sha1(data) + data + padding)

 * @param fingerprint the fingerprint of the RSA key.
 * @param data the data to be encrypted.
 * @returns the cipher text, or undefined if no key matching this fingerprint is found.
 */
export async function encrypt(fingerprint: bigint, data: Uint8Array): Promise<Uint8Array | undefined> {
  const key = SERVER_KEYS.get(fingerprint);
  if (!key) {
    return undefined;
  }

  // len(sha1.digest) is always 20, so we're left with 255 - 20 - x padding
  const rand = generateRandomBytes(235 - data.length);

  const toEncrypt = concat(await sha1(data), data, rand);

  // rsa module rsa.encrypt adds 11 bits for padding which we don't want
  // rsa module uses rsa.transform.bytes2int(to_encrypt), easier way:
  const payload = readBigIntFromBuffer(toEncrypt, false);
  const encrypted = modExp(payload, BigInt(key.e), key.n);
  // rsa module uses transform.int2bytes(encrypted, keylength), easier:
  return readBufferFromBigInt(encrypted, 256, false);
}
