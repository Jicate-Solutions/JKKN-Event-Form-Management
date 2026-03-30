import { Suspense } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TemplateList } from './_components/template-list';
import { ContentLayout } from '@/components/layout/content-layout';

export const metadata = {
  title: 'Form Templates',
  description: 'Manage form templates'
};

export default function FormTemplatesPage() {
  return (
    <ContentLayout title='Form Templates'>
      <Suspense fallback={<div>Loading...</div>}>
        <TemplateList />
      </Suspense>
    </ContentLayout>
  );
}
