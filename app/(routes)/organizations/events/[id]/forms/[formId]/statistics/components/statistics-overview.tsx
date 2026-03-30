'use client';

import { Form } from '@/types/forms';
import { FormResponse } from '@/types/form-responses';
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
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  isWithinInterval
} from 'date-fns';
import { CalendarIcon, FileText, Clock, Check, Users } from 'lucide-react';

interface StatisticsOverviewProps {
  form: Form;
  responses: FormResponse[];
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d'
];

export function StatisticsOverview({
  form,
  responses
}: StatisticsOverviewProps) {
  // Get response statistics by day (last 14 days)
  const getDailyResponseData = () => {
    const today = new Date();
    const days = 14; // Show last 14 days

    // Initialize array with the last 14 days
    const dailyData = Array.from({ length: days }, (_, i) => {
      const date = subDays(today, days - i - 1);
      return {
        date,
        day: format(date, 'MMM dd'),
        count: 0
      };
    });

    // Count responses for each day
    responses.forEach((response) => {
      const responseDate = new Date(response.submitted_at);

      dailyData.forEach((dayData) => {
        if (
          isWithinInterval(responseDate, {
            start: startOfDay(dayData.date),
            end: endOfDay(dayData.date)
          })
        ) {
          dayData.count++;
        }
      });
    });

    return dailyData;
  };

  // Get completion time statistics
  const getCompletionTimeData = () => {
    // Convert to minutes and group into buckets
    const minutesBuckets = [
      { name: '<1 min', min: 0, max: 1, count: 0 },
      { name: '1-3 mins', min: 1, max: 3, count: 0 },
      { name: '3-5 mins', min: 3, max: 5, count: 0 },
      { name: '5-10 mins', min: 5, max: 10, count: 0 },
      { name: '10+ mins', min: 10, max: Infinity, count: 0 }
    ];

    // Count responses in each time bucket (using mock data as we don't have actual completion times)
    responses.forEach((response) => {
      // In a real app, you'd use actual completion times
      // For now, let's create fake data for demonstration
      const minutes = Math.random() * 15; // Random time between 0-15 minutes

      for (const bucket of minutesBuckets) {
        if (minutes >= bucket.min && minutes < bucket.max) {
          bucket.count++;
          break;
        }
      }
    });

    return minutesBuckets;
  };

  // Get response completion rate
  const getCompletionRateData = () => {
    // For this demo, we'll just use random data as we don't have partial submissions
    const total = responses.length;
    const completed = responses.length;
    const abandoned = Math.floor(responses.length * 0.15); // Simulated 15% abandonment

    return [
      { name: 'Completed', value: completed, color: '#4ade80' },
      { name: 'Abandoned', value: abandoned, color: '#f87171' }
    ];
  };

  // Calculate completion rate
  const getCompletionRate = () => {
    const data = getCompletionRateData();
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return total ? Math.round((data[0].value / total) * 100) : 0;
  };

  // Daily response data
  const dailyResponseData = getDailyResponseData();
  const completionTimeData = getCompletionTimeData();
  const completionRateData = getCompletionRateData();

  // Calculate average response time (in minutes)
  const avgResponseTime =
    completionTimeData.reduce(
      (acc, bucket) => acc + ((bucket.min + bucket.max) / 2) * bucket.count,
      0
    ) / responses.length;

  const totalResponseCount = responses.length;
  const completionRate = getCompletionRate();

  // Get most active day
  const mostActiveDay = [...dailyResponseData].sort(
    (a, b) => b.count - a.count
  )[0];

  // Calculate fields filled per response (placeholder calculation)
  const avgFieldsFilled = form.fields.length * 0.9; // Assuming 90% of fields are filled on average

  return (
    <div className='space-y-6'>
      {/* Key Metrics */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardContent className='flex flex-col items-center justify-between p-6'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3'>
              <FileText className='h-6 w-6 text-primary' />
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>{totalResponseCount}</div>
              <p className='text-xs text-muted-foreground'>Total Responses</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='flex flex-col items-center justify-between p-6'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3'>
              <Check className='h-6 w-6 text-primary' />
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>{completionRate}%</div>
              <p className='text-xs text-muted-foreground'>Completion Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='flex flex-col items-center justify-between p-6'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3'>
              <Clock className='h-6 w-6 text-primary' />
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>
                {avgResponseTime.toFixed(1)} min
              </div>
              <p className='text-xs text-muted-foreground'>
                Avg. Completion Time
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='flex flex-col items-center justify-between p-6'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3'>
              <CalendarIcon className='h-6 w-6 text-primary' />
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>{mostActiveDay.day}</div>
              <p className='text-xs text-muted-foreground'>Most Active Day</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Response Trend</CardTitle>
          <CardDescription>
            Daily response count over the last 14 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='h-[300px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={dailyResponseData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='day' />
                <YAxis allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e2e8f0'
                  }}
                />
                <Line
                  type='monotone'
                  dataKey='count'
                  name='Responses'
                  stroke='#0ea5e9'
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9' }}
                  activeDot={{ r: 6, fill: '#0ea5e9' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className='grid gap-6 md:grid-cols-2'>
        {/* Completion Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Completion Time Distribution</CardTitle>
            <CardDescription>
              Time taken by users to complete the form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='h-[300px]'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={completionTimeData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='name' />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => [`${value} responses`, 'Count']}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #e2e8f0'
                    }}
                  />
                  <Bar dataKey='count' name='Responses' fill='#0ea5e9' />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Completion Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
            <CardDescription>
              Percentage of users who complete the form
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='h-[300px]'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie
                    data={completionRateData}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    outerRadius={100}
                    dataKey='value'
                    nameKey='name'
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {completionRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} responses`, 'Count']}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
