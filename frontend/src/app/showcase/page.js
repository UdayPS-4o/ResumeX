// Server Component — sets metadata for the /showcase route.
// The Showcase component itself must stay "use client" (it uses window,
// keyboard events, history.replaceState), so we wrap it in ShowcaseClient.
//
// force-dynamic: skip static prerendering because Showcase.jsx reads
// window.location at module evaluation time, which is browser-only.
import ShowcaseClient from './ShowcaseClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ResumeX Showcase — Dashboard Design Concepts',
  description:
    'Eight ways to present your master resume and its job-tailored variants. ' +
    'Browse layout concepts for the ResumeX dashboard.',
  openGraph: {
    title: 'ResumeX Showcase — 8 Dashboard Layout Concepts',
    description:
      'Master + tailored variant layouts: stacked list, side rail, filmstrip, card grid, collapsible, lineage tree, inline pills, and tabs.',
    type: 'website',
  },
};

export default function ShowcasePage() {
  return <ShowcaseClient />;
}
