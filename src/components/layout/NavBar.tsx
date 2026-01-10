'use client';

/**
 * NavBar Component (Task 42)
 * Promptfoo-style navigation with Palantir aesthetic
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  // {
  //   label: 'Dashboard',
  //   href: '/',
  //   icon: (
  //     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //       <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  //     </svg>
  //   ),
  // },
  {
    label: 'New Eval',
    href: '/evals/new',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    label: 'Evals',
    href: '/evals',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: 'Datasets',
    href: '/datasets',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 12h16" />
      </svg>
    ),
  },
  {
    label: 'Prompts',
    href: '/prompts',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Optimize',
    href: '/optimize',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    label: 'Progress',
    href: '/progress',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    label: 'Trends',
    href: '/trends',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16" />
      </svg>
    ),
  },
  {
    label: 'Compare',
    href: '/compare',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Docs',
    href: '/docs',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

export default function NavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="nav-bar">
      <div className="h-full max-w-full mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            AGENT<span className="text-blue-500 font-extrabold text-lg">LAB</span>
          </span>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item flex items-center gap-2 ${
                isActive(item.href) ? 'active' : ''
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Right Side - Settings & User */}
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="nav-item flex items-center gap-2"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <div className="w-8 h-8 bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-300">
            User
          </div>
        </div>
      </div>
    </nav>
  );
}
