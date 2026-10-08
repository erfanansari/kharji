import type { FC, PropsWithChildren } from 'react';

import AuthGuard from '@features/guards/AuthGuard';
import OnboardingGuard from '@features/guards/OnboardingGuard';
import GettingStartedLauncher from '@features/onboarding/GettingStartedLauncher';

import DashboardLayout from '@components/DashboardLayout';

const DashboardRootLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <AuthGuard>
      <OnboardingGuard>
        <DashboardLayout>{children}</DashboardLayout>
        <GettingStartedLauncher />
      </OnboardingGuard>
    </AuthGuard>
  );
};

export default DashboardRootLayout;
