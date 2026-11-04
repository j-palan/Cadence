'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BriefcaseBusiness, Home, LayoutDashboard, Menu, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function NavigationMenu() {
  const pathname = usePathname()
  const inEditor = pathname.startsWith('/resume/') && pathname !== '/resume/new'
  const items = [
    { label: 'Landing Page', href: '/', activePath: '/', icon: Home },
    { label: 'Dashboard', href: '/dashboard', activePath: '/dashboard', icon: LayoutDashboard },
    { label: 'Job board', href: '/jobs', activePath: '/jobs', icon: BriefcaseBusiness },
    { label: 'Settings', href: inEditor ? `/settings?returnTo=${encodeURIComponent(pathname)}` : '/settings', activePath: '/settings', icon: Settings },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation menu" title="Navigation" className="text-muted-foreground hover:text-foreground">
          <Menu aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map(({ label, href, activePath, icon: Icon }) => (
          <DropdownMenuItem key={label} asChild>
            <Link href={href} aria-current={pathname === activePath ? 'page' : undefined}>
              <Icon aria-hidden="true" />{label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
