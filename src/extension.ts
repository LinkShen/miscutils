// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as alternatefile from './alternatefile';

// config
let scrollnum = 10;
function loadConfig()
{
	scrollnum = vscode.workspace.getConfiguration("miscutils").get<number>("scrollnum", 10);
}

function scroll(line : number) {
	let activeTextEditor = vscode.window.activeTextEditor;
    if (!activeTextEditor) return;
    
    let startPos = activeTextEditor.visibleRanges[0].start;
    let endPos = activeTextEditor.visibleRanges[0].end;
    let currentPosition = activeTextEditor.selection.active;
    
    let documentLineCount = activeTextEditor.document.lineCount;
    let moveToLine = currentPosition.line + line;
    if (moveToLine > documentLineCount - 1) {
        moveToLine = documentLineCount - 1;
    }
    if (moveToLine < 0) {
        moveToLine = 0;
    }
    let moveToCharactor = activeTextEditor.document.lineAt(moveToLine).firstNonWhitespaceCharacterIndex;
    let newPosition = new vscode.Position(moveToLine, moveToCharactor);
    activeTextEditor.selection = new vscode.Selection(newPosition, newPosition);
    if (currentPosition.line < startPos.line || currentPosition.line > endPos.line)
    {
        activeTextEditor.revealRange(activeTextEditor.selection, vscode.TextEditorRevealType.Default);
        return;
    }

    let curTotalLen = endPos.line - startPos.line;
    let newEndLine = endPos.line + line;
    let topLine = startPos.line + line;
    if (newEndLine > documentLineCount - 1)
    {
        topLine = documentLineCount - 1 - curTotalLen;
    }
    if (topLine > documentLineCount - 1) {
        topLine = documentLineCount - 1;
    }
    if (topLine < 0) {
        topLine = 0;
    }
    let topPostion = new vscode.Position(topLine, 0);
    activeTextEditor.revealRange(new vscode.Selection(topPostion, topPostion), vscode.TextEditorRevealType.AtTop);
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

    alternatefile.init(context);
}

// this method is called when your extension is deactivated
export function deactivate() {}
