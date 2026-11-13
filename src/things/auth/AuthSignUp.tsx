import { memo, useRef, useState } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';
import type { ThingsUsernameCheckResult } from '../api/auth';

import { pick } from '../../util/iteratees';
import { callApi } from '../../api/gramjs';

import useDebouncedCallback from '../../hooks/useDebouncedCallback';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import AvatarEditable from '../../components/ui/AvatarEditable';
import Button from '../../components/ui/Button';
import InputText from '../../components/ui/InputText';

type StateProps = {
  auth: GlobalState['auth'];
};

const USERNAME_CHECK_DEBOUNCE = 300;
const USERNAME_MAX_LENGTH = 32;
// The rule the server applies: 5 to 32 letters, digits and `_`, starting with a letter and not ending with `_`
const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/;

const AuthSignUp = ({
  auth,
}: StateProps) => {
  const { signUp, clearAuthErrorKey, uploadProfilePhoto } = getActions();
  const { isLoading, errorKey } = auth;

  const lang = useLang();
  const latestUsernameRef = useRef('');
  const [croppedFile, setCroppedFile] = useState<File | undefined>();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameCheck, setUsernameCheck] = useState<ThingsUsernameCheckResult | undefined>();

  const isUsernameWellFormed = USERNAME_RE.test(username);
  const canSubmit = Boolean(name.trim()) && isUsernameWellFormed && usernameCheck === 'free';

  const checkUsername = useDebouncedCallback(async (value: string) => {
    const result = await callApi('checkEmailAuthUsername', value);

    // Drop the answer when the username was edited while the check was under way
    if (latestUsernameRef.current === value) {
      setUsernameCheck(result);
    }
  }, [], USERNAME_CHECK_DEBOUNCE, true);

  const handleNameChange = useLastCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (errorKey) {
      clearAuthErrorKey();
    }

    setName(event.target.value);
  });

  const handleUsernameChange = useLastCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (errorKey) {
      clearAuthErrorKey();
    }

    const value = event.target.value.trim();
    latestUsernameRef.current = value;
    setUsername(value);
    setUsernameCheck(undefined);

    if (USERNAME_RE.test(value)) {
      checkUsername(value);
    }
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || isLoading) {
      return;
    }

    // The name and username travel through the first and last name step shared with upstream
    signUp({ firstName: name.trim(), lastName: username });

    if (croppedFile) {
      uploadProfilePhoto({ file: croppedFile });
    }
  }

  function getUsernameError() {
    if (username && !isUsernameWellFormed) return lang('ThingsUsernameInvalid');
    if (usernameCheck === 'invalid') return lang('ThingsUsernameInvalid');
    if (usernameCheck === 'taken') return lang('ThingsUsernameTaken');

    return undefined;
  }

  return (
    <div id="auth-registration-form" className="custom-scroll">
      <div className="auth-form" dir={lang.isRtl ? 'rtl' : undefined}>
        <form action="" method="post" onSubmit={handleSubmit}>
          <AvatarEditable onChange={setCroppedFile} />
          <h2>{lang('ThingsSignUpTitle')}</h2>
          <p className="note">{lang('ThingsSignUpNote')}</p>
          <InputText
            id="registration-name"
            label={lang('ThingsSignUpName')}
            onChange={handleNameChange}
            value={name}
            error={errorKey && lang.withRegular(errorKey)}
            autoComplete="name"
          />
          <InputText
            id="registration-username"
            label={lang('Username')}
            onChange={handleUsernameChange}
            value={username}
            error={getUsernameError()}
            success={usernameCheck === 'free' ? lang('ThingsUsernameFree') : undefined}
            maxLength={USERNAME_MAX_LENGTH}
            autoComplete="username"
          />
          {canSubmit && (
            <Button type="submit" ripple isLoading={isLoading}>{lang('Next')}</Button>
          )}
        </form>
      </div>
    </div>
  );
};

export default memo(withGlobal(
  (global): Complete<StateProps> => (
    pick(global, ['auth'])
  ),
)(AuthSignUp));
