'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Home, ListMusic, Folder, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/materials', icon: ListMusic, label: 'Materials' },
  { href: '/projects', icon: Folder, label: 'Projects' },
  { href: '/master', icon: Settings, label: 'Master Data' },
];

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  sidebarWidthClass: string;
}

export function Sidebar({ isCollapsed, toggleSidebar, sidebarWidthClass }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-10 flex flex-col border-r bg-background transition-all duration-300 ease-in-out',
        sidebarWidthClass
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!isCollapsed && (
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            {/* <Package2 className="h-6 w-6" /> */}
            <span>Phonica</span>
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn(isCollapsed ? 'mx-auto' : 'ml-auto')}>
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          <span className="sr-only">{isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        </Button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <Button
            key={item.href}
            asChild
            variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start',
              isCollapsed && 'h-10 w-10 justify-center p-0'
            )}
          >
            <Link href={item.href} title={isCollapsed ? item.label : undefined}>
              <item.icon className={cn('h-5 w-5', !isCollapsed && 'mr-3')} />
              {!isCollapsed && item.label}
              {isCollapsed && <span className="sr-only">{item.label}</span>}
            </Link>
          </Button>
        ))}
      </nav>
    </aside>
  );
}
