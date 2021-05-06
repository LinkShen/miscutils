
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let allNodes = new Map<string, CodeNode>();
let rootItem: CodeTreeItem;

export function init() {
    let provider = new CodeTreeProvider();
    vscode.window.registerTreeDataProvider('codetree', provider);
    vscode.commands.registerCommand('miscutils.codetree.addNode', (item)=>provider.cmdAddNode(item));
    vscode.commands.registerCommand('miscutils.codetree.delNode', (item)=>provider.cmdDelNode(item));
    vscode.commands.registerCommand('miscutils.codetree.openNode', (item)=>provider.cmdOpenNode(item));

    loadNodes();
}

class CodeTreeProvider implements vscode.TreeDataProvider<CodeTreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<CodeTreeItem | undefined | null> = new vscode.EventEmitter<CodeTreeItem | undefined | null>();
	readonly onDidChangeTreeData: vscode.Event<CodeTreeItem | undefined | null> = this._onDidChangeTreeData.event;

    constructor() {
    }

    getTreeItem(elem: CodeTreeItem): vscode.TreeItem {
        return elem;
    }

    getChildren(elem?: CodeTreeItem): Thenable<CodeTreeItem[]> {
        let items: CodeTreeItem[] = [];
        if (!elem) {
            elem = rootItem;
        } 
        for (let cid of elem.node.childs) {
            let node = allNodes.get(cid);
            if (!node) {
                elem.node.removeChild(cid);
                continue;
            }

            let collapsed = node.childs.length > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None;
            let item = new CodeTreeItem(collapsed, node, elem); 
            item.command = {
                command: "miscutils.codetree.openNode",
                title: "Open Node",
                arguments: [item]
            };
            items = items.concat(item);
        }
        return Promise.resolve(items);
    }

    cmdAddNode(item: CodeTreeItem) {
        let ed = vscode.window.activeTextEditor;
        if (!ed) {
            vscode.window.showWarningMessage("no active editor");
            return;
        }

        let pos = ed.selection.active;
        let file = ed.document.fileName;
        let label = ed.document.lineAt(pos.line).text;
        let node = getOrCreateNode(file, pos.line, label);
        if (!item) {
            rootItem.node.attachChild(node);
        } else {
            item.node.attachChild(node);
        }

        this._onDidChangeTreeData.fire();
        saveNodes();
    }

    cmdDelNode(item: CodeTreeItem) {
        item.parent?.node.removeChild(item.node.id());
        this._onDidChangeTreeData.fire();
        saveNodes();
    }

    cmdOpenNode(item: CodeTreeItem) {
        vscode.window.showTextDocument(vscode.Uri.file(item.node.filePath)).then(
            (ed)=>{
                ed.selection = new vscode.Selection(new vscode.Position(item.node.lineNum, 0), new vscode.Position(item.node.lineNum, 0));
                ed.revealRange(ed.selection, vscode.TextEditorRevealType.InCenter);
            },
            (reason)=>{
                vscode.window.showErrorMessage(reason.message);
            }
        );
    }
}

class CodeTreeItem extends vscode.TreeItem {
    constructor(
        collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly node: CodeNode,
        public readonly parent: CodeTreeItem | undefined,
    ) {
        super(parseGoFunc(node.label), collapsibleState);
        this.description = path.parse(node.filePath).base + ":" + node.lineNum;
        this.tooltip = node.label;
    }
}

function loadNodes() {
    let workSpace = vscode.workspace.workspaceFolders?.[0].uri.path;
    if (!workSpace) {
        return;
    }

    allNodes = new Map<string, CodeNode>();
    rootItem = new CodeTreeItem(vscode.TreeItemCollapsibleState.None, new CodeNode('', 0, ''), undefined);

    let file = workSpace + '/.vscode/codetree.json';
    if (!fs.existsSync(file)) {
        return;
    }
    let buf = fs.readFileSync(file).toString();
    try {
        let c = JSON.parse(buf);
        c.allNodes.forEach((elem:Array<any>) => {
            let k: string = elem[0];
            let v = elem[1];
            allNodes.set(k, new CodeNode(v.filePath, v.lineNum, v.label, v.childs));
        });
        let rootNode = new CodeNode(c.rootNode.filePath, c.rootNode.lineNum, c.rootNode.label, c.rootNode.childs);
        rootItem = new CodeTreeItem(vscode.TreeItemCollapsibleState.None, rootNode, undefined);
    } catch {
        allNodes = new Map<string, CodeNode>();
        rootItem = new CodeTreeItem(vscode.TreeItemCollapsibleState.None, new CodeNode('', 0, ''), undefined);
    }

    let tmpNodes = new Map<string, CodeNode>();
    for (let cid of rootItem.node.childs) {
        let child = allNodes.get(cid);
        if (!child) {
            continue;
        }
        rebuildNodes(child, tmpNodes);
    }
    allNodes = tmpNodes;
    saveNodes();
}

function rebuildNodes(node: CodeNode, nodes: Map<string, CodeNode>) {
    for (let cid of node.childs) {
        let child = allNodes.get(cid);
        if (!child) {
            continue;
        }
        rebuildNodes(child, nodes);
    }
    nodes.set(node.id(), node);
}

function saveNodes() {
    let c = JSON.stringify({allNodes: Array.from(allNodes.entries()), rootNode: rootItem.node});
    try {
        let workSpace = vscode.workspace.workspaceFolders?.[0].uri.path;
        if (!workSpace) {
            return;
        }

        if (!fs.existsSync(workSpace + '/.vscode')) {
            fs.mkdirSync(workSpace + '/.vscode');
        }
        fs.writeFileSync(workSpace + '/.vscode/codetree.json', c);
    } catch(err) {
        vscode.window.showErrorMessage(err.message);
    }
}

function getOrCreateNode(file: string, line: number, label: string): CodeNode {
    let nid = genNodeId(file, line);
    let node = allNodes.get(nid);
    if (node) {
        return node;
    }

    node = new CodeNode(file, line, label);
    allNodes.set(nid, node);
    return node;
}

class CodeNode {
    childs: Array<string> = new Array();

    constructor(readonly filePath: string, readonly lineNum: number, readonly label: string, childs?: Array<string>) {
        if (childs) {
            this.childs = childs;
        }
    }

    public id(): string {
        return genNodeId(this.filePath, this.lineNum);
    }

    public attachChild(child: CodeNode) {
        let cid = child.id();
        if (this.hasChild(cid)) {
            vscode.window.showWarningMessage(`child already existed. file=${child.filePath} line=${child.lineNum}`);
            return;
        }

        this.childs.push(cid);
    }

    public removeChild(cid: string) {
        let found = false;
        for (let i = 0; i < this.childs.length; i++) {
            if (this.childs[i] === cid) {
                found = true;
            }
            if (found && i < this.childs.length - 1) {
                this.childs[i] = this.childs[i + 1];
            }
        }

        if (found) {
            this.childs.pop();
        } else {
            vscode.window.showWarningMessage(`child not exist. cid=${cid}`);
        }
    }

    public hasChild(cid: string): boolean {
        for (let val in this.childs) {
            if (val === cid) {
                return true;
            }
        }
        return false;
    }
}

function genNodeId(file: string, line: number): string {
    return file + ':' + line;
}

function parseGoFunc(line: string): string {
    let i = line.indexOf("func");
    if (i === -1) {
        return line.trim();
    }
    line = line.substr(i + 4).trim();
    if (line.charAt(0) === "(") {
        i = line.indexOf(")");
        line = line.substr(i + 1).trim();
    }
    i = line.indexOf("(");
    line = line.substring(0, i).trim();
    return line;
}
