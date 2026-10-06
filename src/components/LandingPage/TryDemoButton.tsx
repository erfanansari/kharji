'use client';

import { useState } from 'react';

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

// Signs the visitor straight into the shared demo account — no login form hop.
const TryDemoButton = () => {
  const t = useTranslations('landing.hero');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [failed, setFailed] = useState(false);

  const loginMutation = useMutation<LoginResponse, Error, LoginRequestData>({
    mutationKey: loginKeyGenerator(),
    onSuccess: ({ user }) => {
      queryClient.setQueryData(getMeKeyGenerator(), user);
      router.push('/overview');
    },
    onError: () => {
      setFailed(true);
      showToast(t('tryDemoFailed'), 'error');
      router.push('/login');
    },
  });

  return (
    <Button
      variant="outline"
      className="w-full px-6 py-3 sm:w-auto"
      disabled={loginMutation.isPending || failed}
      onClick={() => loginMutation.mutate({ email: DEMO_EMAIL, password: DEMO_PASSWORD })}
    >
      <span className="flex items-center justify-center gap-2">
        {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {t('tryDemo')}
      </span>
    </Button>
  );
};

export default TryDemoButton;
