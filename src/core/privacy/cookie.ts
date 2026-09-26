/**
 * Privacy mode ("hide my amounts") is stored in a cookie rather than the
 * database, so the server can render the first frame already masked. Reading it
 * on the client only — via localStorage or an effect — would paint the real
 * figures and swap them a frame later, which is a leak of exactly the data the
 * feature exists to hide.
 *
 * It is also deliberately per-device, not per-account: the phone you carry into
 * the office and the laptop at home want different answers.
 */
export const PRIVACY_COOKIE = 'kharji-privacy';

export const PRIVACY_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Anything other than an explicit "1" means visible — never fail closed here. */
export function isPrivacyHidden(cookieValue: string | undefined): boolean {
  return cookieValue === '1';
}

/** Client-side write, mirroring how LocaleToggle persists the locale cookie. */
export function writePrivacyCookie(hidden: boolean): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const maxAge = hidden ? PRIVACY_COOKIE_MAX_AGE : 0;
  document.cookie = `${PRIVACY_COOKIE}=${hidden ? '1' : ''}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}
