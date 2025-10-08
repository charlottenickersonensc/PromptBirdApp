import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Search, FileText, Bug, CheckSquare, Code, Lightbulb, Users, Target } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  content: string;
}

const templates: Template[] = [
  {
    id: 'dod',
    title: 'Definition of Done',
    description: 'Checklist for feature completion',
    category: 'Development',
    icon: <CheckSquare className="h-4 w-4" />,
    content: `# Definition of Done

## Feature: [Feature Name]

### Acceptance Criteria
- [ ] Functional requirement 1
- [ ] Functional requirement 2
- [ ] Edge cases handled

### Technical Requirements
- [ ] Code reviewed and approved
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] No security vulnerabilities

### Quality Assurance
- [ ] Manual testing completed
- [ ] Cross-browser testing (if applicable)
- [ ] Performance tested
- [ ] Accessibility requirements met

### Deployment
- [ ] Deployed to staging
- [ ] Stakeholder approval
- [ ] Production deployment plan ready

**Notes:**
Additional considerations or requirements specific to this feature.`
  },
  {
    id: 'bug-report',
    title: 'Bug Report Template',
    description: 'Structured bug reporting format',
    category: 'Development',
    icon: <Bug className="h-4 w-4" />,
    content: `# Bug Report

## Summary
Brief description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- **OS:** [e.g., Windows 10, macOS Big Sur]
- **Browser:** [e.g., Chrome 95, Firefox 94]
- **Version:** [e.g., v1.2.3]

## Screenshots/Videos
[Attach if applicable]

## Additional Context
Any other relevant information

## Priority
- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low

## Assignee
[Who should fix this]`
  },
  {
    id: 'user-story',
    title: 'User Story',
    description: 'Agile user story template',
    category: 'Product',
    icon: <Users className="h-4 w-4" />,
    content: `# User Story

## Story
**As a** [type of user]
**I want** [goal/desire]
**So that** [benefit/value]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Definition of Ready
- [ ] User story is clearly defined
- [ ] Acceptance criteria are clear and testable
- [ ] Dependencies identified
- [ ] Story is estimated
- [ ] Designs available (if needed)

## Notes
Additional context, constraints, or considerations

## Dependencies
List any dependencies on other stories or external factors

## Estimation
**Story Points:** [1, 2, 3, 5, 8, 13, 21]
**Rationale:** Brief explanation of the estimate`
  },
  {
    id: 'code-review',
    title: 'Code Review Checklist',
    description: 'Comprehensive code review guide',
    category: 'Development',
    icon: <Code className="h-4 w-4" />,
    content: `# Code Review Checklist

## Pull Request: [PR Title]
**Author:** [Name]
**Reviewer:** [Name]
**Date:** [Date]

## General
- [ ] Code follows project conventions
- [ ] Changes are well-documented
- [ ] Commit messages are clear
- [ ] No debugging code left behind

## Functionality
- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] Performance is acceptable

## Code Quality
- [ ] Code is readable and maintainable
- [ ] Functions are single-purpose
- [ ] Variable names are descriptive
- [ ] No code duplication

## Testing
- [ ] Unit tests included
- [ ] Tests cover edge cases
- [ ] All tests pass
- [ ] Test coverage is adequate

## Security
- [ ] No sensitive data exposed
- [ ] Input validation present
- [ ] SQL injection prevention
- [ ] XSS prevention

## Comments
[Specific feedback and suggestions]

## Verdict
- [ ] Approve
- [ ] Approve with minor changes
- [ ] Request changes`
  },
  {
    id: 'feature-spec',
    title: 'Feature Specification',
    description: 'Detailed feature specification template',
    category: 'Product',
    icon: <FileText className="h-4 w-4" />,
    content: `# Feature Specification

## Feature: [Feature Name]

### Overview
Brief description of the feature and its purpose

### Goals
- Primary goal
- Secondary goals
- Success metrics

### User Personas
**Primary:** [Primary user type]
**Secondary:** [Secondary user type]

### User Journey
1. User action 1
2. System response 1
3. User action 2
4. System response 2

### Functional Requirements
#### Must Have
- Requirement 1
- Requirement 2

#### Should Have
- Requirement 3
- Requirement 4

#### Could Have
- Requirement 5
- Requirement 6

### Technical Considerations
- API requirements
- Database changes
- Third-party integrations
- Performance requirements

### Design Requirements
- UI/UX considerations
- Accessibility requirements
- Mobile responsiveness

### Implementation Plan
1. **Phase 1:** [Description]
2. **Phase 2:** [Description]
3. **Phase 3:** [Description]

### Risks and Mitigations
- **Risk 1:** Description and mitigation
- **Risk 2:** Description and mitigation

### Timeline
- **Start Date:** [Date]
- **End Date:** [Date]
- **Key Milestones:** [List]`
  },
  {
    id: 'ai-prompt',
    title: 'AI Prompt Template',
    description: 'Structured AI prompt engineering template',
    category: 'AI/ML',
    icon: <Lightbulb className="h-4 w-4" />,
    content: `# AI Prompt Template

## Context
Brief description of what you're trying to achieve

## Role
You are a [specific role, e.g., senior software engineer, product manager, etc.]

## Task
[Clear, specific description of the task]

## Input Format
- **Input Type:** [text, code, data, etc.]
- **Structure:** [describe expected structure]
- **Examples:** 
  \`\`\`
  [Example input]
  \`\`\`

## Output Format
- **Format:** [JSON, markdown, code, etc.]
- **Structure:** [describe expected output structure]
- **Style:** [formal, casual, technical, etc.]

## Constraints
- [Constraint 1]
- [Constraint 2]
- [Constraint 3]

## Examples
### Example 1
**Input:**
\`\`\`
[Example input]
\`\`\`

**Expected Output:**
\`\`\`
[Example output]
\`\`\`

### Example 2
**Input:**
\`\`\`
[Example input]
\`\`\`

**Expected Output:**
\`\`\`
[Example output]
\`\`\`

## Quality Criteria
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

## Notes
Additional context or requirements`
  },
  {
    id: 'sprint-planning',
    title: 'Sprint Planning',
    description: 'Sprint planning meeting template',
    category: 'Agile',
    icon: <Target className="h-4 w-4" />,
    content: `# Sprint Planning

## Sprint Information
- **Sprint Number:** [Number]
- **Duration:** [2 weeks]
- **Start Date:** [Date]
- **End Date:** [Date]
- **Team:** [Team Name]

## Sprint Goal
[Clear, concise statement of what the team aims to achieve]

## Team Capacity
- **Total Available Hours:** [Hours]
- **Team Members:**
  - [Name]: [Available hours]
  - [Name]: [Available hours]
  - [Name]: [Available hours]

## Backlog Items
### Committed
- [ ] [Story 1] - [Points] - [Assignee]
- [ ] [Story 2] - [Points] - [Assignee]
- [ ] [Story 3] - [Points] - [Assignee]

### Stretch Goals
- [ ] [Story 4] - [Points] - [Assignee]
- [ ] [Story 5] - [Points] - [Assignee]

## Definition of Done
- [ ] Code complete and reviewed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Deployed to staging
- [ ] QA approval

## Risks and Dependencies
- **Risk 1:** [Description and mitigation]
- **Dependency 1:** [Description and owner]

## Notes
[Additional planning notes and decisions]`
  }
];

interface TemplateLibraryProps {
  onTemplateSelect: (content: string) => void;
}

export function TemplateLibrary({ onTemplateSelect }: TemplateLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [openCategories, setOpenCategories] = useState<string[]>(['Development', 'Product']);

  const filteredTemplates = templates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [...new Set(templates.map(t => t.category))];

  const toggleCategory = (category: string) => {
    setOpenCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Templates</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3">
          {categories.map(category => {
            const categoryTemplates = filteredTemplates.filter(t => t.category === category);
            if (categoryTemplates.length === 0) return null;

            return (
              <Collapsible
                key={category}
                open={openCategories.includes(category)}
                onOpenChange={() => toggleCategory(category)}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                    <span className="text-sm font-medium">{category}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {categoryTemplates.length}
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {categoryTemplates.map(template => (
                    <Card
                      key={template.id}
                      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => onTemplateSelect(template.content)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="text-muted-foreground mt-0.5">
                          {template.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">
                            {template.title}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}