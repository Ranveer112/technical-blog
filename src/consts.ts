// -----------------------------------------------------------------------------
// SITE-WIDE CONFIGURATION
// Edit these values to make the blog yours. This is the single source of truth
// for your identity, positioning, and social links.
// -----------------------------------------------------------------------------

export const SITE_TITLE = 'Ranveer Randhawa';

// One-sentence positioning statement. Be specific. Avoid generic bios.
export const SITE_DESCRIPTION =
  'Backend engineer focused on distributed systems and machine learning.';

// Author identity
export const AUTHOR = {
  name: 'Ranveer Randhawa',
  // A concrete, specific bio. What do you actually work on?
  bio: 'Backend engineer focused on distributed systems and machine learning.',
  // Path relative to /public. Drop a square image at public/avatar.jpg
  avatar: '/avatar.svg',
  email: 'ranveerrandhawa2468@gmail.com',
};

// Social / professional links. Remove any you do not use.
export const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/Ranveer112' },
  { label: 'Email', href: 'mailto:ranveerrandhawa2468@gmail.com' },
  { label: 'RSS', href: '/rss.xml' },
];

// Primary navigation
export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Blog', href: '/blog' },
  { label: 'About', href: '/about' },
];

// Information architecture: your blog categories.
// These map to the `category` field on each post.
export const CATEGORIES = [
  'Software Engineering',
  'AI/ML',
  'Systems',
  'Tutorials',
  'Notes',
] as const;

export type Category = (typeof CATEGORIES)[number];
