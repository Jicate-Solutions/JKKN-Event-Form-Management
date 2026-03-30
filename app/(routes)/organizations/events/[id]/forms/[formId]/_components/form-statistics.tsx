'use client';

import { Form, FormField } from '@/types/forms';
import type { FormResponse } from '@/types/form-responses';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useState } from 'react';
import { format } from 'date-fns';
import { Chart } from './chart';

interface FormStatisticsProps {
  form: Form;
  responses: FormResponse[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

interface PaymentStatuses {
  paid: number;
  pending: number;
  failed: number;
  not_paid: number;
}

export function FormStatistics({ form, responses }: FormStatisticsProps) {
  const [selectedField, setSelectedField] = useState<string>(
    form.fields[0]?.id || ''
  );

  const getFieldStatistics = (field: FormField) => {
    switch (field.type) {
      case 'payment':
        // Initialize payment tracking variables
        let totalAmount = 0;
        let successfulPayments = 0;
        let currency = '₹';

        // Track detailed payment information
        let paidAmount = 0;
        let pendingAmount = 0;
        let paidCount = 0;
        let pendingCount = 0;
        let failedCount = 0;
        let notPaidCount = 0;

        // Process all responses to collect payment data
        responses.forEach((response) => {
          // Check for payment data in response_data field
          let paymentData = null;
          if (response.response_data[field.id]) {
            const data = response.response_data[field.id];
            try {
              paymentData = typeof data === 'string' ? JSON.parse(data) : data;
            } catch (e) {
              console.error('Error parsing payment data:', e);
            }
          }

          // Get payment status - prioritize field data over response status
          let status = 'not_paid';
          if (paymentData?.status) {
            status = paymentData.status.toLowerCase();
          } else if (response.payment_status) {
            status = response.payment_status.toLowerCase();
          }

          // For debugging - log payment statuses
          console.log(
            'Payment status for response:',
            response.id,
            status,
            response.payment_status
          );

          // Get payment amount - prioritize field data over response amount
          let amount = 0;
          if (paymentData?.amount) {
            amount = parseFloat(paymentData.amount);
          } else if (response.payment_amount) {
            amount = response.payment_amount;
          }

          // Get currency if available
          if (paymentData?.currency) {
            currency = paymentData.currency;
          }

          // Update statistics based on status - handle both 'paid' and 'completed' as successful payments
          if (status === 'paid' || status === 'completed') {
            paidCount++;
            paidAmount += amount;
            successfulPayments++;
          } else if (status === 'pending') {
            pendingCount++;
            pendingAmount += amount;
          } else if (status === 'failed') {
            failedCount++;
          } else {
            notPaidCount++;
          }

          // Always add to total amount if we have an amount
          if (amount > 0) {
            totalAmount += amount;
          }
        });

        const paymentRate =
          responses.length > 0
            ? (successfulPayments / responses.length) * 100
            : 0;

        const paymentStatuses: PaymentStatuses = {
          paid: paidCount,
          pending: pendingCount,
          failed: failedCount,
          not_paid: notPaidCount
        };

        return {
          type: 'payment',
          data: {
            totalAmount,
            successfulPayments,
            paymentRate: paymentRate.toFixed(1),
            currency,
            paymentStatuses,
            paidAmount,
            pendingAmount
          }
        };

      case 'select':
      case 'radio':
      case 'checkbox':
        const options = field.options || [];
        const counts = options.reduce(
          (acc, option) => {
            acc[option] = responses.filter((r) => {
              const value = r.response_data[field.id];
              return Array.isArray(value)
                ? value.includes(option)
                : value === option;
            }).length;
            return acc;
          },
          {} as Record<string, number>
        );

        return {
          type: 'choice',
          data: counts,
          labels: options
        };

      case 'conditional':
        // Extract condition options
        const conditionOptions = field.condition_options || ['Yes', 'No'];

        // Helper function to extract final values from deeply nested conditional objects
        const extractConditionalValue = (data: any): string => {
          if (!data) return '';

          // If not an object, return as mainValue
          if (typeof data !== 'object') return String(data);

          // Base case: simple mainValue/conditionalValue object
          if ('mainValue' in data && typeof data.mainValue !== 'object') {
            return data.mainValue || '';
          }

          // Recursive case: nested mainValue objects
          if ('mainValue' in data && typeof data.mainValue === 'object') {
            return extractConditionalValue(data.mainValue);
          }

          // Fallback for other structures
          return JSON.stringify(data);
        };

        // Count responses for each condition option
        const conditionalCounts = conditionOptions.reduce(
          (acc, option) => {
            acc[option] = responses.filter((r) => {
              const value = r.response_data[field.id];
              const mainValue = extractConditionalValue(value);
              return mainValue === option;
            }).length;
            return acc;
          },
          {} as Record<string, number>
        );

        return {
          type: 'choice',
          data: conditionalCounts,
          labels: conditionOptions
        };

      default:
        return null;
    }
  };

  const renderStatistics = (field: FormField) => {
    const stats = getFieldStatistics(field);
    if (!stats) return null;

    switch (stats.type) {
      case 'payment':
        // Transform payment statuses data for chart
        const paymentStatusData = Object.entries(
          stats.data.paymentStatuses || {}
        ).map(([status, count], index) => ({
          name:
            status === 'paid'
              ? 'Paid'
              : status === 'pending'
                ? 'Pending'
                : status === 'failed'
                  ? 'Failed'
                  : status === 'not_paid'
                    ? 'Not Paid'
                    : status,
          value: count,
          fill:
            status === 'paid'
              ? '#10b981'
              : status === 'pending'
                ? '#f59e0b'
                : status === 'failed'
                  ? '#ef4444'
                  : status === 'not_paid'
                    ? '#6b7280'
                    : COLORS[index % COLORS.length]
        }));

        // Get values directly from stats data
        const {
          paidAmount,
          pendingAmount,
          totalAmount,
          successfulPayments,
          paymentRate,
          currency
        } = stats.data;

        // Get counts from paymentStatuses with proper type handling
        const paymentStatusObj = stats.data.paymentStatuses as PaymentStatuses;

        const paidCount = paymentStatusObj.paid;
        const pendingCount = paymentStatusObj.pending;
        const failedCount = paymentStatusObj.failed;
        const notPaidCount = paymentStatusObj.not_paid;

        return (
          <div className='space-y-8'>
            <div className='grid grid-cols-3 gap-4'>
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className='text-lg'>Total Paid Amount</CardTitle>
                </CardHeader>
                <CardContent className='pt-0 px-4 pb-4'>
                  <p className='text-2xl font-bold'>
                    {currency} {paidAmount.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className='text-lg'>Successful Payments</CardTitle>
                </CardHeader>
                <CardContent className='pt-0 px-4 pb-4'>
                  <p className='text-2xl font-bold'>{successfulPayments}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='p-4'>
                  <CardTitle className='text-lg'>Payment Rate</CardTitle>
                </CardHeader>
                <CardContent className='pt-0 px-4 pb-4'>
                  <p className='text-2xl font-bold'>{paymentRate}%</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Payment Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className='font-medium'>
                        <div className='flex items-center gap-2'>
                          <div className='w-3 h-3 rounded-full bg-green-500'></div>
                          Paid
                        </div>
                      </TableCell>
                      <TableCell>{paidCount}</TableCell>
                      <TableCell>
                        {currency} {paidAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {((paidCount / responses.length) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='font-medium'>
                        <div className='flex items-center gap-2'>
                          <div className='w-3 h-3 rounded-full bg-yellow-500'></div>
                          Pending
                        </div>
                      </TableCell>
                      <TableCell>{pendingCount}</TableCell>
                      <TableCell>
                        {currency} {pendingAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {((pendingCount / responses.length) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='font-medium'>
                        <div className='flex items-center gap-2'>
                          <div className='w-3 h-3 rounded-full bg-red-500'></div>
                          Failed
                        </div>
                      </TableCell>
                      <TableCell>{failedCount}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        {((failedCount / responses.length) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className='font-medium'>
                        <div className='flex items-center gap-2'>
                          <div className='w-3 h-3 rounded-full bg-gray-500'></div>
                          Not Paid
                        </div>
                      </TableCell>
                      <TableCell>{notPaidCount}</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        {((notPaidCount / responses.length) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payment Status Distribution Chart */}
            {paymentStatusData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='h-[300px]'>
                    <ResponsiveContainer width='100%' height='100%'>
                      <PieChart>
                        <Pie
                          data={paymentStatusData}
                          cx='50%'
                          cy='50%'
                          labelLine={true}
                          outerRadius={100}
                          fill='#8884d8'
                          dataKey='value'
                          nameKey='name'
                          label={(entry) => `${entry.name}: ${entry.value}`}
                        >
                          {paymentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
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
            )}
          </div>
        );

      case 'choice':
        return (
          <div className='h-[300px]'>
            <Chart
              data={Object.values(stats.data).map((value) => Number(value))}
              labels={stats.labels || []}
              type='bar'
            />
          </div>
        );
    }
  };

  const statisticsFields = form.fields.filter((field) =>
    ['payment', 'select', 'radio', 'checkbox', 'conditional'].includes(
      field.type
    )
  );

  const formatFieldResponse = (
    value: any,
    fieldType?: string
  ): React.ReactNode => {
    if (value === null || value === undefined) return 'N/A';

    // Default to string formatting if fieldType is undefined
    const type = fieldType || 'text';

    switch (type) {
      case 'conditional':
        const extractConditionalValue = (
          data: any
        ): { mainValue: string; conditionalValue: string } => {
          if (!data) return { mainValue: 'N/A', conditionalValue: '' };

          // If not an object, return as mainValue
          if (typeof data !== 'object')
            return { mainValue: String(data), conditionalValue: '' };

          // Base case: simple mainValue/conditionalValue object
          if ('mainValue' in data && typeof data.mainValue !== 'object') {
            return {
              mainValue: data.mainValue || 'N/A',
              conditionalValue: data.conditionalValue || ''
            };
          }

          // Recursive case: nested mainValue objects
          if ('mainValue' in data && typeof data.mainValue === 'object') {
            // Keep the current conditionalValue, but check inner mainValue
            const innerValues = extractConditionalValue(data.mainValue);
            return {
              mainValue: innerValues.mainValue,
              conditionalValue:
                data.conditionalValue || innerValues.conditionalValue
            };
          }

          // Fallback for other structures
          return { mainValue: JSON.stringify(data), conditionalValue: '' };
        };

        const { mainValue, conditionalValue } = extractConditionalValue(value);
        if (conditionalValue) {
          return (
            <>
              <div>
                <strong>Selected:</strong> {mainValue}
              </div>
              {conditionalValue && (
                <div className='text-muted-foreground text-sm pl-2 border-l-2 border-muted mt-1 ml-1'>
                  <span className='opacity-70'>Details:</span>{' '}
                  {conditionalValue}
                </div>
              )}
            </>
          );
        }
        return mainValue;

      case 'checkbox':
      case 'multiselect':
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value);

      case 'file':
        if (typeof value === 'object' && value.url) {
          return (
            <a
              href={value.url}
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              {value.name || 'Download File'}
            </a>
          );
        }
        return 'No file';

      default:
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        if (typeof value === 'object') {
          if ('name' in value) return value.name;
          return JSON.stringify(value);
        }
        return String(value || 'N/A');
    }
  };

  return (
    <Tabs defaultValue='visualization' className='w-full'>
      <TabsList className='w-full'>
        <TabsTrigger value='visualization' className='flex-1'>
          Visualization
        </TabsTrigger>
        <TabsTrigger value='details' className='flex-1'>
          Response Details
        </TabsTrigger>
      </TabsList>

      <TabsContent value='visualization' className='mt-4'>
        <div className='space-y-6'>
          <div className='flex items-center gap-4'>
            <p className='text-sm font-medium'>Select Field:</p>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger className='w-[240px]'>
                <SelectValue placeholder='Select a field' />
              </SelectTrigger>
              <SelectContent>
                {statisticsFields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedField && (
            <div>
              {renderStatistics(
                form.fields.find((f) => f.id === selectedField)!
              )}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value='details' className='mt-4'>
        <div className='space-y-4'>
          <div className='flex items-center gap-4'>
            <Select
              value={selectedField || ''}
              onValueChange={setSelectedField}
            >
              <SelectTrigger className='w-[300px]'>
                <SelectValue placeholder='Select a field to view responses' />
              </SelectTrigger>
              <SelectContent>
                {form.fields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedField && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {form.fields.find((f) => f.id === selectedField)?.label}
                </CardTitle>
                <CardDescription>
                  Showing all responses for this field
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response, index) => (
                      <TableRow key={index}>
                        <TableCell>{response.user_email}</TableCell>
                        <TableCell>
                          {formatFieldResponse(
                            response.response_data[selectedField],
                            form.fields.find((f) => f.id === selectedField)
                              ?.type
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(response.submitted_at), 'PPp')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
