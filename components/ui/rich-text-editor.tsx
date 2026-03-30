'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Undo,
  Redo,
  Heading2,
  Heading3,
  RemoveFormatting
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Enter text...',
  disabled = false,
  className,
  minHeight = '120px'
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState({
    bold: false,
    italic: false,
    underline: false,
    insertUnorderedList: false,
    insertOrderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false
  });

  // Debug flag - set to true to enable debugging
  const DEBUG_LISTS = false;

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      // Handle empty content case
      if (!value || value.trim() === '') {
        editorRef.current.innerHTML = '';
      } else {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  // Update active states based on current selection
  const updateActiveStates = useCallback(() => {
    if (!editorRef.current) return;

    try {
      // Get current selection and element
      const selection = window.getSelection();
      let currentElement = selection?.anchorNode;

      // If text node, get parent element
      if (currentElement && currentElement.nodeType === Node.TEXT_NODE) {
        currentElement = currentElement.parentElement;
      }

      // Check if we're inside a list
      let isInUnorderedList = false;
      let isInOrderedList = false;
      let element = currentElement as Element;

      while (element && element !== editorRef.current) {
        if (element.tagName === 'UL') {
          isInUnorderedList = true;
          break;
        }
        if (element.tagName === 'OL') {
          isInOrderedList = true;
          break;
        }
        element = element.parentElement as Element;
      }

      setIsActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        insertUnorderedList: isInUnorderedList,
        insertOrderedList: isInOrderedList,
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight')
      });
    } catch (error) {
      // Handle any command state errors gracefully
      console.warn('Error updating active states:', error);
    }
  }, []);

  // Execute formatting command
  const execCommand = useCallback(
    (command: string, value?: string) => {
      if (disabled) return;

      // Handle list commands specially as they can be problematic
      if (
        command === 'insertUnorderedList' ||
        command === 'insertOrderedList'
      ) {
        try {
          if (DEBUG_LISTS) console.log('Executing list command:', command);

          // Make sure editor has focus
          editorRef.current?.focus();

          // Execute the command
          const success = document.execCommand(command, false, value);

          if (DEBUG_LISTS) console.log('List command success:', success);

          // If the command failed, try alternative approach
          if (!success) {
            if (DEBUG_LISTS) console.log('Trying alternative list approach');
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const listType = command === 'insertUnorderedList' ? 'ul' : 'ol';
              const listItem = document.createElement('li');
              const list = document.createElement(listType);

              // Insert content or placeholder
              if (selection.toString()) {
                listItem.textContent = selection.toString();
                range.deleteContents();
              } else {
                listItem.innerHTML = '&nbsp;';
              }

              list.appendChild(listItem);
              range.insertNode(list);

              // Position cursor at end of list item
              const newRange = document.createRange();
              newRange.selectNodeContents(listItem);
              newRange.collapse(false);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }
        } catch (error) {
          console.warn('List command failed:', error);
        }
      } else {
        document.execCommand(command, false, value);
      }

      editorRef.current?.focus();

      // Small delay to ensure DOM updates
      setTimeout(() => {
        updateActiveStates();
        // Emit change event
        if (onChange && editorRef.current) {
          onChange(editorRef.current.innerHTML);
        }
      }, 10);
    },
    [disabled, onChange, updateActiveStates]
  );

  // Handle content changes
  const handleInput = useCallback(() => {
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveStates();
  }, [onChange, updateActiveStates]);

  // Handle key events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle common shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            execCommand('bold');
            break;
          case 'i':
            e.preventDefault();
            execCommand('italic');
            break;
          case 'u':
            e.preventDefault();
            execCommand('underline');
            break;
          case 'z':
            if (e.shiftKey) {
              e.preventDefault();
              execCommand('redo');
            } else {
              e.preventDefault();
              execCommand('undo');
            }
            break;
          // Add list shortcuts
          case 'l':
            e.preventDefault();
            execCommand('insertUnorderedList');
            break;
        }
      }

      // Handle Enter key in lists to create new list items
      if (e.key === 'Enter') {
        const selection = window.getSelection();
        if (selection && selection.anchorNode) {
          let element = selection.anchorNode as Element;
          if (element.nodeType === Node.TEXT_NODE) {
            element = element.parentElement as Element;
          }

          // Check if we're in a list item
          while (element && element !== editorRef.current) {
            if (element.tagName === 'LI') {
              // If list item is empty, exit the list
              if (element.textContent?.trim() === '') {
                e.preventDefault();
                document.execCommand('outdent');
                return;
              }
              break;
            }
            element = element.parentElement as Element;
          }
        }
      }
    },
    [execCommand]
  );

  // Handle focus and selection events
  const handleFocus = useCallback(() => {
    updateActiveStates();
  }, [updateActiveStates]);

  const handleSelectionChange = useCallback(() => {
    if (document.activeElement === editorRef.current) {
      updateActiveStates();
    }
  }, [updateActiveStates]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  // Insert link
  const insertLink = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';

    const url = prompt('Enter URL:', 'https://');
    if (url && url.trim() !== '' && url !== 'https://') {
      if (selectedText) {
        // If text is selected, create a link with that text
        execCommand('createLink', url);
      } else {
        // If no text selected, insert the URL as both text and link
        const linkText = prompt('Enter link text:', url);
        if (linkText) {
          document.execCommand(
            'insertHTML',
            false,
            `<a href="${url}">${linkText}</a>`
          );
          if (onChange && editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
        }
      }
    }
  }, [execCommand, onChange]);

  // Insert heading
  const insertHeading = useCallback(
    (level: string) => {
      execCommand('formatBlock', `<h${level}>`);
    },
    [execCommand]
  );

  // Remove formatting
  const removeFormatting = useCallback(() => {
    execCommand('removeFormat');
  }, [execCommand]);

  const ToolbarButton = ({
    command,
    icon: Icon,
    title,
    value
  }: {
    command: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value?: string;
  }) => (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      className={cn(
        'h-8 w-8 p-0',
        isActive[command as keyof typeof isActive] && 'bg-accent'
      )}
      onClick={() => execCommand(command, value)}
      disabled={disabled}
      title={title}
    >
      <Icon className='h-4 w-4' />
    </Button>
  );

  return (
    <div
      className={cn(
        'border rounded-md overflow-hidden rich-text-editor',
        className
      )}
    >
      {/* Toolbar */}
      <div className='flex items-center gap-1 p-2 border-b bg-muted/50'>
        <div className='flex items-center gap-1'>
          <ToolbarButton command='bold' icon={Bold} title='Bold (Ctrl+B)' />
          <ToolbarButton
            command='italic'
            icon={Italic}
            title='Italic (Ctrl+I)'
          />
          <ToolbarButton
            command='underline'
            icon={Underline}
            title='Underline (Ctrl+U)'
          />
        </div>

        <div className='w-px h-6 bg-border mx-1' />

        <div className='flex items-center gap-1'>
          <ToolbarButton
            command='insertUnorderedList'
            icon={List}
            title='Bullet List'
          />
          <ToolbarButton
            command='insertOrderedList'
            icon={ListOrdered}
            title='Numbered List'
          />
        </div>

        <div className='w-px h-6 bg-border mx-1' />

        <div className='flex items-center gap-1'>
          <ToolbarButton
            command='justifyLeft'
            icon={AlignLeft}
            title='Align Left'
          />
          <ToolbarButton
            command='justifyCenter'
            icon={AlignCenter}
            title='Align Center'
          />
          <ToolbarButton
            command='justifyRight'
            icon={AlignRight}
            title='Align Right'
          />
        </div>

        <div className='w-px h-6 bg-border mx-1' />

        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0'
            onClick={() => insertHeading('2')}
            disabled={disabled}
            title='Heading 2'
          >
            <Heading2 className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0'
            onClick={() => insertHeading('3')}
            disabled={disabled}
            title='Heading 3'
          >
            <Heading3 className='h-4 w-4' />
          </Button>
        </div>

        <div className='w-px h-6 bg-border mx-1' />

        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0'
            onClick={insertLink}
            disabled={disabled}
            title='Insert Link'
          >
            <Link className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0'
            onClick={removeFormatting}
            disabled={disabled}
            title='Clear Formatting'
          >
            <RemoveFormatting className='h-4 w-4' />
          </Button>
        </div>

        <div className='w-px h-6 bg-border mx-1' />

        <div className='flex items-center gap-1'>
          <ToolbarButton command='undo' icon={Undo} title='Undo (Ctrl+Z)' />
          <ToolbarButton
            command='redo'
            icon={Redo}
            title='Redo (Ctrl+Shift+Z)'
          />
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        className={cn(
          'p-3 focus:outline-none prose prose-sm max-w-none',
          'prose-headings:mt-0 prose-headings:mb-2',
          'prose-p:mt-0 prose-p:mb-2',
          'prose-ul:mt-0 prose-ul:mb-2',
          'prose-ol:mt-0 prose-ol:mb-2',
          'prose-li:mt-0 prose-li:mb-1',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          'focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm',
          '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ml-6 [&_ol]:ml-6',
          '[&_li]:mb-1 [&_li]:pl-1',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
        style={{ minHeight }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />

      <style jsx global>{`
        .rich-text-editor [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          display: block;
        }
        
        .rich-text-editor [contenteditable]:focus:empty:before {
          opacity: 0.6;
        }
        
        .rich-text-editor h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        
        .rich-text-editor h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .rich-text-editor ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .rich-text-editor ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .rich-text-editor li {
          margin-bottom: 0.25rem;
          padding-left: 0.25rem;
        }

        .rich-text-editor ul ul,
        .rich-text-editor ol ol,
        .rich-text-editor ul ol,
        .rich-text-editor ol ul {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}
