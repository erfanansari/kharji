import GoogleSignInButton from '..';
import { googleSignInKeyGenerator } from '@api/googleSignInMutation';
import userEvent from '@testing-library/user-event';

import { makeTestQueryClient, render, screen } from '@/__tests__/test-utils';

const TELEGRAM_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; SM-A515F Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.144 Mobile Safari/537.36';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: userAgent, configurable: true });
}

function renderButton() {
  const queryClient = makeTestQueryClient();
  const mutationFn = jest.fn().mockResolvedValue({ url: 'https://accounts.google.com/o/oauth2/auth' });
  queryClient.setMutationDefaults([...googleSignInKeyGenerator()], { mutationFn });
  render(<GoogleSignInButton />, { queryClient });
  return { mutationFn };
}

describe('GoogleSignInButton', () => {
  it('starts the Google flow in a real browser', async () => {
    setUserAgent(CHROME_ANDROID);
    // The button navigates to the OAuth URL, which jsdom can't do. Hide only that notice.
    const consoleError = console.error;
    jest.spyOn(console, 'error').mockImplementation((...args) => {
      if (String(args[0]).includes('Not implemented: navigation')) return;
      consoleError(...args);
    });
    const { mutationFn } = renderButton();

    await userEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));

    expect(mutationFn).toHaveBeenCalled();
    jest.mocked(console.error).mockRestore();
  });

  it('explains the problem instead of redirecting inside an in-app browser', async () => {
    setUserAgent(TELEGRAM_ANDROID);
    renderButton();

    // Google answers 403 disallowed_useragent there, so the button must not appear at all.
    expect(await screen.findByText("Google sign-in doesn't work here")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue with Google/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in browser' })).toHaveAttribute(
      'href',
      expect.stringContaining('intent://')
    );
  });
});
