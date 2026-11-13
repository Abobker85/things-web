import { memo, useEffect, useRef, useState } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';

import { IS_TOUCH_ENV } from '../../util/browser/windowEnvironment';
import { pick } from '../../util/iteratees';

import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import Icon from '../../components/common/icons/Icon';
import TrackingMonkey from '../../components/common/TrackingMonkey';
import InputText from '../../components/ui/InputText';
import Loading from '../../components/ui/Loading';

type StateProps = {
  auth: GlobalState['auth'];
};

// Used until the server says how long its codes are
const DEFAULT_CODE_LENGTH = 6;

const AuthEmailCode = ({
  auth,
}: StateProps) => {
  const {
    setAuthCode,
    returnToAuthPhoneNumber,
    clearAuthErrorKey,
  } = getActions();

  const {
    phoneNumber: email, codeLength = DEFAULT_CODE_LENGTH, isLoading, errorKey,
  } = auth;

  const lang = useLang();
  const inputRef = useRef<HTMLInputElement>();

  const [code, setCode] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingDirection, setTrackingDirection] = useState(1);

  useEffect(() => {
    if (!IS_TOUCH_ENV) {
      inputRef.current!.focus();
    }
  }, []);

  // The screen stays mounted, so the old code must not meet the next one
  const handleReturnToEmail = useLastCallback(() => {
    setCode('');
    setIsTracking(false);
    returnToAuthPhoneNumber();
  });

  useHistoryBack({
    isActive: true,
    onBack: handleReturnToEmail,
  });

  const handleCodeChange = useLastCallback((e: React.FormEvent<HTMLInputElement>) => {
    if (errorKey) {
      clearAuthErrorKey();
    }

    const { currentTarget: target } = e;
    target.value = target.value.replace(/[^\d]+/g, '').slice(0, codeLength);

    if (target.value === code) {
      return;
    }

    setIsTracking(target.value.length > 0);
    setTrackingDirection(code.length > target.value.length ? -1 : 1);
    setCode(target.value);

    if (target.value.length === codeLength) {
      setAuthCode({ code: target.value });
    }
  });

  return (
    <div id="auth-code-form" className="custom-scroll">
      <div className="auth-form" dir={lang.isRtl ? 'rtl' : undefined}>
        <TrackingMonkey
          code={code}
          codeLength={codeLength}
          isTracking={isTracking}
          trackingDirection={trackingDirection}
        />
        <h1>
          <span dir="ltr">{email}</span>
          <div
            className="auth-number-edit div-button"
            onClick={handleReturnToEmail}
            role="button"
            tabIndex={0}
            title={lang('ThingsAuthWrongEmail')}
            aria-label={lang('ThingsAuthWrongEmail')}
          >
            <Icon name="edit" />
          </div>
        </h1>
        <p className="note">{lang('ThingsAuthCodeNote')}</p>
        <InputText
          ref={inputRef}
          id="sign-in-code"
          label={lang('Code')}
          onInput={handleCodeChange}
          value={code}
          error={errorKey && lang.withRegular(errorKey)}
          autoComplete="one-time-code"
          inputMode="numeric"
        />
        {isLoading && <Loading />}
      </div>
    </div>
  );
};

export default memo(withGlobal(
  (global): Complete<StateProps> => (
    pick(global, ['auth'])
  ),
)(AuthEmailCode));
