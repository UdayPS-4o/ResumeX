import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: 'ResumeX — chat your way to a polished resume',
  description:
    'ResumeX lets you build, tailor, and strengthen your resume through AI chat. Privacy-first, bring-your-own-key.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'ResumeX — chat your way to a polished resume',
    description:
      'Build, tailor, and strengthen your resume through AI chat. Privacy-first, bring-your-own-key.',
    type: 'website',
    siteName: 'ResumeX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ResumeX — chat your way to a polished resume',
    description: 'AI-powered resume builder. Privacy-first, bring-your-own-key.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <head>
        <link rel="preconnect" href="http://localhost:8000" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased h-full font-sans">
        {children}
      </body>
    </html>
  );
}
