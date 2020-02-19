
import * as vscode from 'vscode';

// let alternatefiles : Array<[string, string]> = [];
let alternatefiles : Array<[vscode.Uri, vscode.Uri]> = [];

export function init(context : vscode.ExtensionContext) {
    getAlternateFile();

    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e) => {
        if (e && e.viewColumn)
        {
            let elem = getAlternateFile();
            if (!elem) return;
            if (elem[1] == e.document.uri) return;
            elem[0] = elem[1];
            elem[1] = e.document.uri;
        }
    }));
	context.subscriptions.push(vscode.commands.registerCommand('miscutils.alternatefile', () => {
        let editor = vscode.window.activeTextEditor;
        if (editor && editor.viewColumn)
        {
            let elem = getAlternateFile();
            if (!elem) return;
            vscode.workspace.openTextDocument(elem[0]).then(doc => { vscode.window.showTextDocument(doc); });
        }
    }));
}

function getAlternateFile() : [vscode.Uri, vscode.Uri] | undefined
{
    let editor = vscode.window.activeTextEditor;
    if (!editor || !editor.viewColumn) return undefined;
    while (editor.viewColumn > alternatefiles.length)
    {
        let uri = editor.document.uri;
        alternatefiles.push([uri, uri]);
    }

    return alternatefiles[editor.viewColumn - 1];
}