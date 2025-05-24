'use client'; // For usePathname

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const masterNavItems = [
  { href: '/master/equipment', label: 'Equipment' },
  { href: '/master/tags', label: 'Tags' },
];

export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex items-center border-b pb-2 mb-6">
        {/* Optional: Master Management Title */}
        {/* <h2 className="text-xl font-semibold">Master Data Management</h2> */}
        <nav className="flex gap-2">
          {masterNavItems.map((item) => (
            <Button
              key={item.href}
              asChild
              variant={pathname === item.href ? 'default' : 'outline'}
              size="sm"
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
      </div>
      <div>{children}</div>
    </div>
  );
} 
