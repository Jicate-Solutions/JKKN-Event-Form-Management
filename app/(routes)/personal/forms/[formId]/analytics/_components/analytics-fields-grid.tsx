'use client';

import { PersonalForm } from '@/types/personal-forms';
import { FormField } from '@/types/forms';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
  Legend
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  BarChartIcon,
  ListIcon,
  TextIcon,
  MailIcon,
  Calendar,
  Hash,
  FileIcon,
  CheckSquare
} from 'lucide-react';

interface AnalyticsFieldsGridProps {
  form: PersonalForm;
  fieldStatistics: Array<{
    fieldId: string;
    fieldType: string;
    label: string;
    totalResponses: number;
    filledCount: number;
    emptyCount: number;
    fillRate: number;
    optionDistribution?: { option: string; count: number; percentage: number }[];
    textStats?: {
      uniqueValues: number;
      avgLength: number;
      minLength: number;
      maxLength: number;
      topValues: { value: string; count: number; percentage: number }[];
    };
    numberStats?: {
      min: number;
      max: number;
      avg: number;
      median: number;
      sum: number;
      distribution: { range: string; count: number }[];
    };
    dateStats?: {
      earliest: string;
      latest: string;
      mostCommon: string;
      distribution: { date: string; count: number }[];
    };
    fileStats?: {
      totalFiles: number;
      fileTypes: { type: string; count: number }[];
    };
  }>;
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#ff6b6b',
  '#663399',
  '#f06595',
  '#20c997'
];

export function AnalyticsFieldsGrid({
  form,
  fieldStatistics
}: AnalyticsFieldsGridProps) {
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>(
    {}
  );

  // Helper to toggle expanded state for a field
  const toggleExpandField = (fieldId: string) => {
    setExpandedFields((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  // Get icon for field type
  const getFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text':
        return <TextIcon className='h-4 w-4' />;
      case 'email':
        return <MailIcon className='h-4 w-4' />;
      case 'select':
        return <ListIcon className='h-4 w-4' />;
      case 'radio':
        return <BarChartIcon className='h-4 w-4' />;
      case 'checkbox':
        return <CheckSquare className='h-4 w-4' />;
      case 'date':
        return <Calendar className='h-4 w-4' />;
      case 'number':
        return <Hash className='h-4 w-4' />;
      case 'file':
        return <FileIcon className='h-4 w-4' />;
      default:
        return <TextIcon className='h-4 w-4' />;
    }
  };

  // Helper to determine chart type based on data
  const getChartType = (optionCount: number) => {
    return optionCount <= 5 ? 'pie' : 'bar';
  };

  // Filter fields that can be visualized with charts
  const chartableFields = fieldStatistics.filter(
    (stat) =>
      stat.optionDistribution &&
      stat.optionDistribution.length > 0
  );

  // Non-chartable fields (text, email, date, number, etc.)
  const nonChartableFields = fieldStatistics.filter(
    (stat) => !stat.optionDistribution || stat.optionDistribution.length === 0
  );

  // No fields to display
  if (fieldStatistics.length === 0) {
    return (
      <Card>
        <CardContent className='py-10 text-center'>
          <p className='text-muted-foreground'>
            This form doesn&apos;t contain any fields to analyze.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Chartable fields */}
      {chartableFields.length > 0 && (
        <>
          <h3 className='text-lg font-medium'>Choice Fields</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {chartableFields.map((stat) => {
              const chartData = stat.optionDistribution!;
              const chartType = getChartType(chartData.length);

              return (
                <Card key={stat.fieldId} className='overflow-hidden'>
                  <CardHeader className='pb-0'>
                    <div className='flex justify-between items-start'>
                      <div>
                        <CardTitle className='text-base font-medium'>
                          {stat.label}
                        </CardTitle>
                        <CardDescription className='text-xs'>
                          {stat.totalResponses} responses
                        </CardDescription>
                      </div>
                      <Badge variant='outline' className='text-xs'>
                        {stat.fieldType}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className='h-[300px] mt-4'>
                      {chartType === 'pie' ? (
                        <ResponsiveContainer width='100%' height='100%'>
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx='50%'
                              cy='50%'
                              labelLine={true}
                              outerRadius={100}
                              fill='#8884d8'
                              dataKey='count'
                              nameKey='option'
                              label={({ option, percentage }) =>
                                `${option}: ${percentage}%`
                              }
                            >
                              {chartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value, name, props) => [
                                `${value} responses (${props.payload.percentage}%)`,
                                'Count'
                              ]}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width='100%' height='100%'>
                          <BarChart
                            data={chartData}
                            layout='vertical'
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray='3 3'
                              className='stroke-muted'
                            />
                            <XAxis type='number' tick={{ fill: 'currentColor' }} />
                            <YAxis
                              dataKey='option'
                              type='category'
                              width={150}
                              tick={{ fontSize: 12, fill: 'currentColor' }}
                            />
                            <Tooltip
                              formatter={(value, name, props) => [
                                `${value} responses (${props.payload.percentage}%)`,
                                'Count'
                              ]}
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px'
                              }}
                            />
                            <Bar dataKey='count' fill='#0ea5e9' radius={[0, 4, 4, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={COLORS[index % COLORS.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Show detailed response count table */}
                    <div className='mt-6 border-t pt-4'>
                      <h4 className='text-sm font-medium mb-2'>
                        Response Breakdown
                      </h4>
                      <div className='grid grid-cols-2 gap-2 text-sm'>
                        {chartData.map((item, index) => (
                          <div key={index} className='flex justify-between'>
                            <span className='font-medium truncate'>
                              {item.option}:
                            </span>
                            <span className='text-muted-foreground ml-2'>
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Non-chartable fields */}
      {nonChartableFields.length > 0 && (
        <>
          <h3 className='text-lg font-medium mt-8'>Text & Other Fields</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {nonChartableFields.map((stat) => {
              const isExpanded = expandedFields[stat.fieldId] || false;

              return (
                <Card key={stat.fieldId}>
                  <CardHeader className='pb-3'>
                    <div className='flex justify-between items-start'>
                      <div className='flex items-center gap-2'>
                        {getFieldIcon(stat.fieldType)}
                        <CardTitle className='text-base font-medium'>
                          {stat.label}
                        </CardTitle>
                      </div>
                      <Badge variant='outline' className='text-xs'>
                        {stat.fieldType}
                      </Badge>
                    </div>
                    <CardDescription className='text-xs mt-1'>
                      {stat.totalResponses} total responses
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='pb-3 space-y-4'>
                    <div className='space-y-2'>
                      <div className='flex justify-between text-sm'>
                        <span>Completion rate:</span>
                        <span className='font-medium'>{stat.fillRate}%</span>
                      </div>
                      <Progress value={stat.fillRate} className='h-2' />
                    </div>

                    <div className='grid grid-cols-2 gap-4 text-sm'>
                      <div className='bg-muted/30 p-2 rounded-md'>
                        <div className='text-xs text-muted-foreground'>
                          Filled
                        </div>
                        <div className='font-medium'>{stat.filledCount}</div>
                      </div>
                      <div className='bg-muted/30 p-2 rounded-md'>
                        <div className='text-xs text-muted-foreground'>
                          Empty
                        </div>
                        <div className='font-medium'>{stat.emptyCount}</div>
                      </div>

                      {/* Text field stats */}
                      {stat.textStats && (
                        <>
                          <div className='bg-muted/30 p-2 rounded-md'>
                            <div className='text-xs text-muted-foreground'>
                              Unique values
                            </div>
                            <div className='font-medium'>
                              {stat.textStats.uniqueValues}
                            </div>
                          </div>
                          <div className='bg-muted/30 p-2 rounded-md'>
                            <div className='text-xs text-muted-foreground'>
                              Avg. length
                            </div>
                            <div className='font-medium'>
                              {stat.textStats.avgLength} chars
                            </div>
                          </div>
                        </>
                      )}

                      {/* Number field stats */}
                      {stat.numberStats && (
                        <>
                          <div className='bg-muted/30 p-2 rounded-md'>
                            <div className='text-xs text-muted-foreground'>
                              Min / Max
                            </div>
                            <div className='font-medium text-xs'>
                              {stat.numberStats.min} / {stat.numberStats.max}
                            </div>
                          </div>
                          <div className='bg-muted/30 p-2 rounded-md'>
                            <div className='text-xs text-muted-foreground'>
                              Average
                            </div>
                            <div className='font-medium'>
                              {stat.numberStats.avg}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Date field stats */}
                      {stat.dateStats && stat.dateStats.earliest && (
                        <>
                          <div className='bg-muted/30 p-2 rounded-md col-span-2'>
                            <div className='text-xs text-muted-foreground'>
                              Date Range
                            </div>
                            <div className='font-medium text-xs'>
                              {stat.dateStats.earliest} to {stat.dateStats.latest}
                            </div>
                          </div>
                        </>
                      )}

                      {/* File field stats */}
                      {stat.fileStats && (
                        <>
                          <div className='bg-muted/30 p-2 rounded-md col-span-2'>
                            <div className='text-xs text-muted-foreground'>
                              Total Files
                            </div>
                            <div className='font-medium'>
                              {stat.fileStats.totalFiles}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>

                  {/* Top values for text fields */}
                  {stat.textStats && stat.textStats.topValues.length > 0 && (
                    <CardFooter className='flex flex-col items-start pt-0 px-6'>
                      <button
                        className='flex items-center text-sm text-primary mb-2 hover:underline'
                        onClick={() => toggleExpandField(stat.fieldId)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className='h-4 w-4 mr-1' />
                            Hide common responses
                          </>
                        ) : (
                          <>
                            <ChevronDown className='h-4 w-4 mr-1' />
                            Show common responses
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className='w-full space-y-2 text-sm'>
                          <div className='text-xs text-muted-foreground'>
                            Most common responses:
                          </div>
                          {stat.textStats.topValues.map((item, index) => (
                            <div key={index} className='flex justify-between'>
                              <span className='truncate max-w-[200px]'>
                                {item.value}
                              </span>
                              <span className='text-muted-foreground'>
                                {item.count} ({item.percentage}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardFooter>
                  )}

                  {/* Distribution for number fields */}
                  {stat.numberStats && stat.numberStats.distribution.length > 0 && (
                    <CardFooter className='flex flex-col items-start pt-0 px-6'>
                      <button
                        className='flex items-center text-sm text-primary mb-2 hover:underline'
                        onClick={() => toggleExpandField(stat.fieldId)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className='h-4 w-4 mr-1' />
                            Hide distribution
                          </>
                        ) : (
                          <>
                            <ChevronDown className='h-4 w-4 mr-1' />
                            Show distribution
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className='w-full space-y-2 text-sm'>
                          <div className='text-xs text-muted-foreground'>
                            Value distribution:
                          </div>
                          {stat.numberStats.distribution.map((item, index) => (
                            <div key={index} className='flex justify-between'>
                              <span>{item.range}</span>
                              <span className='text-muted-foreground'>
                                {item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
