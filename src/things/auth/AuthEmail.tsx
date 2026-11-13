import { memo, useEffect, useRef, useState } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';

import { IS_TOUCH_ENV } from '../../util/browser/windowEnvironment';
import { loadAndChangeLanguage } from '../../util/localization';
import { getSuggestedLanguage } from '../../components/auth/helpers/getSuggestedLanguage';

import useFlag from '../../hooks/useFlag';
import useLang from '../../hooks/useLang';
import useLangString from '../../hooks/useLangString';
import useLastCallback from '../../hooks/useLastCallback';

import Button from '../../components/ui/Button';
import Checkbox from '../../components/ui/Checkbox';
import InputText from '../../components/ui/InputText';
import Loading from '../../components/ui/Loading';

type StateProps = {
  auth: GlobalState['auth'];
  language?: string;
};

// Good enough to catch a slip. The server decides what a valid address is
const EMAIL_RE = /^\S+@\S+\.\S+$/;

const AuthEmail = ({
  auth,
  language,
}: StateProps) => {
  const {
    setAuthPhoneNumber,
    setAuthRememberMe,
    clearAuthErrorKey,
    goToAuthQrCode,
    setSharedSettingOption,
  } = getActions();

  const {
    state,
    phoneNumber: authEmail,
    isLoading: isAuthLoading,
    errorKey,
    rememberMe,
    isLoadingQrCode,
  } = auth;

  const lang = useLang();
  const inputRef = useRef<HTMLInputElement>();
  const suggestedLanguage = getSuggestedLanguage();
  const continueText = useLangString('AuthContinueOnThisLanguage', suggestedLanguage);

  const [email, setEmail] = useState(authEmail || '');
  const [isLanguageLoading, markIsLanguageLoading, unmarkIsLanguageLoading] = useFlag();

  const canSubmit = EMAIL_RE.test(email.trim());
  const isAuthReady = state === 'authorizationStateWaitPhoneNumber';

  useEffect(() => {
    if (!IS_TOUCH_ENV) {
      inputRef.current!.focus();
    }
  }, []);

  const handleEmailChange = useLastCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (errorKey) {
      clearAuthErrorKey();
    }

    setEmail(e.target.value);
  });

  const handleKeepSessionChange = useLastCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAuthRememberMe({ value: e.target.checked });
  });

  const handleLangChange = useLastCallback(async () => {
    markIsLanguageLoading();

    try {
      if (await loadAndChangeLanguage(suggestedLanguage)) {
        setSharedSettingOption({ language: suggestedLanguage });
      }
    } finally {
      unmarkIsLanguageLoading();
    }
  });

  const handleGoToAuthQrCode = useLastCallback(() => {
    goToAuthQrCode();
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isAuthLoading || !canSubmit) {
      return;
    }

    // The email travels through the phone number step shared with upstream
    setAuthPhoneNumber({ phoneNumber: email.trim() });
  }

  return (
    <div id="auth-phone-number-form" className="custom-scroll">
      <div className="auth-form">
        <div id="logo" />
        <h1>{lang('AuthTitle')}</h1>
        <p className="note">{lang('ThingsAuthEmailNote')}</p>
        <form className="form" action="" onSubmit={handleSubmit}>
          <InputText
            ref={inputRef}
            id="sign-in-email"
            label={lang('ThingsAuthEmailPlaceholder')}
            value={email}
            error={errorKey && lang.withRegular(errorKey)}
            inputMode="email"
            autoComplete="email"
            onChange={handleEmailChange}
          />
          <Checkbox
            id="sign-in-keep-session"
            label={lang('AuthKeepSignedIn')}
            checked={Boolean(rememberMe)}
            onChange={handleKeepSessionChange}
          />
          {canSubmit && (
            isAuthReady ? (
              <Button className="auth-button" type="submit" ripple isLoading={isAuthLoading}>
                {lang('LoginNext')}
              </Button>
            ) : (
              <Loading />
            )
          )}
          {isAuthReady && (
            <Button
              className="auth-button"
              isText
              ripple
              isLoading={isLoadingQrCode}
              onClick={handleGoToAuthQrCode}
            >
              {lang('LoginQRLogin')}
            </Button>
          )}
          {suggestedLanguage && suggestedLanguage !== language && continueText && (
            <Button className="auth-button" isText isLoading={isLanguageLoading} onClick={handleLangChange}>
              {continueText}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
};

export default memo(withGlobal(
  (global): Complete<StateProps> => {
    const { sharedState: { settings: { language } }, auth } = global;

    return {
      auth,
      language,
    };
  },
)(AuthEmail));
