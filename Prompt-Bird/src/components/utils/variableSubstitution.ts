import type { TemplateVariable } from '../VariablesPanel';

/**
 * Substitutes template variables in content
 * Variables should be in the format {{VariableName}}
 */
export function substituteVariables(
  content: string, 
  variables: TemplateVariable[]
): string {
  if (!variables.length) return content;

  let substitutedContent = content;
  
  // Create a map for quick lookup
  const variableMap = new Map(
    variables.map(v => [v.name.toLowerCase(), v])
  );

  // Find all variable placeholders in the content
  const variableRegex = /\{\{([^}]+)\}\}/g;
  
  substitutedContent = substitutedContent.replace(variableRegex, (match, variableName) => {
    const trimmedName = variableName.trim();
    const variable = variableMap.get(trimmedName.toLowerCase());
    
    return variable ? variable.value : match; // Return original if variable not found
  });

  return substitutedContent;
}

/**
 * Finds all variable references in content
 */
export function findVariableReferences(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const references: string[] = [];
  let match;

  while ((match = variableRegex.exec(content)) !== null) {
    const variableName = match[1].trim();
    if (!references.includes(variableName)) {
      references.push(variableName);
    }
  }

  return references;
}

/**
 * Validates if all variable references in content have corresponding variables defined
 */
export function validateVariableReferences(
  content: string,
  variables: TemplateVariable[]
): { isValid: boolean; missingVariables: string[] } {
  const references = findVariableReferences(content);
  const definedVariables = new Set(variables.map(v => v.name.toLowerCase()));
  
  const missingVariables = references.filter(
    ref => !definedVariables.has(ref.toLowerCase())
  );

  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
}

/**
 * Highlights variable syntax in content for display purposes
 */
export function highlightVariables(content: string): string {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  
  return content.replace(variableRegex, (match) => {
    return `<span class="variable-highlight">${match}</span>`;
  });
}