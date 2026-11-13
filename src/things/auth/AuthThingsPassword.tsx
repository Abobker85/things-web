import { memo, useState } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { GlobalState } from '../../global/types';
import type { ThingsPasswordResetResult } from '../api/auth';

import { pick } from '../../util/iteratees';
import { callApi } from '../../api/gramjs';

import useFlag from '../../hooks/useFlag';
import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import PasswordForm from '../../components/common/PasswordForm';
import MonkeyPassword from '../../components/common/PasswordMonkey';
import Button from '../../components/ui/Button';

type StateProps = {
  auth: GlobalState['auth'];
};

const MS_IN_SECOND = 1000;

const AuthThingsPassword = ({
  auth,
}: StateProps) => {
  const { setAuthPassword, clearAuthErrorKey } = getActions();
  const {
    isLoading, errorKey, hint, passwordResetDate,
  } = auth;

  const lang = useLang();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [resetResult, setResetResult] = useState<ThingsPasswordResetResult | undefined>(
    passwordResetDate ? { status: 'scheduled', date: passwordResetDate } : undefined,
  );
  const [isResetLoading, markIsResetLoading, unmarkIsResetLoading] = useFlag();

  const handleSubmit = useLastCallback((password: string) => {
    setAuthPassword({ password });
  });

  const handleResetClick = useLastCallback(async () => {
    markIsResetLoading();

    try {
      const result = await callApi('requestEmailAuthPasswordReset');
      if (result) {
        setResetResult(result);
      }
    } finally {
      unmarkIsResetLoading();
    }
  });

  function formatDate(date: number) {
    return new Intl.DateTimeFormat(lang.code, { dateStyle: 'long' }).format(date * MS_IN_SECOND);
  }

  function renderResetNote(result: ThingsPasswordResetResult) {
    switch (result.status) {
      case 'scheduled':
        return lang('ThingsPasswordResetScheduled', { date: formatDate(result.date) });
      case 'tooSoon':
        return lang('ThingsPasswordResetTooSoon', { date: formatDate(result.date) });
      case 'done':
        return lang('ThingsPasswordResetDone');
    }
  }

  return (
    <div id="auth-password-form" className="custom-scroll">
      <div className="auth-form" dir={lang.isRtl ? 'rtl' : undefined}>
        <MonkeyPassword isPasswordVisible={isPasswordVisible} />
        <h1>{lang('LoginHeaderPassword')}</h1>
        <p className="note">{lang('LoginEnterPasswordDescription')}</p>
        <PasswordForm
          onClearError={clearAuthErrorKey}
          error={errorKey && lang.withRegular(errorKey)}
          hint={hint}
          isLoading={isLoading}
          isPasswordVisible={isPasswordVisible}
          onChangePasswordVisibility={setIsPasswordVisible}
          onSubmit={handleSubmit}
        />
        {resetResult ? (
          <p className="note" role="status">{renderResetNote(resetResult)}</p>
        ) : (
          <Button className="auth-button" isText isLoading={isResetLoading} onClick={handleResetClick}>
            {lang('ThingsForgotPassword')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default memo(withGlobal(
  (global): Complete<StateProps> => (
    pick(global, ['auth'])
  ),
)(AuthThingsPassword));
