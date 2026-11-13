import type { UserAuthParams } from '../../lib/gramjs/client/auth';
import type TelegramClient from '../../lib/gramjs/client/TelegramClient';
import { RPCError } from '../../lib/gramjs/errors';
import Api from '../../lib/gramjs/tl/api';

type ApiCredentials = {
  apiId: number;
  apiHash: string;
};

// Steps the email flow hands over to: they belong to upstream's sign-in code
type SharedSteps = {
  signInWithPassword: () => Promise<Api.TypeUser>;
  signInWithQrCode: () => Promise<Api.TypeUser>;
};

/**
 * Signs in with a code sent by email (`emailauth.*`), the way a Things account signs in.
 * It asks through the same callbacks as upstream's phone flow: `phoneNumber` gives the email,
 * `phoneCode` the code, and `firstAndLastNames` the name and username of a new account.
 */
export async function signInUserWithEmail(
  client: TelegramClient, apiCredentials: ApiCredentials, authParams: UserAuthParams, sharedSteps: SharedSteps,
): Promise<Api.TypeUser> {
  const { apiId, apiHash } = apiCredentials;
  let email: string;
  let codeHash: string;
  let codeLength: number | undefined;

  while (true) {
    try {
      if (typeof authParams.phoneNumber === 'function') {
        try {
          email = await authParams.phoneNumber();
        } catch (err: unknown) {
          if (err instanceof Error && err.message === 'RESTART_AUTH_WITH_QR') {
            return await sharedSteps.signInWithQrCode();
          }

          throw err;
        }
      } else {
        email = authParams.phoneNumber;
      }

      const sentCode = await client.invoke(new Api.emailauth.SendCode({
        email, apiId, apiHash, settings: new Api.CodeSettings(),
      }));
      if (!(sentCode instanceof Api.auth.SentCode)) {
        throw new Error('Failed to retrieve email code hash');
      }

      codeHash = sentCode.phoneCodeHash;
      codeLength = sentCode.type instanceof Api.auth.SentCodeTypeEmailCode ? sentCode.type.length : undefined;
      break;
    } catch (err: unknown) {
      if (typeof authParams.phoneNumber !== 'function') {
        throw err;
      }

      authParams.onError(err as Error);
    }
  }

  while (true) {
    try {
      let code: string | undefined;
      try {
        code = await authParams.phoneCode(false, codeLength);
      } catch (err: unknown) {
        // The code screen lets the person go back and change the email
        if (err instanceof Error && err.message === 'RESTART_AUTH') {
          return signInUserWithEmail(client, apiCredentials, authParams, sharedSteps);
        }
      }

      if (!code) {
        throw new Error('Code is empty');
      }

      const result = await client.invoke(new Api.emailauth.SignIn({ email, codeHash, code }));
      if (result instanceof Api.auth.AuthorizationSignUpRequired) {
        break;
      }

      return result.user;
    } catch (err: unknown) {
      if (err instanceof RPCError && err.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        return sharedSteps.signInWithPassword();
      }

      if (err instanceof RPCError && err.errorMessage === 'LEGACY_PASSWORD_NEEDED') {
        return signInWithLegacyPassword(client, authParams);
      }

      authParams.onError(err as Error);
    }
  }

  while (true) {
    try {
      const [name, username] = await authParams.firstAndLastNames();
      if (!name || !username) {
        throw new Error('Name and username are required');
      }

      const result = await client.invoke(new Api.emailauth.SignUp({
        email, codeHash, name, username,
      }));
      if (!(result instanceof Api.auth.Authorization)) {
        throw new Error('Sign-up did not sign in');
      }

      return result.user;
    } catch (err: unknown) {
      authParams.onError(err as Error);
    }
  }
}

// An account moved from Things v3 keeps its v3 password until it is checked here once
async function signInWithLegacyPassword(client: TelegramClient, authParams: UserAuthParams): Promise<Api.TypeUser> {
  while (true) {
    try {
      const legacyPassword = await client.invoke(new Api.emailauth.GetLegacyPassword());
      const password = await authParams.password(legacyPassword.hint, undefined, legacyPassword.pendingResetDate);
      if (!password) {
        throw new Error('Password is empty');
      }

      const result = await client.invoke(new Api.emailauth.CheckLegacyPassword({ password }));
      if (!(result instanceof Api.auth.Authorization)) {
        throw new Error('Password check did not sign in');
      }

      return result.user;
    } catch (err: unknown) {
      authParams.onError(err as Error);
    }
  }
}
