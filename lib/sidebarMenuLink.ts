'use client';

import {
  Home,
  Users,
  Shield,
  Building2,
  LayoutGrid,
  CalendarDays,
  FileText,
  Settings,
  FolderOpen,
  type LucideIcon
} from 'lucide-react';

interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  submenus: Array<{
    href: string;
    label: string;
    active: boolean;
  }>;
}

interface MenuGroup {
  groupLabel?: string;
  menus: MenuItem[];
}

export function GetPages(pathname: string): MenuGroup[] {
  return [
    {
      groupLabel: 'Overview',
      menus: [
        {
          href: '/',
          label: 'Dashboard',
          active: pathname === '/',
          icon: Home,
          submenus: []
        }
      ]
    },
    {
      groupLabel: 'User Management',
      menus: [
        {
          href: '/users',
          label: 'All Users',
          active: pathname === '/users',
          icon: Users,
          submenus: []
        },
        {
          href: '/users/roles',
          label: 'Roles & Permissions',
          active: pathname === '/users/roles',
          icon: Shield,
          submenus: []
        }
      ]
    },
    {
      groupLabel: 'Organization',
      menus: [
        {
          href: '/organizations/institutions',
          label: 'Institutions',
          active: pathname.startsWith('/organizations/institutions'),
          icon: Building2,
          submenus: []
        },
        {
          href: '/organizations/places',
          label: 'Places',
          active: pathname.startsWith('/organizations/places'),
          icon: LayoutGrid,
          submenus: []
        }
      ]
    },
    {
      groupLabel: 'Events & Forms',
      menus: [
        {
          href: '/organizations/events',
          label: 'Events',
          active: pathname.startsWith('/organizations/events'),
          icon: CalendarDays,
          submenus: []
        },
        {
          href: '/organizations/forms',
          label: 'Forms',
          active: pathname.startsWith('/organizations/forms'),
          icon: FileText,
          submenus: [
            {
              href: '/organizations/forms/builder',
              label: 'Form Builder',
              active: pathname === '/organizations/forms/builder'
            },
            {
              href: '/organizations/forms/templates',
              label: 'Form Templates',
              active: pathname === '/organizations/forms/templates'
            }
          ]
        }
      ]
    },
    {
      groupLabel: 'Personal Workspace',
      menus: [
        {
          href: '/personal/forms',
          label: 'My Forms',
          active: pathname.startsWith('/personal/forms'),
          icon: FolderOpen,
          submenus: [
            {
              href: '/personal/forms',
              label: 'All Forms',
              active: pathname.startsWith('/personal/forms')
            },
            {
              href: '/personal/forms/new',
              label: 'Create New Form',
              active: pathname === '/personal/forms/new'
            }
          ]
        }
      ]
    }
  ];
}
