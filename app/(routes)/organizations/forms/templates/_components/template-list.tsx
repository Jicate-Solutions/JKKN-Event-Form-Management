'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreVertical, Edit, Trash2, Copy, FileText, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Form } from '@/types/forms';
import { FormService } from '@/lib/services/form-service';
import { Button } from '@/components/ui/button';
import { Database } from '@/types/supabase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { EventService } from '@/lib/services/organization/event-service';
import { Event } from '@/types/organizations';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const TEMPLATE_CATEGORIES = [
  {
    title: 'Event Registration',
    description: 'Templates for event registration and attendance tracking',
    templates: [
      {
        id: 'event-registration',
        title: 'Basic Event Registration',
        description: 'Simple event registration form with essential fields'
      },
      {
        id: 'workshop-registration',
        title: 'Workshop Registration',
        description: 'Detailed registration form for workshop participants'
      }
    ]
  },
  {
    title: 'Feedback & Surveys',
    description: 'Templates for gathering feedback and conducting surveys',
    templates: [
      {
        id: 'event-feedback',
        title: 'Event Feedback',
        description: 'Collect feedback from event participants'
      },
      {
        id: 'satisfaction-survey',
        title: 'Satisfaction Survey',
        description: 'General purpose satisfaction survey template'
      }
    ]
  }
];

export function TemplateList() {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    title: '',
    description: '',
    category: 'Event Registration' // default category
  });
  const [customTemplates, setCustomTemplates] = useState<
    Database['public']['Tables']['form_templates']['Row'][]
  >([]);

  // Fetch both events and custom templates when component mounts
  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsData, templatesData] = await Promise.all([
          EventService.getEvents(),
          FormService.getCustomTemplates()
        ]);
        setEvents(eventsData.data || []);
        setCustomTemplates(templatesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      }
    }
    fetchData();
  }, []);

  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setShowEventDialog(true);
  };

  const handleEventSelect = (eventId: string) => {
    if (selectedTemplate) {
      router.push(
        `/organizations/events/${eventId}/forms/new?template=${selectedTemplate}`
      );
    }
    setShowEventDialog(false);
  };

  const handleCreateTemplate = async () => {
    try {
      await FormService.createTemplate({
        title: newTemplate.title,
        description: newTemplate.description,
        category: newTemplate.category,
        fields: [] // Initial empty fields
      });

      toast.success('Template created successfully');
      setShowCreateDialog(false);
      // Reset form
      setNewTemplate({
        title: '',
        description: '',
        category: 'Event Registration'
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  // Add custom templates category to display
  const allCategories = [
    ...TEMPLATE_CATEGORIES,
    {
      title: 'Custom Templates',
      description: 'Your custom form templates',
      templates: customTemplates.map((template) => ({
        id: template.id,
        title: template.title,
        description: template.description || ''
      }))
    }
  ];

  return (
    <>
      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold'>Form Templates</h1>
        <Button
          onClick={() => router.push('/organizations/forms/templates/create')}
        >
          <Plus className='w-4 h-4 mr-2' />
          Create Template
        </Button>
      </div>

      <div className='grid gap-6'>
        {allCategories.map((category) => (
          <div key={category.title} className='space-y-4'>
            <div>
              <h2 className='text-lg font-semibold'>{category.title}</h2>
              <p className='text-sm text-muted-foreground'>
                {category.description}
              </p>
            </div>

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {category.templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <CardTitle className='text-base'>
                      {template.title}
                    </CardTitle>
                    <CardDescription className='text-sm'>
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className='w-full'
                      onClick={() => handleUseTemplate(template.id)}
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Select Event</AlertDialogTitle>
            <AlertDialogDescription>
              Choose an event to create the form for
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='grid gap-4 py-4'>
            {events.map((event) => (
              <Button
                key={event.id}
                variant='outline'
                className='w-full text-left'
                onClick={() => handleEventSelect(event.id)}
              >
                {event.title}
              </Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Template</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new form template
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid gap-2'>
              <Label htmlFor='title'>Title</Label>
              <Input
                id='title'
                value={newTemplate.title}
                onChange={(e) =>
                  setNewTemplate({ ...newTemplate, title: e.target.value })
                }
                placeholder='Enter template title'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate({
                    ...newTemplate,
                    description: e.target.value
                  })
                }
                placeholder='Enter template description'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='category'>Category</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(value) =>
                  setNewTemplate({ ...newTemplate, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select category' />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((category) => (
                    <SelectItem key={category.title} value={category.title}>
                      {category.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateTemplate}>
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
