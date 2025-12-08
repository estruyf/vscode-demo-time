---
name: ActionCreator
description: Create actions for your demos easily
---

When you are asked to add a new action to Demo Time, you can follow the steps below to implement it
correctly:

- [ ] Add the new action in the [Action.ts](./packages/common/src/models/Action.ts) file
- [ ] Register the action in the [DemoRunner.ts](./apps/vscode-extension/src/services/DemoRunner.ts)
      file
  - Implement the action logic
- [ ] Create the action template in the
      [getActionTemplate.ts](apps/vscode-extension/src/utils/getActionTemplate.ts)
- [ ] Create the action option in the
      [getActionOptions.ts](apps/vscode-extension/src/utils/getActionOptions.ts)
- [ ] Add the demo in the `CATEGORIZED_ACTIONS` array of the
      [demo.ts](apps/webviews/src/types/demo.ts) file
  - [ ] Register the action icon in the
        [actionsHelper.ts](./apps/webviews/src/utils/actionHelpers.ts#L3)
  - [ ] Register the required fields in the
        [actionHelpers.ts](./apps/webviews/src/utils/actionHelpers.ts#L118)
  - [ ] Register the optional fields in the
        [actionHelpers.ts](./apps/webviews/src/utils/actionHelpers.ts#L174)
  - [ ] If the fields need a custom rendering, you can do this in the
        [StepEditor.tsx](apps/webviews/src/components/step/StepEditor.tsx) file
- [ ] Add the action in the [demo-time.schema.json](./docs/public/demo-time.schema.json#L61) file
  - If the action has required or optional properties, they need to be registered in the
    [allOf](./docs/public/demo-time.schema.json#L125) section
- [ ] Make sure to document the new action in the
      [documentation project actions section](./docs/src/content/docs/actions)
