// lib/services/ai-insights-service.ts
// Service for generating AI-powered insights using Claude API

import Anthropic from '@anthropic-ai/sdk';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type InsightCategory =
  | 'performance'
  | 'recommendation'
  | 'anomaly'
  | 'opportunity'
  | 'trend';

export type InsightPriority = 'high' | 'medium' | 'low';

export interface AIInsight {
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

export interface AnalyticsContext {
  formTitle: string;
  formDescription?: string;
  totalResponses: number;
  uniqueSubmitters: number;
  completionRate: number;
  responseVelocity: number;
  peakSubmissionDay: string;
  submissionStatus: {
    atLimit: boolean;
    remaining: number | null;
  };
  responsesByDayOfWeek: {
    day: string;
    count: number;
  }[];
  responsesByHourOfDay: {
    hour: number;
    count: number;
  }[];
  responsesByPeriod: {
    day: string;
    count: number;
    cumulativeCount: number;
  }[];
  fieldStatistics: {
    fieldId: string;
    fieldType: string;
    label: string;
    fillRate: number;
    totalResponses: number;
    filledCount: number;
    emptyCount: number;
    optionDistribution?: {
      option: string;
      count: number;
      percentage: number;
    }[];
    textStats?: {
      uniqueValues: number;
      avgLength: number;
      topValues: { value: string; count: number; percentage: number }[];
    };
    numberStats?: {
      min: number;
      max: number;
      avg: number;
      median: number;
    };
  }[];
}

// ============================================
// AI INSIGHTS SERVICE
// ============================================

export const AIInsightsService = {
  /**
   * Generate AI insights using Claude API
   */
  async generateInsights(
    context: AnalyticsContext
  ): Promise<AIInsight[]> {
    try {
      // Check if API key is configured
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error('ANTHROPIC_API_KEY not configured');
        return this.getFallbackInsights(context);
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      // Prepare context for Claude
      const analyticsContext = this.prepareContext(context);

      // Call Claude API
      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022', // Latest Haiku model
        max_tokens: 2048,
        temperature: 0.7,
        system: this.getSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: `Analyze this form analytics data and provide actionable insights:\n\n${analyticsContext}`
          }
        ]
      });

      // Parse Claude's response
      const insights = this.parseClaudeResponse(message.content);

      return insights;
    } catch (error) {
      console.error('Error generating AI insights:', error);
      // Return fallback insights if API call fails
      return this.getFallbackInsights(context);
    }
  },

  /**
   * Get system prompt for Claude
   */
  getSystemPrompt(): string {
    return `You are an expert data analyst specializing in form analytics and user behavior analysis.
Analyze the provided form response data and generate actionable insights.

Focus on:
1. Response patterns and trends (day/time preferences, growth/decline)
2. Field completion rates and quality (identify problematic fields)
3. Anomalies or unusual patterns (sudden spikes, drops, outliers)
4. Opportunities for improvement (form optimization, field suggestions)
5. User behavior insights (engagement patterns, preferences)

Provide insights in JSON format ONLY (no markdown, no code blocks) with this exact structure:
{
  "insights": [
    {
      "category": "performance|recommendation|anomaly|opportunity|trend",
      "priority": "high|medium|low",
      "title": "Brief insight title (max 60 chars)",
      "description": "Detailed explanation (2-3 sentences)",
      "supportingData": {"key": "value"},
      "actionable": true|false,
      "recommendation": "Specific action to take (if actionable)"
    }
  ]
}

Rules:
- Generate 4-6 insights maximum
- Prioritize actionable insights (high priority)
- Be specific with numbers and percentages
- Focus on the most impactful patterns
- Keep titles concise and descriptions clear
- Only include "recommendation" if actionable is true
- supportingData should contain relevant metrics
- Return ONLY valid JSON, no additional text`;
  },

  /**
   * Prepare analytics context for Claude
   */
  prepareContext(context: AnalyticsContext): string {
    // Calculate additional metrics
    const weekdayResponses = context.responsesByDayOfWeek
      .filter(d =>
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(d.day)
      )
      .reduce((sum, d) => sum + d.count, 0);

    const weekendResponses = context.responsesByDayOfWeek
      .filter(d => ['Saturday', 'Sunday'].includes(d.day))
      .reduce((sum, d) => sum + d.count, 0);

    // Find peak hour
    const peakHour = [...context.responsesByHourOfDay].sort(
      (a, b) => b.count - a.count
    )[0];

    // Calculate growth trend (last 7 days vs previous 7 days)
    const recentPeriod = context.responsesByPeriod.slice(-7);
    const previousPeriod = context.responsesByPeriod.slice(-14, -7);
    const recentCount = recentPeriod.reduce((sum, d) => sum + d.count, 0);
    const previousCount = previousPeriod.reduce((sum, d) => sum + d.count, 0);
    const growthRate =
      previousCount > 0
        ? ((recentCount - previousCount) / previousCount) * 100
        : 0;

    // Identify low completion fields
    const lowCompletionFields = context.fieldStatistics
      .filter(f => f.fillRate < 80)
      .sort((a, b) => a.fillRate - b.fillRate)
      .slice(0, 3);

    // Identify highly engaged choice fields
    const popularChoices = context.fieldStatistics
      .filter(f => f.optionDistribution && f.optionDistribution.length > 0)
      .map(f => ({
        label: f.label,
        topOption: f.optionDistribution![0]
      }))
      .filter(f => f.topOption.percentage > 70);

    const contextData = {
      formInfo: {
        title: context.formTitle,
        description: context.formDescription,
        totalFields: context.fieldStatistics.length
      },
      overview: {
        totalResponses: context.totalResponses,
        uniqueSubmitters: context.uniqueSubmitters,
        completionRate: context.completionRate,
        responseVelocity: context.responseVelocity,
        submissionLimit: context.submissionStatus.remaining,
        atLimit: context.submissionStatus.atLimit
      },
      trends: {
        growthRate: Math.round(growthRate * 10) / 10,
        peakDay: context.peakSubmissionDay,
        peakHour: peakHour.hour,
        weekdayVsWeekend: {
          weekdays: weekdayResponses,
          weekends: weekendResponses,
          preference:
            weekdayResponses > weekendResponses ? 'weekdays' : 'weekends'
        }
      },
      fieldInsights: {
        lowCompletionFields: lowCompletionFields.map(f => ({
          label: f.label,
          type: f.fieldType,
          fillRate: f.fillRate,
          emptyCount: f.emptyCount
        })),
        popularChoices: popularChoices.map(c => ({
          field: c.label,
          topOption: c.topOption.option,
          percentage: c.topOption.percentage
        })),
        averageFillRate:
          Math.round(
            (context.fieldStatistics.reduce((sum, f) => sum + f.fillRate, 0) /
              context.fieldStatistics.length) *
              10
          ) / 10
      },
      timePatterns: {
        dayDistribution: context.responsesByDayOfWeek.map(d => ({
          day: d.day,
          count: d.count,
          percentage: Math.round((d.count / context.totalResponses) * 100)
        })),
        hourDistribution: context.responsesByHourOfDay
          .filter(h => h.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(h => ({
            hour: h.hour,
            count: h.count,
            percentage: Math.round((h.count / context.totalResponses) * 100)
          }))
      }
    };

    return JSON.stringify(contextData, null, 2);
  },

  /**
   * Parse Claude's response into structured insights
   */
  parseClaudeResponse(content: any[]): AIInsight[] {
    try {
      // Extract text from content blocks
      const textContent = content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('');

      // Remove markdown code blocks if present
      const cleanedContent = textContent
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Parse JSON
      const parsed = JSON.parse(cleanedContent);

      if (!parsed.insights || !Array.isArray(parsed.insights)) {
        throw new Error('Invalid response structure');
      }

      // Convert to AIInsight format
      const insights: AIInsight[] = parsed.insights.map(
        (insight: any, index: number) => ({
          id: `ai-insight-${Date.now()}-${index}`,
          category: insight.category || 'performance',
          priority: insight.priority || 'medium',
          title: insight.title || 'Insight',
          description: insight.description || '',
          supportingData: insight.supportingData || {},
          actionable: insight.actionable || false,
          recommendation: insight.recommendation,
          createdAt: new Date().toISOString()
        })
      );

      return insights;
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      return [];
    }
  },

  /**
   * Generate fallback insights (when API is unavailable)
   */
  getFallbackInsights(context: AnalyticsContext): AIInsight[] {
    const insights: AIInsight[] = [];

    // Insight 1: Growth trend
    const recentPeriod = context.responsesByPeriod.slice(-7);
    const previousPeriod = context.responsesByPeriod.slice(-14, -7);
    const recentCount = recentPeriod.reduce((sum, d) => sum + d.count, 0);
    const previousCount = previousPeriod.reduce((sum, d) => sum + d.count, 0);
    const growthRate =
      previousCount > 0
        ? ((recentCount - previousCount) / previousCount) * 100
        : 0;

    if (Math.abs(growthRate) > 10) {
      insights.push({
        id: `fallback-1-${Date.now()}`,
        category: 'trend',
        priority: growthRate > 0 ? 'high' : 'medium',
        title: `Response Rate ${growthRate > 0 ? 'Increasing' : 'Decreasing'}`,
        description: `Your form responses have ${growthRate > 0 ? 'increased' : 'decreased'} by ${Math.abs(growthRate).toFixed(1)}% in the last 7 days compared to the previous week. ${growthRate > 0 ? 'Great momentum!' : 'Consider promoting your form more actively.'}`,
        supportingData: {
          growthRate: growthRate.toFixed(1),
          recentCount,
          previousCount
        },
        actionable: growthRate < 0,
        recommendation:
          growthRate < 0
            ? 'Increase form visibility through social media, email campaigns, or website placement.'
            : undefined,
        createdAt: new Date().toISOString()
      });
    }

    // Insight 2: Low completion fields
    const lowCompletionFields = context.fieldStatistics
      .filter(f => f.fillRate < 80 && f.fillRate > 0)
      .sort((a, b) => a.fillRate - b.fillRate);

    if (lowCompletionFields.length > 0) {
      const lowestField = lowCompletionFields[0];
      insights.push({
        id: `fallback-2-${Date.now()}`,
        category: 'recommendation',
        priority: 'high',
        title: `Low Completion Rate on "${lowestField.label}"`,
        description: `The "${lowestField.label}" field has only ${lowestField.fillRate}% completion rate, which is significantly below average. This may indicate the field is confusing, not relevant, or users are hesitant to provide this information.`,
        supportingData: {
          fieldLabel: lowestField.label,
          fillRate: lowestField.fillRate,
          emptyCount: lowestField.emptyCount
        },
        actionable: true,
        recommendation: `Consider making the "${lowestField.label}" field optional, adding a help text to clarify what's needed, or removing it if it's not essential.`,
        createdAt: new Date().toISOString()
      });
    }

    // Insight 3: Peak time
    const peakHour = [...context.responsesByHourOfDay].sort(
      (a, b) => b.count - a.count
    )[0];
    if (peakHour && peakHour.count > 0) {
      const peakPercentage = Math.round(
        (peakHour.count / context.totalResponses) * 100
      );
      if (peakPercentage > 15) {
        const timeLabel =
          peakHour.hour < 12
            ? 'Morning'
            : peakHour.hour < 18
              ? 'Afternoon'
              : 'Evening';

        insights.push({
          id: `fallback-3-${Date.now()}`,
          category: 'opportunity',
          priority: 'medium',
          title: `Peak Activity During ${timeLabel}`,
          description: `${peakPercentage}% of your responses come during ${timeLabel.toLowerCase()} hours (around ${peakHour.hour}:00). This is your most engaged time period.`,
          supportingData: {
            peakHour: peakHour.hour,
            percentage: peakPercentage,
            timeLabel
          },
          actionable: true,
          recommendation: `Schedule form reminders, promotional emails, or social media posts during ${timeLabel.toLowerCase()} hours (${peakHour.hour}:00 - ${peakHour.hour + 2}:00) for maximum engagement.`,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Insight 4: Completion rate
    if (context.completionRate < 80) {
      insights.push({
        id: `fallback-4-${Date.now()}`,
        category: 'performance',
        priority: 'medium',
        title: 'Average Form Completion Could Be Higher',
        description: `Your overall form completion rate is ${context.completionRate}%, meaning users are leaving some fields empty. A rate above 90% is considered excellent.`,
        supportingData: {
          completionRate: context.completionRate,
          target: 90
        },
        actionable: true,
        recommendation:
          'Review which fields have low completion rates and consider making non-essential fields optional or removing them entirely.',
        createdAt: new Date().toISOString()
      });
    }

    // Insight 5: Response velocity
    if (context.responseVelocity > 0) {
      insights.push({
        id: `fallback-5-${Date.now()}`,
        category: 'performance',
        priority: 'low',
        title: 'Steady Response Flow',
        description: `You're receiving an average of ${context.responseVelocity.toFixed(1)} responses per day, showing consistent engagement with your form.`,
        supportingData: {
          velocity: context.responseVelocity
        },
        actionable: false,
        createdAt: new Date().toISOString()
      });
    }

    return insights.slice(0, 5); // Return max 5 fallback insights
  }
};
