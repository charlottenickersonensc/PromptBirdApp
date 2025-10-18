import { PromptFolderModel } from '../models/PromptFolder.js';
import { PromptModel } from '../models/Prompt.js';
import { PromptVersionModel } from '../models/PromptVersion.js';
import { TemplateModel } from '../models/Template.js';
import { VariableModel } from '../models/Variable.js';
import { WorkspaceModel } from '../models/Workspace.js';

export const getWorkspaceSnapshot = async (workspaceId: string) => {
  const [workspace, prompts, folders, variables, templates] = await Promise.all([
    WorkspaceModel.findById(workspaceId).lean(),
    PromptModel.find({ workspaceId }).lean(),
    PromptFolderModel.find({ workspaceId }).lean(),
    VariableModel.find({ workspaceId }).lean(),
    TemplateModel.find({ $or: [{ workspaceId }, { isSystem: true }] }).lean(),
  ]);

  const promptIds = prompts.map((prompt: { _id: unknown }) => String(prompt._id));
  const versions = await PromptVersionModel.find({ promptId: { $in: promptIds } })
    .sort({ versionNumber: -1 })
    .limit(promptIds.length * 5)
    .lean();

  return {
    workspace,
    prompts,
    folders,
    variables,
    templates,
    versions,
  };
};
