'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { getMeKeyGenerator } from '@api/getMeQuery';
import { loginKeyGenerator } from '@api/loginMutation';
import type { LoginRequestData, LoginResponse } from '@api/loginMutation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { DEMO_EMAIL, DEMO_PASSWORD } from '@constants';

import Button from '@components/Button';

import { useToast } from '@stores/toast';

/** Signs straight into the demo account instead of detouring through /login. */
const DemoButton = () => {
  const t = useTranslations('landing.hero');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const loginMutation = useMutation<LoginResponse, Error, LoginRequestData>({
    mutationKey: loginKeyGenerator(),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(getMeKeyGenerator(), user);
      router.push('/overview');
    },
    onError: (err) => showToast(err.message || tAuth('login.loginFailed'), 'error'),
  });

  return (
    <Button
      variant="outline"
      className="w-full px-6 py-3 sm:w-auto"
      disabled={loginMutation.isPending}
      onClick={() => loginMutation.mutate({ email: DEMO_EMAIL, password: DEMO_PASSWORD })}
    >
      <span className="flex items-center justify-center gap-2">
        {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {t('tryDemo')}
      </span>
    </Button>
  );
};

export default DemoButton;
