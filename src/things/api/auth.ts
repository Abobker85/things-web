import { RPCError } from '../../lib/gramjs/errors';
import { Api as GramJs } from '../../lib/gramjs/tl';

import { invokeRequest } from '../../api/gramjs/methods/client';

export type ThingsUsernameCheckResult = 'free' | 'taken' | 'invalid';

export type ThingsPasswordResetResult = {
  status: 'done';
} | {
  // The password goes away on `date`; until then it still signs in
  status: 'scheduled';
  date: number;
} | {
  // A reset was asked for recently; a new one can be asked for on `date`
  status: 'tooSoon';
  date: number;
};

// Works before sign-in. Once signed in, upstream's `account.checkUsername` is the one to use
export async function checkEmailAuthUsername(username: string): Promise<ThingsUsernameCheckResult | undefined> {
  try {
    const isFree = await invokeRequest(new GramJs.emailauth.CheckUsername({ username }), { shouldThrow: true });

    return isFree ? 'free' : 'taken';
  } catch (err: unknown) {
    if (!(err instanceof RPCError)) return undefined;
    if (err.errorMessage === 'USERNAME_INVALID') return 'invalid';
    if (err.errorMessage === 'USERNAME_TAKEN' || err.errorMessage === 'USERNAME_OCCUPIED') return 'taken';

    return undefined;
  }
}

export async function requestEmailAuthPasswordReset(): Promise<ThingsPasswordResetResult | undefined> {
  const result = await invokeRequest(new GramJs.emailauth.ResetPassword());
  if (!result) return undefined;

  if (result instanceof GramJs.account.ResetPasswordRequestedWait) {
    return { status: 'scheduled', date: result.untilDate };
  }

  if (result instanceof GramJs.account.ResetPasswordFailedWait) {
    return { status: 'tooSoon', date: result.retryDate };
  }

  return { status: 'done' };
}
