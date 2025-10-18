import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from '../db/connection.js';
import { UserModel } from '../models/User.js';
import { WorkspaceModel } from '../models/Workspace.js';
import { PromptFolderModel } from '../models/PromptFolder.js';
import { PromptModel } from '../models/Prompt.js';
import { PromptVersionModel } from '../models/PromptVersion.js';
import { TemplateModel } from '../models/Template.js';
import { VariableModel } from '../models/Variable.js';
import { hashPassword } from '../utils/password.js';
import { workspaceSlug } from '../utils/slug.js';

const seedUsers = [
  {
    email: 'demo@promptbird.ai',
    password: 'DemoPassword1!',
    displayName: 'Demo User',
  },
  {
    email: 'designer@promptbird.ai',
    password: 'DesignerPassword1!',
    displayName: 'Design Explorer',
  },
];

const defaultFolders = ['Templates', 'Work Projects'];

const systemTemplates = [
  {
    title: 'Definition of Done',
    description: 'Checklist for feature completion',
    category: 'Development',
    icon: 'CheckSquare',
    content: `# Definition of Done\n\n## Feature: [Feature Name]\n\n### Acceptance Criteria\n- [ ] Functional requirement 1\n- [ ] Functional requirement 2\n- [ ] Edge cases handled\n\n### Technical Requirements\n- [ ] Code reviewed and approved\n- [ ] Unit tests written and passing\n- [ ] Integration tests passing\n- [ ] Documentation updated\n- [ ] No security vulnerabilities\n\n### Quality Assurance\n- [ ] Manual testing completed\n- [ ] Cross-browser testing (if applicable)\n- [ ] Performance tested\n- [ ] Accessibility requirements met\n\n### Deployment\n- [ ] Deployed to staging\n- [ ] Stakeholder approval\n- [ ] Production deployment plan ready\n\n**Notes:**\nAdditional considerations or requirements specific to this feature.`,
  },
  {
    title: 'Bug Report Template',
    description: 'Structured bug reporting format',
    category: 'Development',
    icon: 'Bug',
    content:
      '# Bug Report\n\n## Summary\nBrief description of the bug\n\n## Steps to Reproduce\n1. Step one\n2. Step two\n3. Step three\n\n## Expected Behavior\nWhat should happen\n\n## Actual Behavior\nWhat actually happens\n\n## Environment\n- **OS:** [e.g., Windows 10, macOS Big Sur]\n- **Browser:** [e.g., Chrome 95, Firefox 94]\n- **Version:** [e.g., v1.2.3]\n\n## Screenshots/Videos\n[Attach if applicable]\n\n## Additional Context\nAny other relevant information\n\n## Priority\n- [ ] Critical\n- [ ] High\n- [ ] Medium\n- [ ] Low\n\n## Assignee\n[Who should fix this] ',
  },
  {
    title: 'User Story',
    description: 'Agile user story template',
    category: 'Product',
    icon: 'Users',
    content:
      '# User Story\n\n## Story\n**As a** [type of user]\n**I want** [goal/desire]\n**So that** [benefit/value]\n\n## Acceptance Criteria\n- [ ] Criterion 1\n- [ ] Criterion 2\n- [ ] Criterion 3\n\n## Definition of Ready\n- [ ] User story is clearly defined\n- [ ] Acceptance criteria are clear and testable\n- [ ] Dependencies identified\n- [ ] Story is estimated\n- [ ] Designs available (if needed)\n\n## Notes\nAdditional context, constraints, or considerations\n\n## Dependencies\nList any dependencies on other stories or external factors\n\n## Estimation\n**Story Points:** [1, 2, 3, 5, 8, 13, 21]\n**Rationale:** Brief explanation of the estimate',
  },
];

const promptSeeds = [
  {
    title: 'API Integration Guide',
    content: '# API Integration Guide\n\nWrite clear instructions for integrating with external APIs...',
    tags: ['api', 'integration'],
    description: 'Guide for API integration best practices',
    folderName: 'Templates',
  },
  {
    title: 'User Story Template',
    content: '# User Story\n\nAs a [user type], I want [functionality] so that [benefit]...',
    tags: ['template', 'agile'],
    description: 'Template for writing user stories',
    folderName: 'Templates',
  },
  {
    title: 'Bug Report Template',
    content:
      '# Bug Report\n\n## Description\nBrief description of the bug...\n\n## Steps to Reproduce\n1. Step 1\n2. Step 2\n3. Step 3',
    tags: ['bug', 'template'],
    description: 'Template for bug reports',
    folderName: null,
  },
];

const variableSeeds = [
  {
    name: 'ProjectName',
    value: 'My Awesome Project',
    type: 'string' as const,
    description: 'The name of the current project',
  },
  {
    name: 'Description',
    value: 'A comprehensive solution for managing AI prompts and templates',
    type: 'string' as const,
    description: 'Project description for templates',
  },
  {
    name: 'CodeExample',
    value: 'const prompt = "Your AI prompt here";\nconsole.log(prompt);',
    type: 'code' as const,
    description: 'Sample code snippet',
  },
];

const seed = async () => {
  await connectMongo();

  await TemplateModel.deleteMany({ isSystem: true });
  await TemplateModel.insertMany(
    systemTemplates.map((template) => ({
      ...template,
      workspaceId: null,
      isSystem: true,
    }))
  );

  for (const userSeed of seedUsers) {
    const emailLowercase = userSeed.email.toLowerCase();
    const passwordHash = await hashPassword(userSeed.password);

    let userDoc = await UserModel.findOne({ emailLowercase });
    if (!userDoc) {
      userDoc = await UserModel.create({
        email: userSeed.email,
        emailLowercase,
        passwordHash,
        displayName: userSeed.displayName,
        providers: [{ type: 'password' }],
      });
    } else {
      userDoc.passwordHash = passwordHash;
      userDoc.displayName = userSeed.displayName;
      await userDoc.save();
    }

    let workspaceDoc = await WorkspaceModel.findOne({ ownerId: userDoc.id });
    if (!workspaceDoc) {
      workspaceDoc = await WorkspaceModel.create({
        name: `${userSeed.displayName}'s Workspace`,
        slug: workspaceSlug(userSeed.displayName),
        ownerId: userDoc.id,
        members: [
          {
            userId: userDoc.id,
            role: 'owner',
            joinedAt: new Date(),
            status: 'active',
          },
        ],
      });
    }

    if (!userDoc.preferences) {
      userDoc.preferences = {} as typeof userDoc.preferences;
    }
    userDoc.preferences.defaultWorkspaceId = workspaceDoc.id as unknown as mongoose.Types.ObjectId;
    await userDoc.save();

  const existingFolders = await PromptFolderModel.find({ workspaceId: workspaceDoc.id });
    const folderMap = new Map<string, string>();

    for (const folderName of defaultFolders) {
      let folder = existingFolders.find((f: (typeof existingFolders)[number]) => f.name === folderName);
      if (!folder) {
        folder = await PromptFolderModel.create({
          name: folderName,
          workspaceId: workspaceDoc.id,
          parentId: null,
          position: folderMap.size,
          createdBy: userDoc.id,
          updatedBy: userDoc.id,
        });
      }
      folderMap.set(folderName, folder.id);
    }

    await VariableModel.deleteMany({ workspaceId: workspaceDoc.id });
    await VariableModel.insertMany(
      variableSeeds.map((variable) => ({
        workspaceId: workspaceDoc.id,
        createdBy: userDoc.id,
        nameLowercase: variable.name.toLowerCase(),
        ...variable,
      }))
    );

    await PromptModel.deleteMany({ workspaceId: workspaceDoc.id });
    await PromptVersionModel.deleteMany({ workspaceId: workspaceDoc.id });

    for (const promptSeed of promptSeeds) {
      const prompt = await PromptModel.create({
        workspaceId: workspaceDoc.id,
        ownerId: userDoc.id,
        folderId: promptSeed.folderName ? folderMap.get(promptSeed.folderName) ?? null : null,
        title: promptSeed.title,
        content: promptSeed.content,
        description: promptSeed.description,
        tags: promptSeed.tags,
        status: 'draft',
        lastEditedBy: userDoc.id,
      });

      const version = await PromptVersionModel.create({
        promptId: prompt.id,
        workspaceId: workspaceDoc.id,
        content: promptSeed.content,
        comment: 'Seeded content',
        versionNumber: 1,
        createdBy: userDoc.id,
      });

      prompt.currentVersionId = version.id as mongoose.Types.ObjectId;
      await prompt.save();
    }
  }

  await disconnectMongo();
  await mongoose.disconnect();
};

seed()
  .then(() => {
    console.log('Seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  });
