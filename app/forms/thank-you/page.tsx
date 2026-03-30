import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentLayout } from '@/components/layout/content-layout';
import { Card, CardContent } from '@/components/ui/card';

export default function ThankYouPage({
  searchParams
}: {
  searchParams: { submissionId?: string };
}) {
  const submissionId = searchParams.submissionId;

  return (
    <ContentLayout title='Thank You'>
      <div className='max-w-2xl mx-auto text-center'>
        <CheckCircle className='mx-auto h-12 w-12 text-green-500' />
        <h1 className='mt-4 text-2xl font-bold'>Thank You!</h1>
        <p className='mt-2 text-muted-foreground'>
          Your form has been submitted successfully.
        </p>

        {submissionId && (
          <Card className='mt-6'>
            <CardContent className='pt-6'>
              <div className='space-y-2'>
                <h3 className='text-lg font-medium'>Submission Reference</h3>
                <p className='text-sm text-muted-foreground'>
                  Please save this reference number for future inquiries:
                </p>
                <div className='flex items-center justify-center'>
                  <code className='relative rounded bg-muted px-3 py-2 font-mono text-sm font-semibold'>
                    {submissionId}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button asChild className='mt-8'>
          <Link href='/'>Return Home</Link>
        </Button>
      </div>
    </ContentLayout>
  );
}
