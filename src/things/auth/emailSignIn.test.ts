import { describe, expect, it, vi } from 'vitest';
import type { UserAuthParams } from '../../lib/gramjs/client/auth';
import type TelegramClient from '../../lib/gramjs/client/TelegramClient';
import { RPCError } from '../../lib/gramjs/errors';
import Api from '../../lib/gramjs/tl/api';

import { signInUserWithEmail } from './emailSignIn';

const API_CREDENTIALS = { apiId: 1, apiHash: 'hash' };

function createUser(id: bigint) {
  return new Api.User({ id });
}

function createSentCode() {
  return new Api.auth.SentCode({
    type: new Api.auth.SentCodeTypeEmailCode({ emailPattern: 'a***@example.com', length: 6 }),
    phoneCodeHash: 'hash-1',
  });
}

function createAuthorization(user: Api.User) {
  return new Api.auth.Authorization({ user });
}

function createParams(overrides: Partial<UserAuthParams> = {}): UserAuthParams {
  return {
    phoneNumber: vi.fn(() => Promise.resolve('ada@example.com')),
    webAuthTokenFailed: vi.fn(),
    onPasskeyOption: vi.fn(),
    phoneCode: vi.fn(() => Promise.resolve('123456')),
    password: vi.fn(() => Promise.resolve('secret')),
    firstAndLastNames: vi.fn((): Promise<[string, string?]> => Promise.resolve(['Ada Lovelace', 'ada_user'])),
    qrCode: vi.fn(() => Promise.resolve()),
    onError: vi.fn(),
    ...overrides,
  };
}

type Reply = (request: Api.AnyRequest) => unknown;

function ready(value: unknown): Reply {
  return () => value;
}

function rejectWith(message: string, code: number): Reply {
  return (request) => {
    throw new RPCError(message, request, code);
  };
}

function createClient(replies: Reply[]) {
  const requests: Api.AnyRequest[] = [];
  const client = {
    invoke(request: Api.AnyRequest) {
      requests.push(request);
      const reply = replies[requests.length - 1];
      if (!reply) {
        throw new Error(`No reply for ${request.className}`);
      }

      return reply(request);
    },
  } as unknown as TelegramClient;

  return { client, requests };
}

function createSharedSteps() {
  const passwordUser = createUser(2n);
  const qrUser = createUser(3n);

  return {
    passwordUser,
    qrUser,
    signInWithPassword: vi.fn(() => Promise.resolve(passwordUser)),
    signInWithQrCode: vi.fn(() => Promise.resolve(qrUser)),
  };
}

describe('signInUserWithEmail', () => {
  it('signs in', async () => {
    const user = createUser(1n);
    const { client, requests } = createClient([ready(createSentCode()), ready(createAuthorization(user))]);
    const params = createParams();
    const sharedSteps = createSharedSteps();

    await expect(signInUserWithEmail(client, API_CREDENTIALS, params, sharedSteps)).resolves.toBe(user);

    expect(requests[0]).toBeInstanceOf(Api.emailauth.SendCode);
    expect((requests[0] as Api.emailauth.SendCode).email).toBe('ada@example.com');
    expect(params.phoneCode).toHaveBeenCalledWith(false, 6);
    expect(requests[1]).toBeInstanceOf(Api.emailauth.SignIn);
    expect((requests[1] as Api.emailauth.SignIn).code).toBe('123456');
    expect(sharedSteps.signInWithPassword).not.toHaveBeenCalled();
    expect(params.onError).not.toHaveBeenCalled();
  });

  it('goes to sign-up when the server requires a new account', async () => {
    const user = createUser(1n);
    const { client, requests } = createClient([
      ready(createSentCode()),
      ready(new Api.auth.AuthorizationSignUpRequired()),
      ready(createAuthorization(user)),
    ]);
    const params = createParams();

    await expect(signInUserWithEmail(client, API_CREDENTIALS, params, createSharedSteps())).resolves.toBe(user);

    expect(requests[2]).toBeInstanceOf(Api.emailauth.SignUp);
    const signUp = requests[2] as Api.emailauth.SignUp;
    expect(signUp.name).toBe('Ada Lovelace');
    expect(signUp.username).toBe('ada_user');
    expect(signUp.email).toBe('ada@example.com');
    expect(signUp.codeHash).toBe('hash-1');
  });

  it('hands over to the password step when the account has a password', async () => {
    const { client } = createClient([
      ready(createSentCode()),
      rejectWith('SESSION_PASSWORD_NEEDED', 401),
    ]);
    const params = createParams();
    const sharedSteps = createSharedSteps();

    const signedIn = await signInUserWithEmail(client, API_CREDENTIALS, params, sharedSteps);

    expect(signedIn).toBe(sharedSteps.passwordUser);
    expect(sharedSteps.signInWithPassword).toHaveBeenCalledOnce();
    expect(params.onError).not.toHaveBeenCalled();
    expect(params.password).not.toHaveBeenCalled();
  });

  it('asks for the moved v3 password', async () => {
    const user = createUser(4n);
    const { client, requests } = createClient([
      ready(createSentCode()),
      rejectWith('LEGACY_PASSWORD_NEEDED', 401),
      ready(new Api.emailauth.LegacyPassword({ hint: 'pet name', pendingResetDate: 1_800_000_000 })),
      ready(createAuthorization(user)),
    ]);
    const params = createParams();
    const sharedSteps = createSharedSteps();

    await expect(signInUserWithEmail(client, API_CREDENTIALS, params, sharedSteps)).resolves.toBe(user);

    expect(requests[2]).toBeInstanceOf(Api.emailauth.GetLegacyPassword);
    expect(params.password).toHaveBeenCalledWith('pet name', undefined, 1_800_000_000);
    expect(requests[3]).toBeInstanceOf(Api.emailauth.CheckLegacyPassword);
    expect((requests[3] as Api.emailauth.CheckLegacyPassword).password).toBe('secret');
    expect(sharedSteps.signInWithPassword).not.toHaveBeenCalled();
  });

  it('reports an invalid code and asks for it again', async () => {
    const user = createUser(1n);
    const codes = ['111111', '222222'];
    const { client, requests } = createClient([
      ready(createSentCode()),
      rejectWith('CODE_INVALID', 400),
      ready(createAuthorization(user)),
    ]);
    const params = createParams({
      phoneCode: vi.fn(() => {
        const code = codes.shift();
        if (!code) {
          throw new Error('missing code');
        }

        return Promise.resolve(code);
      }),
    });

    await expect(signInUserWithEmail(client, API_CREDENTIALS, params, createSharedSteps())).resolves.toBe(user);

    expect(params.onError).toHaveBeenCalledOnce();
    const reported = vi.mocked(params.onError).mock.calls[0][0];
    expect(reported).toBeInstanceOf(RPCError);
    expect((reported as RPCError).errorMessage).toBe('CODE_INVALID');
    expect(params.phoneCode).toHaveBeenCalledTimes(2);
    expect((requests[2] as Api.emailauth.SignIn).code).toBe('222222');
  });

  it('restarts from the email when the code step asks to', async () => {
    const user = createUser(1n);
    let askedForCode = 0;
    const { client, requests } = createClient([
      ready(createSentCode()),
      ready(createSentCode()),
      ready(createAuthorization(user)),
    ]);
    const params = createParams({
      phoneCode: vi.fn(() => {
        askedForCode += 1;
        if (askedForCode === 1) {
          throw new Error('RESTART_AUTH');
        }

        return Promise.resolve('654321');
      }),
    });

    await expect(signInUserWithEmail(client, API_CREDENTIALS, params, createSharedSteps())).resolves.toBe(user);

    expect(params.phoneNumber).toHaveBeenCalledTimes(2);
    expect(requests.filter((request) => request instanceof Api.emailauth.SendCode)).toHaveLength(2);
    expect(params.onError).not.toHaveBeenCalled();
  });

  it('switches to QR when the email step asks to', async () => {
    const { client, requests } = createClient([]);
    const params = createParams({
      phoneNumber: vi.fn(() => {
        throw new Error('RESTART_AUTH_WITH_QR');
      }),
    });
    const sharedSteps = createSharedSteps();

    const signedIn = await signInUserWithEmail(client, API_CREDENTIALS, params, sharedSteps);

    expect(signedIn).toBe(sharedSteps.qrUser);
    expect(sharedSteps.signInWithQrCode).toHaveBeenCalledOnce();
    expect(requests).toHaveLength(0);
    expect(params.phoneCode).not.toHaveBeenCalled();
  });
});
