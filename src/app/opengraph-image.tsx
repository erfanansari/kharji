import { ImageResponse } from 'next/og';

// No `runtime = 'edge'` here on purpose. Nothing in this image depends on the
// request, so Next prerenders it once at build time and the CDN serves the PNG.
// Opting into the edge runtime forces a fresh Satori render for every crawler
// and link unfurl instead — pure function CPU for a picture that never changes.
export const alt = 'Kharji – Personal Finance Tracker';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Cobalt palette literals — Satori can't read CSS custom properties, so these
// mirror the `.dark` block in src/styles/globals.css by hand.
const CANVAS = '#121214';
const TILE_TOP = '#3b7bee';
const TILE_BOTTOM = '#1a4fc4';
const HEADING = '#ececee';
const MUTED = '#a6a6aa';
const BORDER = '#313134';
const PILL_TEXT = '#949498';

const TILE = 112;

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CANVAS,
        fontFamily: 'sans-serif',
      }}
    >
      {/* Grid pattern overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(236,236,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(236,236,238,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Cobalt glow behind the mark */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '760px',
          height: '460px',
          background: 'radial-gradient(ellipse, rgba(91,155,248,0.18) 0%, transparent 70%)',
        }}
      />

      {/* Logo + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '34px' }}>
        <div
          style={{
            width: `${TILE}px`,
            height: `${TILE}px`,
            borderRadius: `${Math.round(TILE * 0.2237)}px`,
            backgroundImage: `linear-gradient(180deg, ${TILE_TOP} 0%, ${TILE_BOTTOM} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Same stroked Zap path as src/components/Logo/ZapBolt.tsx */}
          <svg
            width={Math.round(TILE * 0.54)}
            height={Math.round(TILE * 0.54)}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
          </svg>
        </div>

        <span style={{ fontSize: '78px', fontWeight: 700, color: HEADING, letterSpacing: '-2px' }}>Kharji</span>
      </div>

      {/* Subtitle */}
      <p style={{ fontSize: '28px', fontWeight: 400, color: MUTED, margin: 0, letterSpacing: '0.5px' }}>
        Personal Finance Tracker
      </p>

      {/* Divider */}
      <div
        style={{
          marginTop: '48px',
          width: '120px',
          height: '2px',
          backgroundColor: TILE_TOP,
          borderRadius: '2px',
        }}
      />

      {/* Feature pills */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '40px' }}>
        {['Expenses', 'Income', 'Assets', 'Reports'].map((label) => (
          <div
            key={label}
            style={{
              paddingTop: '10px',
              paddingBottom: '10px',
              paddingLeft: '20px',
              paddingRight: '20px',
              borderRadius: '100px',
              border: `1px solid ${BORDER}`,
              color: PILL_TEXT,
              fontSize: '18px',
              fontWeight: 500,
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>,
    { ...size }
  );
}
