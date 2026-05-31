// Web App Manifest — enables "Add to Home Screen" on mobile and gives
// the app a proper name, icon, and standalone display mode.
// Next.js file convention: this file generates /manifest.webmanifest automatically.

export default function manifest() {
  return {
    name: 'ResumeX',
    short_name: 'ResumeX',
    description: 'Build, tailor, and strengthen your resume through AI chat. Privacy-first, bring-your-own-key.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
    categories: ['productivity', 'utilities'],
    shortcuts: [
      {
        name: 'New Resume',
        url: '/',
        description: 'Create a new resume',
      },
      {
        name: 'Template Showcase',
        url: '/showcase',
        description: 'Browse layout concepts',
      },
    ],
  };
}
