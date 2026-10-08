/**
 * iOS PWA launch ("splash") screens.
 *
 * iOS ignores the web app manifest icons for the standalone launch screen, so it
 * needs an `apple-touch-startup-image` per device resolution with a matching media
 * query. The PNGs live in `public/splash/` (committed). Rendered inside the root
 * layout's <head>.
 */

// [device-width, device-height, device-pixel-ratio] in CSS pixels (portrait).
const SPLASH_SCREENS: ReadonlyArray<readonly [number, number, number]> = [
  [440, 956, 3], // iPhone 16 Pro Max
  [402, 874, 3], // iPhone 16 Pro
  [430, 932, 3], // iPhone 15/16 Plus, 14/15 Pro Max
  [393, 852, 3], // iPhone 14 Pro, 15/16
  [428, 926, 3], // iPhone 12/13 Pro Max
  [390, 844, 3], // iPhone 12/13/14
  [375, 812, 3], // iPhone X/XS/11 Pro, 12/13 mini
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [414, 896, 2], // iPhone XR, 11
  [414, 736, 3], // iPhone 6+/7+/8+
  [375, 667, 2], // iPhone 6/7/8, SE 2/3
  [320, 568, 2], // iPhone SE 1, 5s
  [1024, 1366, 2], // iPad Pro 12.9"
  [834, 1194, 2], // iPad Pro 11"
  [834, 1112, 2], // iPad Pro 10.5"
  [820, 1180, 2], // iPad Air 10.9"
  [810, 1080, 2], // iPad 10.2"
  [768, 1024, 2], // iPad mini / Air 9.7"
  [744, 1133, 2], // iPad mini 6
];

export default function AppleSplashScreens() {
  return (
    <>
      {SPLASH_SCREENS.map(([w, h, r]) => (
        <link
          key={`${w}-${h}-${r}`}
          rel="apple-touch-startup-image"
          media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`}
          href={`/splash/apple-splash-${w * r}-${h * r}.png`}
        />
      ))}
    </>
  );
}
