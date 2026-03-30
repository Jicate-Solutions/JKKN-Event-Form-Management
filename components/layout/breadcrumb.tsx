import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  link: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav aria-label='Breadcrumb'>
      <ol className='flex items-center space-x-2'>
        {items.map((item, index) => (
          <li key={index} className='flex items-center'>
            <Link
              href={item.link}
              className={`text-primary text-sm transition-colors duration-200 ${
                index === items.length - 1 ? 'font-semibold' : 'font-light'
              } hover:text-blue-600`}
            >
              {item.label}
            </Link>

            {index < items.length - 1 && (
              <span className='mx-2 text-gray-400'>
                <ChevronRight className='w-4 h-4' />
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
