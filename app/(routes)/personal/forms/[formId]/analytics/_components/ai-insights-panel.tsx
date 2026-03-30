'use client';

// app/(routes)/personal/forms/[formId]/analytics/_components/ai-insights-panel.tsx
// AI-powered insights panel using Claude API

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// ============================================
// TYPE DEFINITIONS
// ============================================

type InsightCategory =
  | 'performance'
  | 'recommendation'
  | 'anomaly'
  | 'opportunity'
  | 'trend';

type InsightPriority = 'high' | 'medium' | 'low';

interface AIInsight {
  id: string;
  category: InsightCategory;
  priority: InsightPriority;
  title: string;
  description: string;
  supportingData: any;
  actionable: boolean;
  recommendation?: string;
  createdAt: string;
}

interface AIInsightsResponse {
  insights: AIInsight[];
  metadata: {
    formId: string;
    formTitle: string;
    totalResponses: number;
    generatedAt: string;
    usingAI: boolean;
    fallbackReason?: string;
  };
}

interface AIInsightsPanelProps {
  formId: string;
  formTitle: string;
  filters?: any;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getCategoryIcon = (category: InsightCategory) => {
  switch (category) {
    case 'performance':
      return TrendingUp;
    case 'recommendation':
      return Target;
    case 'anomaly':
      return AlertCircle;
    case 'opportunity':
      return Lightbulb;
    case 'trend':
      return Sparkles;
    default:
      return Sparkles;
  }
};

const getCategoryColor = (category: InsightCategory) => {
  switch (category) {
    case 'performance':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case 'recommendation':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    case 'anomaly':
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
    case 'opportunity':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'trend':
      return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
  }
};

const getPriorityColor = (priority: InsightPriority) => {
  switch (priority) {
    case 'high':
      return 'bg-red-500 text-white';
    case 'medium':
      return 'bg-yellow-500 text-white';
    case 'low':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const getCategoryLabel = (category: InsightCategory) => {
  switch (category) {
    case 'performance':
      return 'Performance';
    case 'recommendation':
      return 'Recommendation';
    case 'anomaly':
      return 'Anomaly';
    case 'opportunity':
      return 'Opportunity';
    case 'trend':
      return 'Trend';
    default:
      return category;
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export function AIInsightsPanel({
  formId,
  formTitle,
  filters
}: AIInsightsPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  // ============================================
  // FETCH INSIGHTS
  // ============================================

  const {
    data: insightsData,
    isLoading,
    error,
    refetch
  } = useQuery<AIInsightsResponse>({
    queryKey: ['ai-insights', formId, filters],
    queryFn: async () => {
      const response = await fetch(
        `/api/personal-forms/${formId}/analytics/insights`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate insights');
      }

      return response.json();
    },
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // ============================================
  // REGENERATE INSIGHTS
  // ============================================

  const handleRegenerateInsights = async () => {
    setIsGenerating(true);
    toast.loading('Generating AI insights...', { id: 'ai-insights' });

    try {
      await refetch();
      toast.success('AI insights generated!', { id: 'ai-insights' });
    } catch (error) {
      toast.error('Failed to generate insights', { id: 'ai-insights' });
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================
  // RENDER STATES
  // ============================================

  // Loading State
  if (isLoading && !insightsData) {
    return (
      <Card>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <Sparkles className='h-5 w-5 text-primary' />
            <CardTitle>AI-Powered Insights</CardTitle>
          </div>
          <CardDescription>
            Analyzing your form data with Claude AI...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-12 space-y-4'>
            <Loader2 className='h-12 w-12 animate-spin text-primary' />
            <p className='text-sm text-muted-foreground'>
              Generating intelligent insights...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (error && !insightsData) {
    return (
      <Card className='border-destructive'>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5 text-destructive' />
            <CardTitle>Failed to Generate Insights</CardTitle>
          </div>
          <CardDescription>
            There was an error generating AI insights for this form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-8 space-y-4'>
            <p className='text-sm text-muted-foreground text-center'>
              {(error as Error).message}
            </p>
            <Button onClick={handleRegenerateInsights} variant='outline'>
              <RefreshCw className='h-4 w-4 mr-2' />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No insights
  if (!insightsData?.insights || insightsData.insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Sparkles className='h-5 w-5 text-primary' />
              <CardTitle>AI-Powered Insights</CardTitle>
            </div>
            <Button
              onClick={handleRegenerateInsights}
              disabled={isGenerating}
              size='sm'
              variant='outline'
            >
              {isGenerating ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <RefreshCw className='h-4 w-4' />
              )}
            </Button>
          </div>
          <CardDescription>No insights generated yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col items-center justify-center py-8 space-y-4'>
            <Lightbulb className='h-12 w-12 text-muted-foreground' />
            <p className='text-sm text-muted-foreground text-center'>
              Click the refresh button to generate AI-powered insights for your
              form.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { insights, metadata } = insightsData;

  // Sort insights by priority
  const sortedInsights = [...insights].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <Sparkles className='h-5 w-5 text-primary' />
              <CardTitle>AI-Powered Insights</CardTitle>
            </div>
            <CardDescription>
              Intelligent analysis powered by Claude AI
            </CardDescription>
          </div>
          <Button
            onClick={handleRegenerateInsights}
            disabled={isGenerating}
            size='sm'
            variant='outline'
          >
            {isGenerating ? (
              <>
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className='h-4 w-4 mr-2' />
                Refresh
              </>
            )}
          </Button>
        </div>

        {/* Metadata */}
        <div className='flex items-center gap-2 pt-2'>
          <Badge variant='outline' className='text-xs'>
            {metadata.totalResponses} responses analyzed
          </Badge>
          {!metadata.usingAI && (
            <Badge variant='outline' className='text-xs text-yellow-600'>
              Using fallback insights
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Insights Grid */}
        <div className='grid gap-4'>
          {sortedInsights.map((insight, index) => {
            const Icon = getCategoryIcon(insight.category);
            const categoryColor = getCategoryColor(insight.category);

            return (
              <Card
                key={insight.id}
                className={cn(
                  'border-l-4 transition-all hover:shadow-md',
                  insight.priority === 'high'
                    ? 'border-l-red-500'
                    : insight.priority === 'medium'
                      ? 'border-l-yellow-500'
                      : 'border-l-blue-500'
                )}
              >
                <CardContent className='p-4 space-y-3'>
                  {/* Header */}
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex items-start gap-3 flex-1'>
                      <div
                        className={cn(
                          'p-2 rounded-lg border',
                          categoryColor
                        )}
                      >
                        <Icon className='h-4 w-4' />
                      </div>
                      <div className='flex-1 space-y-1'>
                        <div className='flex items-center gap-2 flex-wrap'>
                          <h4 className='font-semibold text-sm'>
                            {insight.title}
                          </h4>
                          <Badge
                            variant='secondary'
                            className={cn('text-xs', getPriorityColor(insight.priority))}
                          >
                            {insight.priority.toUpperCase()}
                          </Badge>
                        </div>
                        <Badge variant='outline' className='text-xs'>
                          {getCategoryLabel(insight.category)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className='text-sm text-muted-foreground leading-relaxed'>
                    {insight.description}
                  </p>

                  {/* Recommendation */}
                  {insight.actionable && insight.recommendation && (
                    <div className='bg-muted/50 rounded-lg p-3 space-y-2'>
                      <div className='flex items-center gap-2'>
                        <Target className='h-4 w-4 text-primary' />
                        <span className='text-xs font-medium text-primary'>
                          Recommended Action
                        </span>
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {insight.recommendation}
                      </p>
                    </div>
                  )}

                  {/* Supporting Data */}
                  {insight.supportingData &&
                    Object.keys(insight.supportingData).length > 0 && (
                      <details className='group cursor-pointer'>
                        <summary className='flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors'>
                          <ChevronRight className='h-3 w-3 transition-transform group-open:rotate-90' />
                          View supporting data
                        </summary>
                        <div className='mt-2 p-3 bg-muted/30 rounded text-xs font-mono'>
                          <pre className='whitespace-pre-wrap'>
                            {JSON.stringify(insight.supportingData, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className='pt-4 border-t'>
          <p className='text-xs text-muted-foreground text-center'>
            Generated {new Date(metadata.generatedAt).toLocaleString()} •{' '}
            {metadata.usingAI ? 'Powered by Claude AI' : 'Using fallback insights'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
