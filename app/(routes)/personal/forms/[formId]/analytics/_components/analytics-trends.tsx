'use client';

import { PersonalForm } from '@/types/personal-forms';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react';

interface AnalyticsTrendsProps {
  form: PersonalForm;
  overview: {
    totalResponses: number;
    responsesByDayOfWeek: {
      day: string;
      count: number;
    }[];
    responsesByHourOfDay: {
      hour: number;
      count: number;
    }[];
    responsesByPeriod: {
      date: string;
      day: string;
      count: number;
      cumulativeCount: number;
    }[];
  };
}

export function AnalyticsTrends({ form, overview }: AnalyticsTrendsProps) {
  // Calculate week patterns (weekday vs weekend)
  const weekdayData = overview.responsesByDayOfWeek
    .filter(d =>
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(d.day)
    )
    .reduce((sum, d) => sum + d.count, 0);

  const weekendData = overview.responsesByDayOfWeek
    .filter(d => ['Saturday', 'Sunday'].includes(d.day))
    .reduce((sum, d) => sum + d.count, 0);

  const weekPattern = [
    { name: 'Weekdays', value: weekdayData },
    { name: 'Weekends', value: weekendData }
  ];

  // Calculate time of day patterns
  const morningData = overview.responsesByHourOfDay
    .filter(h => h.hour >= 6 && h.hour < 12)
    .reduce((sum, h) => sum + h.count, 0);

  const afternoonData = overview.responsesByHourOfDay
    .filter(h => h.hour >= 12 && h.hour < 18)
    .reduce((sum, h) => sum + h.count, 0);

  const eveningData = overview.responsesByHourOfDay
    .filter(h => h.hour >= 18 && h.hour < 24)
    .reduce((sum, h) => sum + h.count, 0);

  const nightData = overview.responsesByHourOfDay
    .filter(h => h.hour >= 0 && h.hour < 6)
    .reduce((sum, h) => sum + h.count, 0);

  const timePattern = [
    { name: 'Morning (6AM-12PM)', value: morningData },
    { name: 'Afternoon (12PM-6PM)', value: afternoonData },
    { name: 'Evening (6PM-12AM)', value: eveningData },
    { name: 'Night (12AM-6AM)', value: nightData }
  ];

  // Prepare radar chart data for weekly pattern
  const radarData = overview.responsesByDayOfWeek.map(item => ({
    day: item.day.substring(0, 3), // Mon, Tue, etc.
    responses: item.count,
    fullMark: Math.max(...overview.responsesByDayOfWeek.map(d => d.count)) * 1.2
  }));

  // Calculate growth trend (last 7 days vs previous 7 days)
  const recentPeriod = overview.responsesByPeriod.slice(-7);
  const previousPeriod = overview.responsesByPeriod.slice(-14, -7);

  const recentCount = recentPeriod.reduce((sum, d) => sum + d.count, 0);
  const previousCount = previousPeriod.reduce((sum, d) => sum + d.count, 0);

  const growthRate =
    previousCount > 0
      ? ((recentCount - previousCount) / previousCount) * 100
      : 0;

  const isGrowth = growthRate > 0;

  // Most active period
  const mostActiveTime = timePattern.sort((a, b) => b.value - a.value)[0];
  const mostActiveDay = overview.responsesByDayOfWeek.sort(
    (a, b) => b.count - a.count
  )[0];

  return (
    <div className='space-y-6'>
      {/* Trend Summary Cards */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground'>7-Day Trend</p>
                <div className='flex items-center gap-2 mt-1'>
                  <span className='text-2xl font-bold'>
                    {isGrowth ? '+' : ''}
                    {growthRate.toFixed(1)}%
                  </span>
                  {isGrowth ? (
                    <TrendingUp className='h-5 w-5 text-green-600 dark:text-green-400' />
                  ) : (
                    <TrendingDown className='h-5 w-5 text-red-600 dark:text-red-400' />
                  )}
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  vs. previous week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center gap-3'>
              <Calendar className='h-5 w-5 text-muted-foreground' />
              <div>
                <p className='text-sm text-muted-foreground'>Most Active Day</p>
                <p className='text-xl font-semibold mt-1'>
                  {mostActiveDay.day}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {mostActiveDay.count} responses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center gap-3'>
              <Clock className='h-5 w-5 text-muted-foreground' />
              <div>
                <p className='text-sm text-muted-foreground'>
                  Most Active Period
                </p>
                <p className='text-xl font-semibold mt-1'>
                  {mostActiveTime.name.split(' ')[0]}
                </p>
                <p className='text-xs text-muted-foreground'>
                  {mostActiveTime.value} responses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Pattern Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Response Pattern</CardTitle>
          <CardDescription>
            Submission pattern across days of the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='h-[400px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <RadarChart data={radarData}>
                <PolarGrid className='stroke-muted' />
                <PolarAngleAxis
                  dataKey='day'
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 'dataMax']}
                  tick={{ fill: 'currentColor', fontSize: 10 }}
                />
                <Radar
                  name='Responses'
                  dataKey='responses'
                  stroke='#0ea5e9'
                  fill='#0ea5e9'
                  fillOpacity={0.5}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Time Patterns */}
      <div className='grid gap-6 md:grid-cols-2'>
        {/* Weekday vs Weekend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekday vs Weekend</CardTitle>
            <CardDescription>
              Response distribution between weekdays and weekends
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {weekPattern.map((item, index) => {
                const total = weekdayData + weekendData;
                const percentage = total > 0 ? (item.value / total) * 100 : 0;

                return (
                  <div key={index} className='space-y-2'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='font-medium'>{item.name}</span>
                      <span className='text-muted-foreground'>
                        {item.value} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className='h-3 bg-muted rounded-full overflow-hidden'>
                      <div
                        className={`h-full ${index === 0 ? 'bg-blue-500' : 'bg-purple-500'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Insight */}
              <div className='mt-6 p-4 bg-muted/50 rounded-lg'>
                <p className='text-sm font-medium mb-2'>💡 Insight</p>
                <p className='text-sm text-muted-foreground'>
                  {weekdayData > weekendData
                    ? `You receive ${((weekdayData / (weekdayData + weekendData)) * 100).toFixed(0)}% of responses during weekdays. Consider scheduling form promotions on Monday-Friday for better engagement.`
                    : `You receive ${((weekendData / (weekdayData + weekendData)) * 100).toFixed(0)}% of responses during weekends. Your audience is more active on weekends!`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time of Day Pattern */}
        <Card>
          <CardHeader>
            <CardTitle>Time of Day Pattern</CardTitle>
            <CardDescription>
              Response distribution throughout the day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='h-[300px]'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={timePattern} layout='vertical'>
                  <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                  <XAxis type='number' tick={{ fill: 'currentColor' }} />
                  <YAxis
                    dataKey='name'
                    type='category'
                    width={120}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value) => [`${value} responses`, 'Count']}
                  />
                  <Bar dataKey='value' fill='#8b5cf6' radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Insight */}
            <div className='mt-4 p-4 bg-muted/50 rounded-lg'>
              <p className='text-sm font-medium mb-2'>💡 Insight</p>
              <p className='text-sm text-muted-foreground'>
                Most responses come during {mostActiveTime.name.toLowerCase()}.
                This is the best time to engage with your audience or send
                reminders.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submission Patterns Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Key Patterns & Insights</CardTitle>
          <CardDescription>
            Summary of important trends and patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {/* Pattern 1 */}
            <div className='p-4 border rounded-lg'>
              <Badge variant='secondary' className='mb-2'>
                Weekly Trend
              </Badge>
              <p className='text-sm font-medium mb-1'>
                {isGrowth ? 'Growing Engagement' : 'Declining Engagement'}
              </p>
              <p className='text-xs text-muted-foreground'>
                Response rate has {isGrowth ? 'increased' : 'decreased'} by{' '}
                {Math.abs(growthRate).toFixed(1)}% in the last 7 days
              </p>
            </div>

            {/* Pattern 2 */}
            <div className='p-4 border rounded-lg'>
              <Badge variant='secondary' className='mb-2'>
                Peak Activity
              </Badge>
              <p className='text-sm font-medium mb-1'>
                {mostActiveDay.day} is Most Active
              </p>
              <p className='text-xs text-muted-foreground'>
                {Math.round((mostActiveDay.count / overview.totalResponses) * 100)}
                % of all responses come on {mostActiveDay.day}
              </p>
            </div>

            {/* Pattern 3 */}
            <div className='p-4 border rounded-lg'>
              <Badge variant='secondary' className='mb-2'>
                Time Preference
              </Badge>
              <p className='text-sm font-medium mb-1'>
                {weekdayData > weekendData ? 'Weekday' : 'Weekend'} Preference
              </p>
              <p className='text-xs text-muted-foreground'>
                Users are{' '}
                {weekdayData > weekendData
                  ? Math.round((weekdayData / weekendData) * 10) / 10
                  : Math.round((weekendData / weekdayData) * 10) / 10}
                x more likely to respond during{' '}
                {weekdayData > weekendData ? 'weekdays' : 'weekends'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
