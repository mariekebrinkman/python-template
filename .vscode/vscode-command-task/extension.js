const vscode = require("vscode");

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  const TASK_TYPE = "vscodeCommand";

  const provider = vscode.tasks.registerTaskProvider(TASK_TYPE, {
    provideTasks() {
      return [];
    },

    resolveTask(task) {
      const def = task.definition || {};
      const commandId = def.command;
      const args = Array.isArray(def.args) ? def.args : [];

      const execution = new vscode.CustomExecution(async () => {
        const writeEmitter = new vscode.EventEmitter();
        const closeEmitter = new vscode.EventEmitter();

        const pty = {
          onDidWrite: writeEmitter.event,
          onDidClose: closeEmitter.event,

          open: async () => {
            try {
              if (!commandId || typeof commandId !== "string") {
                writeEmitter.fire("Error: task.definition.command must be a string.\r\n");
                closeEmitter.fire(1);
                return;
              }

              const cfg = vscode.workspace.getConfiguration();
              const allowed = cfg.get("vscodeCommandTask.allowedCommands", []);
              const confirm = cfg.get("vscodeCommandTask.confirmBeforeRun", true);

              if (!Array.isArray(allowed) || !allowed.includes(commandId)) {
                writeEmitter.fire(
                  `Blocked: '${commandId}' is not in vscodeCommandTask.allowedCommands.\r\n`
                );
                closeEmitter.fire(1);
                return;
              }

              if (confirm) {
                const shownArgs = args.map(a => JSON.stringify(a)).join(", ");
                const choice = await vscode.window.showWarningMessage(
                  `Run VS Code command from task?\n\n${commandId}(${shownArgs})`,
                  { modal: true },
                  "Run",
                  "Cancel"
                );
                if (choice !== "Run") {
                  writeEmitter.fire("Cancelled.\r\n");
                  closeEmitter.fire(0);
                  return;
                }
              }

              writeEmitter.fire(`Running: ${commandId}\r\n`);
              await vscode.commands.executeCommand(commandId, ...args);
              writeEmitter.fire("Done.\r\n");
              closeEmitter.fire(0);
            } catch (e) {
              writeEmitter.fire(`Failed: ${String(e)}\r\n`);
              closeEmitter.fire(1);
            }
          },

          close: () => {}
        };

        return pty;
      });

      return new vscode.Task(
        def,
        task.scope ?? vscode.TaskScope.Workspace,
        task.name ?? `Run ${commandId}`,
        TASK_TYPE,
        execution
      );
    }
  });

  context.subscriptions.push(provider);
}

function deactivate() {}

module.exports = { activate, deactivate };
