import type { ApiPasskeyOption } from '../../../api/types';
import type TelegramClient from './TelegramClient';
import type { Update } from './TelegramClient';

import { DEBUG } from '../../../config';
import { base64UrlToString } from '../../../util/encoding/base64';
import { tryParseBigInt } from '../../../util/numbers';
import { getServerTime } from '../../../util/serverTime';
import { buildInputPasskeyCredential } from '../../../api/gramjs/gramjsBuilders/passkeys';
import { signInUserWithEmail } from '../../../things/auth/emailSignIn';
import {
  PasskeyCredentialNotFoundError, PasskeyLoginRequestedError, RPCError, UserAlreadyAuthorizedError,
} from '../errors';
import Api from '../tl/api';

import { sleep } from '../Helpers';
import { computeCheck as computePasswordSrpCheck } from '../Password';
import { getDisplayName } from '../Utils';

export interface UserAuthParams {
  phoneNumber: string | (() => Promise<string>);
  webAuthTokenFailed: () => void;
  onPasskeyOption: (passkeyOption: ApiPasskeyOption) => void;
  phoneCode: (isCodeViaApp?: boolean, codeLength?: number) => Promise<string>;
  password: (hint?: string, noReset?: boolean, pendingResetDate?: number) => Promise<string>;
  firstAndLastNames: () => Promise<[string, string?]>;
  qrCode: (qrCode: { token: Uint8Array; expires: number }) => Promise<void>;
  onError: (err: Error) => void;
  forceSMS?: boolean;
  initialMethod?: 'phoneNumber' | 'qrCode';
  shouldThrowIfUnauthorized?: boolean;
  webAuthToken?: string;
  webAuthUserId?: string;
  accountIds?: string[];
  hasPasskeySupport?: boolean;
}

export interface BotAuthParams {
  botAuthToken: string;
}

interface ApiCredentials {
  apiId: number;
  apiHash: string;
}

type AuthMethod = 'phoneNumber' | 'qrCode';
const DEFAULT_INITIAL_METHOD: AuthMethod = 'phoneNumber';
let lastUsedMethod: AuthMethod = DEFAULT_INITIAL_METHOD;

export async function authFlow(
  client: TelegramClient,
  apiCredentials: ApiCredentials,
  authParams: UserAuthParams | BotAuthParams,
) {
  let me: Api.TypeUser;

  if ('botAuthToken' in authParams) {
    me = await signInBot(client, apiCredentials, authParams);
  } else if ('webAuthToken' in authParams && authParams.webAuthToken) {
    me = await signInUserWithWebToken(client, apiCredentials, authParams);
  } else {
    me = await signInUserWithPreferredMethod(client, apiCredentials, authParams);
  }

  client._log.info(`Signed in successfully as ${getDisplayName(me)}`);
}

export function signInUserWithPreferredMethod(
  client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserAuthParams,
): Promise<Api.TypeUser> {
  const { initialMethod = DEFAULT_INITIAL_METHOD } = authParams;

  refreshPasskeyLoginOption(client, apiCredentials, authParams);

  if (initialMethod === 'phoneNumber') {
    return signInUser(client, apiCredentials, authParams);
  } else {
    return signInUserWithQrCode(client, apiCredentials, authParams);
  }
}

function refreshPasskeyLoginOption(
  client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserAuthParams,
) {
  if (!authParams.hasPasskeySupport) return;
  obtainPasskeyLoginOption(client, apiCredentials).then((passkeyOption) => {
    if (passkeyOption) {
      authParams.onPasskeyOption(passkeyOption);
    }
  }).catch((err: unknown) => {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.error('Failed to obtain passkey login option:', err);
    }
  });
}

export async function checkAuthorization(client: TelegramClient, shouldThrow = false) {
  try {
    await client.invoke(new Api.updates.GetState());
    return true;
  } catch (err: unknown) {
    if ((err instanceof Error && err.message === 'Disconnect') || shouldThrow) throw err;
    return false;
  }
}

async function signInUserWithWebToken(
  client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserAuthParams,
): Promise<Api.TypeUser> {
  let hasUnsafeAuthorization = false;
  try {
    let user: Api.TypeUser;
    try {
      const { apiId, apiHash } = apiCredentials;
      const result = await client.invoke(new Api.auth.ImportWebTokenAuthorization({
        webAuthToken: authParams.webAuthToken!, apiId, apiHash,
      }));
      if (!(result instanceof Api.auth.Authorization)) throw new Error('SIGN_UP_REQUIRED');
      user = result.user;
    } catch (err: unknown) {
      if (!(err instanceof RPCError) || err.errorMessage !== 'SESSION_PASSWORD_NEEDED') throw err;
      user = await signInWithPassword(client, apiCredentials, authParams, true);
    }
    if (user.id.toString() !== authParams.webAuthUserId) {
      hasUnsafeAuthorization = true;
      await client.invoke(new Api.auth.LogOut());
      hasUnsafeAuthorization = false;
      throw new Error('WEB_AUTH_USER_MISMATCH');
    }
    return user;
  } catch (err: unknown) {
    client._log.error(`Failed to login with web token: ${String(err)}`);
    authParams.webAuthTokenFailed();
    if (hasUnsafeAuthorization) {
      client.destroy();
      throw new Error('WEB_AUTH_USER_MISMATCH', { cause: err });
    }
    return signInUserWithPreferredMethod(client, apiCredentials, authParams);
  }
}

// Things: accounts sign in by email, never by phone. The phone callbacks carry the email flow's steps
function signInUser(
  client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserAuthParams,
): Promise<Api.TypeUser> {
  lastUsedMethod = 'phoneNumber';

  return signInUserWithEmail(client, apiCredentials, authParams, {
    signInWithPassword: () => signInWithPassword(client, apiCredentials, authParams),
    signInWithQrCode: () => signInUserWithQrCode(client, apiCredentials, authParams),
  });
}

async function signInUserWithQrCode(
  client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserAuthParams,
): Promise<Api.TypeUser> {
  let isScanningComplete = false;

  const { apiId, apiHash } = apiCredentials;
  const exceptIds = authParams.accountIds?.map((id) => tryParseBigInt(id)).filter(Boolean) || [];

  lastUsedMethod = 'qrCode';

  const inputPromise = (async () => {
    // eslint-disable-next-line no-constant-condition
    while (1) {
      if (isScanningComplete) {
        break;
      }

      const result = await client.invoke(new Api.auth.ExportLoginToken({
        apiId,
        apiHash,
        exceptIds,
      }));
      if (!(result instanceof Api.auth.LoginToken)) {
        throw new Error('Unexpected');
      }

      const { token, expires } = result;

      await Promise.race([
        authParams.qrCode({ token, expires }),
        sleep((expires - getServerTime()) * 1000),
      ]);
    }
  })();

  const updatePromise = new Promise<void>((resolve) => {
    client.addEventHandler((update: Api.TypeUpdate) => {
      if (update instanceof Api.UpdateLoginToken) {
        resolve();
      }
    }, { build: (update: Update) => update });
  });

  try {
    // Either we receive an update that QR is successfully scanned,
    // or we receive a rejection caused by user going back to the regular auth form
    await Promise.race([updatePromise, inputPromise]);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'RESTART_AUTH') {
      return await signInUser(client, apiCredentials, authParams);
    }

    if (err instanceof PasskeyLoginRequestedError) {
      return await signInUserWithPasskey(client, apiCredentials, authParams, err.credentialJson);
    }

    throw err;
  } finally {
    isScanningComplete = true;
  }

  try {
    const result2 = await client.invoke(new Api.auth.ExportLoginToken({
      apiId,
      apiHash,
      exceptIds,
    }));

    if (result2 instanceof Api.auth.LoginTokenSuccess && result2.authorization instanceof Api.auth.Authorization) {
      return result2.authorization.user;
    } else if (result2 instanceof Api.auth.LoginTokenMigrateTo) {
      await client._switchDC(result2.dcId);
      const migratedResult = await client.invoke(new Api.auth.ImportLoginToken({
        token: result2.token,
      }));

      if (migratedResult instanceof Api.auth.LoginTokenSuccess
        && migratedResult.authorization instanceof Api.auth.Authorization) {
        return migratedResult.authorization.user;
      }
    }
  } catch (err: unknown) {
    if (err instanceof RPCError && err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      return signInWithPassword(client, apiCredentials, authParams);
    }

    throw err;
  }

  // This is a workaround for TypeScript (never actually reached)
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  throw undefined;
}

export async function obtainPasskeyLoginOption(
  client: TelegramClient, apiCredentials: ApiCredentials,
): Promise<ApiPasskeyOption | undefined> {
  const { apiId, apiHash } = apiCredentials;
  const passkeyLoginOptions = await client.invoke(new Api.auth.InitPasskeyLogin({
    apiId,
    apiHash,
  }));

  if (!passkeyLoginOptions) return undefined;

  try {
    return JSON.parse(passkeyLoginOptions.options.data) as ApiPasskeyOption;
  } catch (err: unknown) {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.warn('Failed to parse passkey login options:', err);
    }
  }
  return undefined;
}

export async function signInUserWithPasskey(
  client: TelegramClient,
  apiCredentials: ApiCredentials,
  authParams: UserAuthParams,
  credentialJson: AuthenticationResponseJSON,
): Promise<Api.TypeUser> {
  try {
    if (!credentialJson.response.userHandle) {
      throw new Error('User handle is empty');
    }

    const userHandle = base64UrlToString(credentialJson.response.userHandle);
    const [userDcIdStr, userId] = userHandle.split(':');
    if (!userDcIdStr || !userId || isNaN(Number(userDcIdStr))) {
      throw new Error('Unexpected user handle format');
    }

    const userDcId = Number(userDcIdStr);
    if (authParams.accountIds?.includes(userId)) {
      throw new UserAlreadyAuthorizedError(userId);
    }

    const fromDcId = client.session.dcId;
    const unsignedFromAuthKeyId = client.session.getAuthKey(fromDcId).keyId; // Auth key id bytes are stored as unsigned 64-bit integer, long is signed
    const signedFromAuthKeyId = unsignedFromAuthKeyId ? BigInt.asIntN(64, unsignedFromAuthKeyId) : undefined;

    const isSwitchingDc = fromDcId !== userDcId;
    if (isSwitchingDc) {
      await client._switchDC(userDcId);
    }

    const result = await client.invoke(new Api.auth.FinishPasskeyLogin({
      credential: buildInputPasskeyCredential(credentialJson),
      fromDcId: isSwitchingDc ? fromDcId : undefined,
      fromAuthKeyId: isSwitchingDc ? signedFromAuthKeyId : undefined,
    }));

    if (result instanceof Api.auth.Authorization) {
      return result.user;
    }

    throw new Error('Unexpected sign up in passkey login');
  } catch (err: unknown) {
    // We cannot call finishPasskeyLogin again with the same challenge
    refreshPasskeyLoginOption(client, apiCredentials, authParams);

    const isPasskeyUnknownError = err instanceof PasskeyCredentialNotFoundError;

    if (isPasskeyUnknownError) {
      authParams.onError(err);
    }

    if (err instanceof Error) {
      if (err.message === 'RESTART_AUTH' || (isPasskeyUnknownError && lastUsedMethod === 'phoneNumber')) {
        return signInUser(client, apiCredentials, authParams);
      }

      if (err.message === 'RESTART_AUTH_WITH_QR' || (isPasskeyUnknownError && lastUsedMethod === 'qrCode')) {
        return signInUserWithQrCode(client, apiCredentials, authParams);
      }
    }

    if (err instanceof RPCError && err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      return signInWithPassword(client, apiCredentials, authParams);
    }

    if (err instanceof Error) {
      authParams.onError(err);
    }

    throw err;
  }
}

async function signInWithPassword(
  client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserAuthParams, noReset = false,
): Promise<Api.TypeUser> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    try {
      const passwordSrpResult = await client.invoke(new Api.account.GetPassword());
      const password = await authParams.password(passwordSrpResult.hint, noReset);
      if (!password) {
        throw new Error('Password is empty');
      }

      const passwordSrpCheck = await computePasswordSrpCheck(passwordSrpResult, password);
      const { user } = await client.invoke(new Api.auth.CheckPassword({
        password: passwordSrpCheck,
      })) as Api.auth.Authorization;

      return user;
    } catch (err: any) {
      authParams.onError(err);
    }
  }

  return undefined!; // Never reached (TypeScript fix)
}

async function signInBot(client: TelegramClient, apiCredentials: ApiCredentials, authParams: BotAuthParams) {
  const { apiId, apiHash } = apiCredentials;
  const { botAuthToken } = authParams;

  const { user } = await client.invoke(new Api.auth.ImportBotAuthorization({
    apiId,
    apiHash,
    botAuthToken,
  })) as Api.auth.Authorization;

  return user;
}
