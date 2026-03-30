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
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  CalendarIcon,
  FileText,
  Clock,
  Check,
  Users,
  TrendingUp,
  Activity
} from 'lucide-react';

interface AnalyticsOverviewProps {
  form: PersonalForm;
  overview: {
    totalResponses: number;
    uniqueSubmitters: number;
    completionRate: number;
    avgCompletionTime: number;
    responsesByPeriod: {
      date: string;
      day: string;
      count: number;
      cumulativeCount: number;
    }[];
    peakSubmissionDay: string;
    responseVelocity: number;
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
    userTypeBreakdown?: {
      student: number;
      staff: number;
      noProfile: number;
    };
    institutionBreakdown?: Record<string, number>;
    topInstitution?: string | null;
    departmentBreakdown?: Record<string, number>;
    topDepartment?: string | null;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function AnalyticsOverview({ form, overview }: AnalyticsOverviewProps) {
  // Prepare hour labels for better readability
  const hourlyData = overview.responsesByHourOfDay.map((item) => ({
    ...item,
    hourLabel: `${item.hour === 0 ? 12 : item.hour > 12 ? item.hour - 12 : item.hour}${
      item.hour >= 12 ? 'PM' : 'AM'
    }`
  }));

  // Get top 3 most active days
  const topDaysOfWeek = [...overview.responsesByDayOfWeek]
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Get peak hour
  const peakHour = [...overview.responsesByHourOfDay].sort(
    (a, b) => b.count - a.count
  )[0];
  const peakHourLabel = peakHour
    ? `${peakHour.hour === 0 ? 12 : peakHour.hour > 12 ? peakHour.hour - 12 : peakHour.hour}${
        peakHour.hour >= 12 ? 'PM' : 'AM'
      }`
    : 'N/A';

  return (
    <div className='space-y-6'>
      {/* Key Metrics Grid */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardContent className='flex flex-col items-center justify-between p-6'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 mb-3'>
              <FileText className='h-6 w-6 text-blue-600 dark:text-blue-300' />
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>
                {overview.totalResponses}
              </div>
              <p className='text-xs text-muted-foreground'>Total Responses</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='flex flex-col items-center justify-between p-6'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-3'>
              <Users className='h-6 w-6 text-green-600 dark:text-green-300' />
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>
                {overview.uniqueSubmitters}
              </div>
              <p className='text-xs text-muted-foreground'>Unique Submitters</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='flex flex-col items-center justify-between p-6'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900 mb-3'>
              <Check className='h-6 w-6 text-purple-600 dark:text-purple-300' />
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>{overview.completionRate}%</div>
              <p className='text-xs text-muted-foreground'>Completion Rate</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='flex flex-col items-center justify-between p-6'>
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900 mb-3'>
              <TrendingUp className='h-6 w-6 text-orange-600 dark:text-orange-300' />
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>
                {overview.responseVelocity.toFixed(1)}
              </div>
              <p className='text-xs text-muted-foreground'>Responses/Day</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center gap-3'>
              <CalendarIcon className='h-5 w-5 text-muted-foreground' />
              <div>
                <p className='text-sm text-muted-foreground'>
                  Peak Submission Day
                </p>
                <p className='text-lg font-semibold'>
                  {overview.peakSubmissionDay}
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
                <p className='text-sm text-muted-foreground'>Peak Hour</p>
                <p className='text-lg font-semibold'>{peakHourLabel}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center gap-3'>
              <Activity className='h-5 w-5 text-muted-foreground' />
              <div>
                <p className='text-sm text-muted-foreground'>Form Status</p>
                <p className='text-lg font-semibold'>
                  {overview.submissionStatus.atLimit ? (
                    <span className='text-destructive'>At Limit</span>
                  ) : overview.submissionStatus.remaining !== null ? (
                    <span className='text-green-600 dark:text-green-400'>
                      {overview.submissionStatus.remaining} remaining
                    </span>
                  ) : (
                    <span className='text-green-600 dark:text-green-400'>
                      Unlimited
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MYJKKN Profile Stats - Only show if data exists */}
      {overview.userTypeBreakdown && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>MYJKKN Profile Statistics</CardTitle>
              <CardDescription>
                Breakdown of responses by user type and department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
                <div className='text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg'>
                  <div className='text-3xl font-bold text-blue-600 dark:text-blue-400'>
                    {overview.userTypeBreakdown.student}
                  </div>
                  <p className='text-sm text-muted-foreground mt-1'>Students</p>
                  {overview.totalResponses > 0 && (
                    <p className='text-xs text-muted-foreground mt-1'>
                      {Math.round(
                        (overview.userTypeBreakdown.student /
                          overview.totalResponses) *
                          100
                      )}
                      %
                    </p>
                  )}
                </div>

                <div className='text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg'>
                  <div className='text-3xl font-bold text-green-600 dark:text-green-400'>
                    {overview.userTypeBreakdown.staff}
                  </div>
                  <p className='text-sm text-muted-foreground mt-1'>Staff</p>
                  {overview.totalResponses > 0 && (
                    <p className='text-xs text-muted-foreground mt-1'>
                      {Math.round(
                        (overview.userTypeBreakdown.staff /
                          overview.totalResponses) *
                          100
                      )}
                      %
                    </p>
                  )}
                </div>

                <div className='text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg'>
                  <div className='text-3xl font-bold text-gray-600 dark:text-gray-400'>
                    {overview.userTypeBreakdown.noProfile}
                  </div>
                  <p className='text-sm text-muted-foreground mt-1'>
                    No Profile
                  </p>
                  {overview.totalResponses > 0 && (
                    <p className='text-xs text-muted-foreground mt-1'>
                      {Math.round(
                        (overview.userTypeBreakdown.noProfile /
                          overview.totalResponses) *
                          100
                      )}
                      %
                    </p>
                  )}
                </div>

                <div className='text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg'>
                  <div className='text-lg font-bold text-purple-600 dark:text-purple-400 truncate'>
                    {overview.topInstitution || 'N/A'}
                  </div>
                  <p className='text-sm text-muted-foreground mt-1'>
                    Top Institution
                  </p>
                  {overview.topInstitution &&
                    overview.institutionBreakdown &&
                    overview.totalResponses > 0 && (
                      <p className='text-xs text-muted-foreground mt-1'>
                        {overview.institutionBreakdown[overview.topInstitution]}{' '}
                        responses
                      </p>
                    )}
                </div>
              </div>

              {/* Top Department - Only show if we have department data */}
              {overview.topDepartment && (
                <div className='grid grid-cols-1 gap-4 md:grid-cols-1 mt-4'>
                  <div className='text-center p-4 bg-indigo-50 dark:bg-indigo-950 rounded-lg'>
                    <div className='text-lg font-bold text-indigo-600 dark:text-indigo-400 truncate'>
                      {overview.topDepartment}
                    </div>
                    <p className='text-sm text-muted-foreground mt-1'>
                      Top Department
                    </p>
                    {overview.departmentBreakdown &&
                      overview.totalResponses > 0 && (
                        <p className='text-xs text-muted-foreground mt-1'>
                          {overview.departmentBreakdown[overview.topDepartment]}{' '}
                          responses
                        </p>
                      )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Institution Distribution Chart */}
          {overview.institutionBreakdown &&
            Object.keys(overview.institutionBreakdown).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Institution Distribution</CardTitle>
                  <CardDescription>
                    Responses breakdown by institution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='h-[300px]'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart
                        data={Object.entries(overview.institutionBreakdown)
                          .map(([inst, count]) => ({
                            institution: inst,
                            count
                          }))
                          .sort((a, b) => b.count - a.count)}
                      >
                        <CartesianGrid
                          strokeDasharray='3 3'
                          className='stroke-muted'
                        />
                        <XAxis
                          dataKey='institution'
                          className='text-xs'
                          tick={{ fill: 'currentColor', fontSize: 10 }}
                          angle={-45}
                          textAnchor='end'
                          height={100}
                        />
                        <YAxis
                          allowDecimals={false}
                          className='text-xs'
                          tick={{ fill: 'currentColor' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                          formatter={(value) => [`${value} responses`, 'Count']}
                        />
                        <Bar
                          dataKey='count'
                          name='Responses'
                          fill='#ec4899'
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Department Distribution Chart */}
          {overview.departmentBreakdown &&
            Object.keys(overview.departmentBreakdown).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Department Distribution</CardTitle>
                  <CardDescription>
                    Responses breakdown by department
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='h-[300px]'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <BarChart
                        data={Object.entries(overview.departmentBreakdown)
                          .map(([dept, count]) => ({
                            department: dept,
                            count
                          }))
                          .sort((a, b) => b.count - a.count)}
                      >
                        <CartesianGrid
                          strokeDasharray='3 3'
                          className='stroke-muted'
                        />
                        <XAxis
                          dataKey='department'
                          className='text-xs'
                          tick={{ fill: 'currentColor', fontSize: 10 }}
                          angle={-45}
                          textAnchor='end'
                          height={100}
                        />
                        <YAxis
                          allowDecimals={false}
                          className='text-xs'
                          tick={{ fill: 'currentColor' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px'
                          }}
                          formatter={(value) => [`${value} responses`, 'Count']}
                        />
                        <Bar
                          dataKey='count'
                          name='Responses'
                          fill='#6366f1'
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
        </>
      )}

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
              <LineChart data={overview.responsesByPeriod}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                <XAxis
                  dataKey='day'
                  className='text-xs'
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis
                  allowDecimals={false}
                  className='text-xs'
                  tick={{ fill: 'currentColor' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Line
                  type='monotone'
                  dataKey='count'
                  name='Responses'
                  stroke='#0ea5e9'
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9', r: 4 }}
                  activeDot={{ r: 6, fill: '#0ea5e9' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Response Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Responses</CardTitle>
          <CardDescription>
            Total responses accumulated over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='h-[300px]'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={overview.responsesByPeriod}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                <XAxis
                  dataKey='day'
                  className='text-xs'
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis
                  allowDecimals={false}
                  className='text-xs'
                  tick={{ fill: 'currentColor' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Area
                  type='monotone'
                  dataKey='cumulativeCount'
                  name='Total Responses'
                  stroke='#10b981'
                  fill='#10b981'
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className='grid gap-6 md:grid-cols-2'>
        {/* Day of Week Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Responses by Day of Week</CardTitle>
            <CardDescription>
              Distribution of responses across weekdays
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='h-[300px]'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={overview.responsesByDayOfWeek}>
                  <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                  <XAxis
                    dataKey='day'
                    className='text-xs'
                    tick={{ fill: 'currentColor', fontSize: 10 }}
                    angle={-45}
                    textAnchor='end'
                    height={60}
                  />
                  <YAxis
                    allowDecimals={false}
                    className='text-xs'
                    tick={{ fill: 'currentColor' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value) => [`${value} responses`, 'Count']}
                  />
                  <Bar dataKey='count' name='Responses' fill='#0ea5e9' radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hour of Day Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Responses by Hour of Day</CardTitle>
            <CardDescription>
              Peak submission hours throughout the day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='h-[300px]'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                  <XAxis
                    dataKey='hourLabel'
                    className='text-xs'
                    tick={{ fill: 'currentColor', fontSize: 9 }}
                    angle={-45}
                    textAnchor='end'
                    height={60}
                  />
                  <YAxis
                    allowDecimals={false}
                    className='text-xs'
                    tick={{ fill: 'currentColor' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={(value) => [`${value} responses`, 'Count']}
                  />
                  <Bar dataKey='count' name='Responses' fill='#8b5cf6' radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Active Days Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Most Active Days</CardTitle>
          <CardDescription>
            Top 3 days with highest response counts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {topDaysOfWeek.map((day, index) => (
              <div key={day.day} className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold'>
                    {index + 1}
                  </div>
                  <span className='font-medium'>{day.day}</span>
                </div>
                <div className='text-right'>
                  <div className='font-semibold'>{day.count} responses</div>
                  <div className='text-xs text-muted-foreground'>
                    {overview.totalResponses > 0
                      ? Math.round((day.count / overview.totalResponses) * 100)
                      : 0}
                    % of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
