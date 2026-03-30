'use client';

import { Form, FormField } from '@/types/forms';
import { FormResponse } from '@/types/form-responses';
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
  FileIcon
} from 'lucide-react';

interface StatisticsFieldsGridProps {
  form: Form;
  responses: FormResponse[];
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

export function StatisticsFieldsGrid({
  form,
  responses
}: StatisticsFieldsGridProps) {
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

  // Helper to get field statistics based on field type
  const getFieldStatistics = (field: FormField) => {
    // Only process field types that can be visualized with charts
    if (!['select', 'radio', 'checkbox', 'conditional'].includes(field.type)) {
      return null;
    }

    // For choice-based fields (select, radio, checkbox, conditional)
    const options = field.options || field.condition_options || [];
    if (options.length === 0) return null;

    // Count occurrences of each option
    const counts = options.reduce(
      (acc, option) => {
        acc[option] = responses.filter((r) => {
          const value = r.response_data[field.id];

          // Handle arrays (checkboxes, multi-select)
          if (Array.isArray(value)) {
            return value.includes(option);
          }

          // Handle conditional fields with nested structure
          if (typeof value === 'object' && value?.mainValue) {
            return value.mainValue === option;
          }

          // Simple value comparison
          return value === option;
        }).length;
        return acc;
      },
      {} as Record<string, number>
    );

    // Convert to chart data format
    const chartData = Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: Math.round((value / responses.length) * 100)
    }));

    return chartData;
  };

  // Helper to get text field statistics
  const getTextFieldStatistics = (field: FormField) => {
    // Count filled vs empty responses
    let filledCount = 0;
    let emptyCount = 0;
    const uniqueValues = new Set();
    const values: string[] = [];

    // Most common values (for text fields)
    const valueFrequency: Record<string, number> = {};

    responses.forEach((response) => {
      const value = response.response_data[field.id];

      if (value === undefined || value === null || value === '') {
        emptyCount++;
      } else {
        filledCount++;
        // Keep track of unique values
        const stringValue =
          typeof value === 'object' ? JSON.stringify(value) : String(value);
        uniqueValues.add(stringValue);
        values.push(stringValue);

        // Count frequency of each value
        if (valueFrequency[stringValue]) {
          valueFrequency[stringValue]++;
        } else {
          valueFrequency[stringValue] = 1;
        }
      }
    });

    // Get most common values (top 5)
    const topValues = Object.entries(valueFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({
        text: text.length > 30 ? text.substring(0, 30) + '...' : text,
        count,
        percentage: Math.round((count / responses.length) * 100)
      }));

    // Average length for text inputs
    const avgLength =
      values.length > 0
        ? Math.round(
            values.reduce((sum, val) => sum + val.length, 0) / values.length
          )
        : 0;

    return {
      filledCount,
      emptyCount,
      uniqueCount: uniqueValues.size,
      fillRate: Math.round((filledCount / responses.length) * 100),
      topValues,
      avgLength
    };
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
        return <BarChartIcon className='h-4 w-4' />;
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

  // Filter fields that can be visualized with charts
  const chartableFields = form.fields.filter((field) =>
    ['select', 'radio', 'checkbox', 'conditional'].includes(field.type)
  );

  // Non-chartable fields (text, email, date, number, etc.)
  const nonChartableFields = form.fields.filter(
    (field) =>
      !['select', 'radio', 'checkbox', 'conditional'].includes(field.type) &&
      field.type !== 'payment' &&
      field.type !== 'image'
  );

  // Helper function to determine chart type based on data
  const getChartType = (field: FormField) => {
    // Use pie chart for fields with fewer options
    if ((field.options || field.condition_options || []).length <= 5) {
      return 'pie';
    }
    // Use bar chart for fields with more options
    return 'bar';
  };

  // No fields to display
  if (form.fields.length === 0) {
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
            {chartableFields.map((field) => {
              const chartData = getFieldStatistics(field);
              const chartType = getChartType(field);

              if (!chartData || chartData.length === 0) return null;

              return (
                <Card key={field.id} className='overflow-hidden'>
                  <CardHeader className='pb-0'>
                    <div className='flex justify-between items-start'>
                      <div>
                        <CardTitle className='text-base font-medium'>
                          {field.label}
                        </CardTitle>
                        <CardDescription className='text-xs'>
                          {responses.length} responses
                        </CardDescription>
                      </div>
                      <Badge variant='outline' className='text-xs'>
                        {field.type}
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
                              dataKey='value'
                              nameKey='name'
                              label={({ name, percentage }) =>
                                `${name}: ${percentage}%`
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
                            <CartesianGrid strokeDasharray='3 3' />
                            <XAxis type='number' />
                            <YAxis
                              dataKey='name'
                              type='category'
                              width={150}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip
                              formatter={(value, name, props) => [
                                `${value} responses (${props.payload.percentage}%)`,
                                'Count'
                              ]}
                            />
                            <Bar
                              dataKey='value'
                              fill='#0ea5e9'
                              label={{
                                position: 'right',
                                formatter: (item: { percentage: number }) =>
                                  `${item.percentage}%`
                              }}
                            >
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
                              {item.name}:
                            </span>
                            <span className='text-muted-foreground ml-2'>
                              {item.value} ({item.percentage}%)
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
            {nonChartableFields.map((field) => {
              const stats = getTextFieldStatistics(field);
              const isExpanded = expandedFields[field.id] || false;

              return (
                <Card key={field.id}>
                  <CardHeader className='pb-3'>
                    <div className='flex justify-between items-start'>
                      <div className='flex items-center gap-2'>
                        {getFieldIcon(field.type)}
                        <CardTitle className='text-base font-medium'>
                          {field.label}
                        </CardTitle>
                      </div>
                      <Badge variant='outline' className='text-xs'>
                        {field.type}
                      </Badge>
                    </div>
                    <CardDescription className='text-xs mt-1'>
                      {responses.length} total responses
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='pb-3 space-y-4'>
                    <div className='space-y-2'>
                      <div className='flex justify-between text-sm'>
                        <span>Completion rate:</span>
                        <span className='font-medium'>{stats.fillRate}%</span>
                      </div>
                      <Progress value={stats.fillRate} className='h-2' />
                    </div>

                    <div className='grid grid-cols-2 gap-4 text-sm'>
                      <div className='bg-muted/30 p-2 rounded-md'>
                        <div className='text-xs text-muted-foreground'>
                          Filled
                        </div>
                        <div className='font-medium'>{stats.filledCount}</div>
                      </div>
                      <div className='bg-muted/30 p-2 rounded-md'>
                        <div className='text-xs text-muted-foreground'>
                          Empty
                        </div>
                        <div className='font-medium'>{stats.emptyCount}</div>
                      </div>
                      <div className='bg-muted/30 p-2 rounded-md'>
                        <div className='text-xs text-muted-foreground'>
                          Unique values
                        </div>
                        <div className='font-medium'>{stats.uniqueCount}</div>
                      </div>
                      {field.type === 'text' ||
                      field.type === 'textarea' ||
                      field.type === 'email' ? (
                        <div className='bg-muted/30 p-2 rounded-md'>
                          <div className='text-xs text-muted-foreground'>
                            Avg. length
                          </div>
                          <div className='font-medium'>
                            {stats.avgLength} chars
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </CardContent>

                  {stats.topValues.length > 0 && (
                    <CardFooter className='flex flex-col items-start pt-0 px-6'>
                      <button
                        className='flex items-center text-sm text-primary mb-2'
                        onClick={() => toggleExpandField(field.id)}
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
                          {stats.topValues.map((item, index) => (
                            <div key={index} className='flex justify-between'>
                              <span className='truncate max-w-[200px]'>
                                {item.text}
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
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Files, images and other special fields could be handled here */}
      {form.fields.filter((field) =>
        ['file', 'image', 'payment'].includes(field.type)
      ).length > 0 && (
        <div className='mt-8'>
          <h3 className='text-lg font-medium'>Other Fields</h3>
          <p className='text-sm text-muted-foreground mt-1'>
            Detailed statistics for file uploads, images, and payment fields are
            not available in this view.
          </p>
        </div>
      )}
    </div>
  );
}
