import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { markdown as markdownLanguage } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { json as jsonLanguage } from '@codemirror/lang-json';

interface CodeEditorBlockProps {
  value: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
  onChange?: (value: string) => void;
  className?: string;
}

const defaultHeight = '320px';

const normalizeLanguage = (language?: string) => language?.trim().toLowerCase() ?? '';

export function CodeEditorBlock({
  value,
  language,
  readOnly = false,
  height = defaultHeight,
  onChange,
  className
}: CodeEditorBlockProps) {
  const normalizedLanguage = normalizeLanguage(language);

  const extensions = useMemo(() => {
    switch (true) {
      case normalizedLanguage.startsWith('ts'):
      case normalizedLanguage.includes('typescript'):
        return [javascript({ jsx: true, typescript: true })];
      case normalizedLanguage.startsWith('js'):
      case normalizedLanguage.includes('javascript'):
      case normalizedLanguage === 'node':
        return [javascript({ jsx: true })];
      case normalizedLanguage === 'python':
      case normalizedLanguage === 'py':
        return [python()];
      case normalizedLanguage === 'json':
      case normalizedLanguage.startsWith('chart'):
        return [jsonLanguage()];
      case normalizedLanguage === 'markdown':
      case normalizedLanguage === 'md':
        return [markdownLanguage()];
      default:
        return [markdownLanguage()];
    }
  }, [normalizedLanguage]);

  const isDark = useMemo(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'),
    []
  );

  return (
    <div className={className}>
      <CodeMirror
        value={value}
        height={height}
        extensions={extensions}
        editable={!readOnly}
        theme={isDark ? oneDark : 'light'}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          autocompletion: false
        }}
        onChange={(nextValue) => {
          if (onChange) {
            onChange(nextValue);
          }
        }}
      />
    </div>
  );
}
