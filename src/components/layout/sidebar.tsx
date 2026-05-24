'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  MessageSquare,
  Shield,
  Webhook,
  Settings,
  UserCog,
  Building2,
  ChevronLeft,
  Moon,
  Sun,
  LogOut,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const mainNav = [
  { label: 'Dashboard',   href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Leads',       href: '/leads',        icon: Users },
  { label: 'Categories',  href: '/categories',   icon: FolderKanban },
  { label: 'Campaigns',   href: '/campaigns',    icon: Megaphone },
  { label: 'Conversations', href: '/conversations', icon: MessageSquare },
  { label: 'Coming Soon 🚀', href: '/coming-soon', icon: Sparkles },
];

const adminNav = [
  { label: 'Command Center', href: '/admin', icon: Shield },
  { label: 'Webhooks', href: '/admin/webhooks', icon: Webhook },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Agents', href: '/admin/agents', icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const NavItem = ({ item }: { item: (typeof mainNav)[0] }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;

    return (
      <Link
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
          isActive
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <Icon
          className={cn(
            'w-5 h-5 shrink-0 transition-colors',
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
          )}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        'h-screen sticky top-0 flex flex-col border-r border-border/50 bg-sidebar transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border/50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold tracking-tight truncate">Dubai CRM</span>
            <span className="text-[10px] text-muted-foreground truncate">
              Real Estate Automation
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className={cn('mb-2', !collapsed && 'px-3')}>
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Main
            </span>
          )}
        </div>
        {mainNav.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        <Separator className="my-4 opacity-50" />

        <div className={cn('mb-2', !collapsed && 'px-3')}>
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Admin
            </span>
          )}
        </div>
        {adminNav.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t border-border/50 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full justify-start gap-3 px-3 py-2.5 text-muted-foreground hover:text-foreground"
          title={collapsed ? 'Toggle Theme' : undefined}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 shrink-0" />
          ) : (
            <Moon className="w-5 h-5 shrink-0" />
          )}
          {!collapsed && (
            <span className="text-sm">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-3 px-3 py-2.5 text-muted-foreground hover:text-destructive"
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex justify-center py-2 text-muted-foreground hover:text-foreground"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <ChevronLeft
            className={cn(
              'w-4 h-4 transition-transform duration-300',
              collapsed && 'rotate-180'
            )}
          />
        </Button>
      </div>
    </aside>
  );
}
