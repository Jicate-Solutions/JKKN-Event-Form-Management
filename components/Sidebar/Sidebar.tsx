import { cn } from '@/lib/utils';
import { useStore } from '@/hooks/use-store';
import { Button } from '@/components/ui/button';
import { SidebarToggle } from './sidebar-toggle';
import { Menu } from '../Navbar/menu';
import { useSidebarToggle } from '@/hooks/use-sidebar-toggle';
import Link from 'next/link';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import Image from 'next/image';

const Sidebar = () => {
  const sidebars = useStore(useSidebarToggle, (state) => state);

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300',
        sidebars?.isOpen === false ? 'w-[90px]' : 'w-72'
      )}
    >
      <SidebarToggle
        isOpen={sidebars?.isOpen}
        setIsOpen={sidebars?.setIsOpen}
      />
      <div className='relative h-full flex flex-col px-3 py-2 overflow-y-auto shadow-md dark:shadow-zinc-800'>
        <Button
          className={cn(
            'transition-transform ease-in-out duration-300 mb-1',
            sidebars?.isOpen === false ? 'translate-x-1' : 'translate-x-0'
          )}
          variant='link'
          asChild
        >
          <Link href='/' className='flex items-center gap-2'>
            <Image
              src='/logo.webp'
              alt='Logo'
              className='object-cover'
              width={60}
              height={60}
            />
            <h1
              className={cn(
                'font-semibold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300',
                sidebars?.isOpen === false
                  ? '-translate-x-96 opacity-0 hidden'
                  : 'translate-x-0 opacity-100'
              )}
            >
              AI Forms
            </h1>
          </Link>
        </Button>

        {/* Workspace Switcher */}
        <div
          className={cn(
            'mb-0 px-2',
            sidebars?.isOpen === false ? 'hidden' : 'block'
          )}
        >
          <WorkspaceSwitcher />
        </div>

        <Menu isOpen={sidebars?.isOpen} />
      </div>
    </aside>
  );
};

export default Sidebar;
