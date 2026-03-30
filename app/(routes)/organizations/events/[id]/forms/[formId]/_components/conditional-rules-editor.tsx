'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, X } from 'lucide-react';
import {
  FormField,
  ConditionalRule,
  ConditionalRuleState,
  ConditionalRuleAction
} from '@/types/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ConditionalRulesEditorProps {
  field: FormField;
  allFields: FormField[];
  onUpdate: (updates: Partial<FormField>) => void;
}

const STATE_OPTIONS: { value: ConditionalRuleState; label: string }[] = [
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_filled', label: 'Is Filled' },
  { value: 'is_equal', label: 'Is Equal To' },
  { value: 'is_not_equal', label: 'Is Not Equal To' },
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Does Not Contain' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'before', label: 'Before (Date)' },
  { value: 'after', label: 'After (Date)' },
  { value: 'equal_to_date', label: 'Equal To (Date)' },
  { value: 'not_equal_to_date', label: 'Not Equal To (Date)' },
  { value: 'equal_to_day', label: 'Equal To (Day)' },
  { value: 'not_equal_to_day', label: 'Not Equal To (Day)' }
];

const ACTION_OPTIONS: { value: ConditionalRuleAction; label: string }[] = [
  { value: 'show', label: 'Show Field' },
  { value: 'hide', label: 'Hide Field' },
  { value: 'show_multiple', label: 'Show Multiple Fields' },
  { value: 'hide_multiple', label: 'Hide Multiple Fields' }
];

// Helper to check if a state requires a value input
const stateRequiresValue = (state: ConditionalRuleState): boolean => {
  return !['is_empty', 'is_filled'].includes(state);
};

// Helper to detect potential circular dependencies
const detectCircularDependency = (
  currentFieldId: string,
  sourceFieldId: string,
  targetFieldIds: string[],
  allRules: ConditionalRule[]
): boolean => {
  // If source field is targeting the current field, check for potential loops
  if (
    sourceFieldId === currentFieldId &&
    targetFieldIds.includes(currentFieldId)
  ) {
    return true;
  }

  // Additional logic could be added here to detect more complex circular dependencies
  // across multiple fields if needed

  return false;
};

// Add this helper function before the ConditionalRulesEditor component
// to filter condition options based on field type
const getStateOptionsForFieldType = (
  fieldType: string | undefined
): { value: ConditionalRuleState; label: string }[] => {
  const commonOptions = [
    { value: 'is_empty' as ConditionalRuleState, label: 'Is Empty' },
    { value: 'is_filled' as ConditionalRuleState, label: 'Is Filled' },
    { value: 'is_equal' as ConditionalRuleState, label: 'Is Equal To' },
    { value: 'is_not_equal' as ConditionalRuleState, label: 'Is Not Equal To' }
  ];

  if (!fieldType) return commonOptions;

  switch (fieldType) {
    case 'text':
    case 'textarea':
    case 'email':
      return [
        ...commonOptions,
        { value: 'contains' as ConditionalRuleState, label: 'Contains' },
        {
          value: 'not_contains' as ConditionalRuleState,
          label: 'Does Not Contain'
        }
      ];

    case 'number':
      return [
        ...commonOptions,
        {
          value: 'greater_than' as ConditionalRuleState,
          label: 'Greater Than'
        },
        { value: 'less_than' as ConditionalRuleState, label: 'Less Than' }
      ];

    case 'date':
      return [
        ...commonOptions,
        { value: 'before' as ConditionalRuleState, label: 'Before (Date)' },
        { value: 'after' as ConditionalRuleState, label: 'After (Date)' },
        {
          value: 'equal_to_date' as ConditionalRuleState,
          label: 'Equal To (Date)'
        },
        {
          value: 'not_equal_to_date' as ConditionalRuleState,
          label: 'Not Equal To (Date)'
        },
        {
          value: 'equal_to_day' as ConditionalRuleState,
          label: 'Equal To (Day)'
        },
        {
          value: 'not_equal_to_day' as ConditionalRuleState,
          label: 'Not Equal To (Day)'
        }
      ];

    case 'select':
    case 'radio':
    case 'checkbox':
      return commonOptions;

    default:
      return commonOptions;
  }
};

export function ConditionalRulesEditor({
  field,
  allFields,
  onUpdate
}: ConditionalRulesEditorProps) {
  const rules = field.conditional_rules || [];

  // FIXED: Allow ALL fields to be used as source fields, including the current field
  // This enables more flexible conditional logic scenarios such as:
  // - Progressive disclosure where a field's visibility depends on its own value
  // - Multi-step conditional logic
  // - Dynamic form validation scenarios
  //
  // Previous implementation excluded the current field to prevent circular dependencies,
  // but this was too restrictive. We now allow self-references with proper warnings
  // to alert users about potential circular logic issues.
  const availableSourceFields = allFields;

  // For target fields, we NEED TO INCLUDE ALL FIELDS INCLUDING the current field
  // for proper conditional logic support
  const availableTargetFields = allFields;

  const addRule = () => {
    // Ensure we have source fields before creating a rule
    if (availableSourceFields.length === 0) {
      return;
    }

    // Find a non-current field to use as target by default to avoid initial self-reference
    const potentialTargets = allFields.filter((f) => f.id !== field.id);
    const defaultTargetId =
      potentialTargets.length > 0 ? potentialTargets[0].id : '';

    const newRule: ConditionalRule = {
      id: uuidv4(),
      source_field_id:
        availableSourceFields.length > 0 ? availableSourceFields[0].id : '',
      state: 'is_filled' as ConditionalRuleState,
      action: 'show',
      target_field_ids: [] // Start with empty target
    };

    const updatedRules = [...rules, newRule];
    onUpdate({
      conditional_rules: updatedRules
    });
  };

  const updateRule = (ruleId: string, updates: Partial<ConditionalRule>) => {
    const updatedRules = rules.map((rule) =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );

    // Check for potential circular dependencies
    const updatedRule = updatedRules.find((r) => r.id === ruleId);
    if (
      updatedRule &&
      detectCircularDependency(
        field.id,
        updatedRule.source_field_id,
        updatedRule.target_field_ids,
        updatedRules
      )
    ) {
      console.warn(
        'Potential circular dependency detected in conditional rule'
      );
    }

    onUpdate({
      conditional_rules: updatedRules
    });
  };

  const removeRule = (ruleId: string) => {
    const updatedRules = rules.filter((rule) => rule.id !== ruleId);
    onUpdate({
      conditional_rules: updatedRules
    });
  };

  // Helper to add/remove a field from the target fields array
  const toggleTargetField = (ruleId: string, fieldId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;

    const isSelected = rule.target_field_ids.includes(fieldId);
    let updatedTargets: string[] = [];

    if (isSelected) {
      // Remove field from targets
      updatedTargets = rule.target_field_ids.filter((id) => id !== fieldId);
    } else {
      // Add field to targets
      updatedTargets = [...rule.target_field_ids, fieldId];
    }

    updateRule(ruleId, { target_field_ids: updatedTargets });
  };

  // Get field label by id
  const getFieldLabel = (fieldId: string): string => {
    const field = allFields.find((f) => f.id === fieldId);
    return field?.label || 'Unknown Field';
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-medium'>Conditional Logic Rules</h3>
        <Button type='button' variant='outline' size='sm' onClick={addRule}>
          <Plus className='h-4 w-4 mr-1' /> Add Rule
        </Button>
      </div>

      <div className='bg-blue-50 text-blue-700 p-3 rounded-md text-sm'>
        <p className='font-medium mb-1'>
          Setting up conditional logic for field: {field.label}
        </p>
        <p>
          Create rules to show or hide this field based on values in any field,
          including itself. For example:
        </p>
        <ul className='mt-2 list-disc pl-5 space-y-1'>
          <li>
            Show this field only when a specific option is selected in another
            field
          </li>
          <li>Hide this field when certain conditions are met</li>
          <li>
            Create progressive disclosure by referencing the current
            field&apos;s value
          </li>
          <li>
            <strong>Note:</strong> Be careful when referencing the current field
            to avoid circular logic
          </li>
        </ul>
      </div>

      {availableSourceFields.length === 0 && (
        <div className='bg-amber-50 text-amber-700 p-3 rounded-md text-sm'>
          <p>
            You need to create other form fields first before you can add
            conditional logic to this field.
          </p>
        </div>
      )}

      {availableSourceFields.length > 0 && rules.length === 0 && (
        <p className='text-sm text-muted-foreground italic'>
          No conditional rules configured. Add a rule to show or hide this field
          based on other field values.
        </p>
      )}

      {rules.map((rule) => (
        <Card key={rule.id} className='border border-muted'>
          <CardHeader className='py-3 px-4 flex flex-row items-center justify-between space-y-0'>
            <CardTitle className='text-sm font-medium'>Rule</CardTitle>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => removeRule(rule.id)}
              className='h-7 w-7 p-0 text-destructive'
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </CardHeader>
          <CardContent className='px-4 py-3 space-y-4'>
            <div className='space-y-2'>
              <Label className='text-xs'>IF Field</Label>
              <Select
                value={rule.source_field_id}
                onValueChange={(value) => {
                  // Find the selected field to determine its type
                  const selectedField = availableSourceFields.find(
                    (f) => f.id === value
                  );
                  const newFieldType = selectedField?.type;

                  // If changing from one type of field to another, we might need to reset values and conditions
                  const needsReset =
                    rule.source_field_id &&
                    selectedField &&
                    allFields.find((f) => f.id === rule.source_field_id)
                      ?.type !== newFieldType;

                  // Get appropriate default state for this field type
                  let updatedState = rule.state;
                  if (needsReset) {
                    // Reset to a sensible default based on field type
                    if (
                      newFieldType === 'select' ||
                      newFieldType === 'radio' ||
                      newFieldType === 'checkbox'
                    ) {
                      updatedState = 'is_equal' as ConditionalRuleState;
                    } else if (newFieldType === 'date') {
                      updatedState = 'equal_to_date' as ConditionalRuleState;
                    } else if (newFieldType === 'number') {
                      updatedState = 'greater_than' as ConditionalRuleState;
                    } else {
                      updatedState = 'is_filled' as ConditionalRuleState;
                    }
                  }

                  // Update the rule with new source field and possibly reset state/value
                  updateRule(rule.id, {
                    source_field_id: value,
                    ...(needsReset
                      ? {
                          state: updatedState,
                          value: undefined
                        }
                      : {})
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select source field' />
                </SelectTrigger>
                <SelectContent>
                  {availableSourceFields.map((sourceField) => (
                    <SelectItem key={sourceField.id} value={sourceField.id}>
                      {sourceField.label} ({sourceField.type})
                      {sourceField.id === field.id && (
                        <span className='text-amber-600 text-xs ml-1'>
                          (Current Field)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Show warning for self-reference */}
              {rule.source_field_id === field.id && (
                <div className='bg-amber-50 text-amber-700 p-2 rounded-md text-xs'>
                  <strong>Warning:</strong> You are referencing the current
                  field itself. Make sure this doesn&apos;t create circular
                  logic that could cause issues.
                </div>
              )}
            </div>

            <div className='space-y-2'>
              <Label className='text-xs'>State</Label>
              <Select
                value={rule.state}
                onValueChange={(value) =>
                  updateRule(rule.id, {
                    state: value as ConditionalRuleState,
                    // Clear value if new state doesn't need it
                    value: stateRequiresValue(value as ConditionalRuleState)
                      ? rule.value
                      : undefined
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select condition' />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const sourceField = allFields.find(
                      (f) => f.id === rule.source_field_id
                    );
                    return getStateOptionsForFieldType(sourceField?.type).map(
                      (option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      )
                    );
                  })()}
                </SelectContent>
              </Select>
            </div>

            {stateRequiresValue(rule.state) && (
              <div className='space-y-2'>
                <Label className='text-xs'>Value</Label>
                {(() => {
                  // Find the source field to get its type and options
                  const sourceField = allFields.find(
                    (f) => f.id === rule.source_field_id
                  );

                  // For day of week comparison
                  if (
                    rule.state === 'equal_to_day' ||
                    rule.state === 'not_equal_to_day'
                  ) {
                    const daysOfWeek = [
                      { value: '0', label: 'Sunday' },
                      { value: '1', label: 'Monday' },
                      { value: '2', label: 'Tuesday' },
                      { value: '3', label: 'Wednesday' },
                      { value: '4', label: 'Thursday' },
                      { value: '5', label: 'Friday' },
                      { value: '6', label: 'Saturday' }
                    ];

                    return (
                      <Select
                        value={rule.value || '0'}
                        onValueChange={(value) =>
                          updateRule(rule.id, { value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select day of week' />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }

                  // For date comparisons
                  if (
                    (rule.state.includes('date') ||
                      rule.state === 'before' ||
                      rule.state === 'after') &&
                    sourceField?.type === 'date'
                  ) {
                    return (
                      <Input
                        type='date'
                        value={rule.value || ''}
                        onChange={(e) =>
                          updateRule(rule.id, { value: e.target.value })
                        }
                      />
                    );
                  }

                  // If this is a select/dropdown/radio/checkbox field and it has options, show a dropdown
                  if (
                    sourceField &&
                    (sourceField.type === 'select' ||
                      sourceField.type === 'radio' ||
                      sourceField.type === 'checkbox') &&
                    sourceField.options &&
                    sourceField.options.length > 0
                  ) {
                    return (
                      <Select
                        value={rule.value || ''}
                        onValueChange={(value) =>
                          updateRule(rule.id, { value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Select a value' />
                        </SelectTrigger>
                        <SelectContent>
                          {sourceField.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }

                  // For number comparisons
                  if (
                    (rule.state === 'greater_than' ||
                      rule.state === 'less_than') &&
                    sourceField?.type === 'number'
                  ) {
                    return (
                      <Input
                        type='number'
                        value={rule.value || ''}
                        onChange={(e) =>
                          updateRule(rule.id, { value: e.target.value })
                        }
                        placeholder='Enter number'
                      />
                    );
                  }

                  // For all other field types, show the standard text input
                  return (
                    <Input
                      value={rule.value || ''}
                      onChange={(e) =>
                        updateRule(rule.id, { value: e.target.value })
                      }
                      placeholder='Enter value'
                    />
                  );
                })()}
              </div>
            )}

            <div className='space-y-2'>
              <Label className='text-xs'>THEN</Label>
              <Select
                value={rule.action}
                onValueChange={(value) =>
                  updateRule(rule.id, {
                    action: value as ConditionalRuleAction,
                    // Clear target fields if switching between single and multiple actions
                    target_field_ids:
                      value.includes('multiple') ===
                      rule.action.includes('multiple')
                        ? rule.target_field_ids
                        : []
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select action' />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target field(s) selection */}
            <div className='space-y-2'>
              <Label className='text-xs'>Field(s)</Label>

              {rule.action === 'show' || rule.action === 'hide' ? (
                <Select
                  value={rule.target_field_ids[0] || ''}
                  onValueChange={(value) => {
                    updateRule(rule.id, { target_field_ids: [value] });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select target field' />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Include ALL fields for better conditional logic support */}
                    {allFields.length > 0 ? (
                      allFields.map((targetField) => (
                        <SelectItem key={targetField.id} value={targetField.id}>
                          {targetField.label} ({targetField.type})
                        </SelectItem>
                      ))
                    ) : (
                      <div className='p-2 text-sm text-muted-foreground'>
                        No fields available to select. Create more fields first.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <div className='space-y-2'>
                  <div className='flex flex-wrap gap-2 mt-1'>
                    {rule.target_field_ids.length > 0 ? (
                      rule.target_field_ids.map((fieldId) => (
                        <Badge
                          key={fieldId}
                          variant='secondary'
                          className='cursor-pointer'
                          onClick={() => toggleTargetField(rule.id, fieldId)}
                        >
                          {getFieldLabel(fieldId)}{' '}
                          <X className='ml-1 h-3 w-3' />
                        </Badge>
                      ))
                    ) : (
                      <p className='text-xs text-muted-foreground italic'>
                        No fields selected
                      </p>
                    )}
                  </div>

                  <Select
                    value=''
                    onValueChange={(value) => {
                      toggleTargetField(rule.id, value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Add target fields' />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show all fields except already selected ones */}
                      {allFields
                        .filter(
                          (targetField) =>
                            !rule.target_field_ids.includes(targetField.id)
                        )
                        .map((targetField) => (
                          <SelectItem
                            key={targetField.id}
                            value={targetField.id}
                          >
                            {targetField.label} ({targetField.type})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
