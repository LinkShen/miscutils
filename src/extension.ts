// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// config
let scrollnum = 10;
function loadConfig()
{
	scrollnum = vscode.workspace.getConfiguration("miscutils").get<number>("scrollnum", 10);
}

function scroll(line: number) {
	let activeTextEditor = vscode.window.activeTextEditor;
	if (!activeTextEditor) return;
	let currentPosition = activeTextEditor.selection.active;
    let moveToLine = currentPosition.line + line;
    let documentLineCount = activeTextEditor.document.lineCount;
    if (moveToLine > documentLineCount - 1) {
        moveToLine = documentLineCount - 1;
    }
    if (moveToLine < 0) {
        moveToLine = 0;
    }
    let moveToCharactor = activeTextEditor.document.lineAt(moveToLine).firstNonWhitespaceCharacterIndex;
    let newPosition = new vscode.Position(moveToLine, moveToCharactor);
    activeTextEditor.selection = new vscode.Selection(newPosition, newPosition);
    activeTextEditor.revealRange(activeTextEditor.selection, vscode.TextEditorRevealType.Default);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	loadConfig();
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(loadConfig));

	context.subscriptions.push(vscode.commands.registerCommand('miscutils.scrolldown', () => {
		scroll(scrollnum);
	}));
	context.subscriptions.push(vscode.commands.registerCommand('miscutils.scrollup', () => {
		scroll(-scrollnum);
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}
