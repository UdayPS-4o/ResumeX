// Dynamic OpenGraph image — generated on-server via next/og (Vercel's Satori).
// This JSX is rendered to a 1200×630 PNG at request time. No external image
// service; no client JS. Next.js caches the output automatically.
//
// Accessed at: /opengraph-image  (Next.js file convention)
// Referenced by the openGraph.images metadata field automatically.

import { ImageResponse } from 'next/og';

export const alt = 'ResumeX — Chat your way to a polished resume';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '64px',
          position: 'relative',
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Top: logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: '#2563eb',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              fontWeight: '800',
              boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
            }}
          >
            R
          </div>
          <span style={{ color: '#fff', fontSize: '28px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            ResumeX
          </span>
        </div>

        {/* Centre: headline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ color: 'rgba(147,197,253,1)', fontSize: '20px', fontWeight: '600', margin: '0 0 16px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            AI-Powered Resume Builder
          </p>
          <h1
            style={{
              color: '#fff',
              fontSize: '72px',
              fontWeight: '800',
              lineHeight: 1.05,
              letterSpacing: '-2px',
              margin: '0 0 24px',
              maxWidth: '800px',
            }}
          >
            Chat your way to a polished resume.
          </h1>
          <p style={{ color: 'rgba(148,163,184,1)', fontSize: '26px', fontWeight: '400', margin: 0, maxWidth: '680px', lineHeight: 1.4 }}>
            Build, tailor to any job, and download — privacy-first, bring-your-own-key.
          </p>
        </div>

        {/* Bottom: feature pills */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {['AI Chat', 'Job Tailoring', 'ATS Scoring', 'Cover Letters', 'PDF Export'].map((label) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '999px',
                padding: '8px 20px',
                color: 'rgba(226,232,240,1)',
                fontSize: '18px',
                fontWeight: '500',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
