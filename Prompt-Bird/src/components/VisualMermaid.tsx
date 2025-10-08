import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Copy, Edit3, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Extend Window interface for Mermaid
declare global {
  interface Window {
    mermaid: any;
  }
}

interface VisualMermaidProps {
  code: string;
  onChange: (newCode: string) => void;
  readOnly?: boolean;
}

export function VisualMermaid({ code, onChange, readOnly = false }: VisualMermaidProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const [mermaid, setMermaid] = useState<any>(null);

  // Load Mermaid library dynamically
  useEffect(() => {
    const loadMermaid = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Check if Mermaid is already loaded
          if (window.mermaid) {
            // Re-initialize with safe configuration
            window.mermaid.initialize({ 
              startOnLoad: false,
              theme: 'default',
              fontFamily: 'inherit',
              securityLevel: 'loose',
              htmlLabels: false, // Disable HTML labels for better compatibility
              flowchart: {
                useMaxWidth: true,
                htmlLabels: false,
                curve: 'basis' // Use safer curve type
              },
              sequence: {
                useMaxWidth: true
              },
              gantt: {
                useMaxWidth: true
              }
            });
            setMermaid(window.mermaid);
            return;
          }

          // Load Mermaid script
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
          script.onload = () => {
            if (window.mermaid) {
              try {
                window.mermaid.initialize({ 
                  startOnLoad: false,
                  theme: 'default',
                  fontFamily: 'inherit',
                  securityLevel: 'loose',
                  htmlLabels: false, // Disable HTML labels for better compatibility
                  flowchart: {
                    useMaxWidth: true,
                    htmlLabels: false,
                    curve: 'basis' // Use safer curve type
                  },
                  sequence: {
                    useMaxWidth: true
                  },
                  gantt: {
                    useMaxWidth: true
                  }
                });
                setMermaid(window.mermaid);
              } catch (initError) {
                console.error('Mermaid initialization error:', initError);
                setError('Failed to initialize diagram renderer');
              }
            } else {
              setError('Mermaid library not found after loading');
            }
          };
          script.onerror = () => {
            setError('Failed to load diagram renderer');
          };
          
          // Check if script already exists
          const existingScript = document.querySelector('script[src*="mermaid"]');
          if (!existingScript) {
            document.head.appendChild(script);
          }
        }
      } catch (err) {
        console.error('Failed to load Mermaid:', err);
        setError('Failed to load diagram renderer');
      }
    };

    loadMermaid();
  }, []);

  // Render diagram when code changes
  useEffect(() => {
    if (!mermaid || !diagramRef.current || !code.trim()) return;

    const renderDiagram = async () => {
      try {
        setError(null);
        
        // Clear previous content
        if (diagramRef.current) {
          diagramRef.current.innerHTML = '';
        }

        // Clean the code and validate
        const cleanCode = code.trim();
        if (!cleanCode) return;

        // Validate basic mermaid syntax
        if (!cleanCode.includes('graph') && !cleanCode.includes('flowchart') && 
            !cleanCode.includes('sequenceDiagram') && !cleanCode.includes('classDiagram') &&
            !cleanCode.includes('gitgraph') && !cleanCode.includes('erDiagram') &&
            !cleanCode.includes('journey') && !cleanCode.includes('pie')) {
          throw new Error('Unknown diagram type');
        }

        // Create a unique ID to avoid conflicts
        const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Enhanced error handling for render
        if (mermaid.render) {
          try {
            const result = await mermaid.render(diagramId, cleanCode);
            if (result && result.svg && diagramRef.current) {
              diagramRef.current.innerHTML = result.svg;
            } else {
              throw new Error('Render returned no SVG');
            }
          } catch (renderError) {
            // Try with simplified configuration
            await mermaid.initialize({ 
              startOnLoad: false,
              theme: 'default',
              fontFamily: 'inherit',
              securityLevel: 'loose',
              htmlLabels: false, // Disable HTML labels for better compatibility
              flowchart: {
                useMaxWidth: true,
                htmlLabels: false
              }
            });
            const result = await mermaid.render(diagramId + '-retry', cleanCode);
            if (result && result.svg && diagramRef.current) {
              diagramRef.current.innerHTML = result.svg;
            } else {
              throw renderError;
            }
          }
        } else if (mermaid.mermaidAPI && mermaid.mermaidAPI.render) {
          // Fallback to older API with error handling
          await new Promise((resolve, reject) => {
            try {
              mermaid.mermaidAPI.render(diagramId, cleanCode, (svg: string, _bindFunctions?: any) => {
                if (svg && diagramRef.current) {
                  diagramRef.current.innerHTML = svg;
                  resolve(svg);
                } else {
                  reject(new Error('No SVG returned from mermaidAPI'));
                }
              });
            } catch (apiError) {
              reject(apiError);
            }
          });
        } else {
          throw new Error('No Mermaid render method available');
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Diagram error: ${errorMessage}`);
        if (diagramRef.current) {
          diagramRef.current.innerHTML = `
            <div class="p-4 text-center text-sm text-muted-foreground border border-dashed border-muted-foreground/30 rounded">
              <p>Unable to render diagram</p>
              <p class="text-xs mt-1 text-destructive">${errorMessage}</p>
              <p class="text-xs mt-1">Please check your syntax</p>
            </div>
          `;
        }
      }
    };

    const timeoutId = setTimeout(renderDiagram, 100); // Small delay to ensure DOM is ready
    return () => clearTimeout(timeoutId);
  }, [code, mermaid]);

  const copyAsMarkdown = () => {
    const markdown = `\`\`\`mermaid\n${code}\n\`\`\``;
    navigator.clipboard.writeText(markdown);
    toast.success('Diagram copied as markdown!');
  };

  const handleCodeChange = (newCode: string) => {
    onChange(newCode);
  };

  return (
    <div className="my-4 border border-border rounded-md overflow-hidden">
      {/* Diagram Controls */}
      {!readOnly && (
        <div className="flex items-center gap-2 p-2 bg-muted/30 border-b border-border">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(!isEditing)}
            className="h-6 px-2 text-xs"
          >
            <Edit3 className="h-3 w-3 mr-1" />
            {isEditing ? 'Preview' : 'Edit'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={copyAsMarkdown}
            className="h-6 px-2 text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
          {error && (
            <span className="text-xs text-destructive">
              {error}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <div className="p-4">
          <Textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="Enter Mermaid diagram code..."
            className="min-h-[200px] font-mono text-sm"
          />
          <div className="mt-2 text-xs text-muted-foreground">
            <p>Example: flowchart TD</p>
            <p className="ml-4">A[Start] --&gt; B[End]</p>
          </div>
        </div>
      ) : (
        <div className="p-4">
          {!mermaid ? (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading diagram renderer...
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-sm text-muted-foreground mb-2">Failed to render diagram</div>
              <div className="bg-muted/30 p-4 rounded border border-dashed border-muted-foreground/30 font-mono text-xs text-left">
                {code}
              </div>
            </div>
          ) : (
            <div 
              ref={diagramRef}
              className="flex justify-center items-center min-h-[200px] overflow-auto"
              style={{ 
                maxWidth: '100%',
                background: 'transparent'
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}