import { Editor, MarkdownView, Notice, Plugin, EditorPosition, App, Modal, Setting } from 'obsidian';

import * as util from 'util'
import * as evalScope from "./evalScope"

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default'
}

function makePlugin(app: any) {
    function plugin(name: string) {
        return app.plugins.plugins[name]
    }
    return plugin
}


class Scope {
    // https://stackoverflow.com/questions/2051678/getting-all-variables-in-scope
    context: Object

    constructor() {
        this.context = {};
    }

    add(name: string, x: any) {
        this.context[name] = x
    }

    eval(s: string) {
        console.log("scope s:" + s)
        return evalScope.evalInScope(s, this.context)
    }
}

function dir(obj: any) {
    var p = [];
    for (; obj != null; obj = Object.getPrototypeOf(obj)) {
        var op = Object.getOwnPropertyNames(obj);
        for (var i = 0; i < op.length; i++)
            if (p.indexOf(op[i]) == -1)
                p.push(op[i]);
    }
    return p;
}

function message(s: string) {
    new Notice(s)
}


function makeCommand(app: any) {
    function command(id: string) {
        app.commands.executeCommandById(id)
    }
    return command
}

function makeForwardChar(editor: Editor): (count: number | undefined) => void {
    function forwardChar(count: number | undefined): void {
        if (count === undefined) {
            count = 1
        }

        let cursor = editor.getCursor()
        cursor.ch += count
        editor.setCursor(cursor)
    }
    return forwardChar
}


function makeInsert(editor: Editor): (s: string) => void {
    function insert(s: string) {
        editor.replaceRange(s, editor.getCursor())
        makeForwardChar(editor)(s.length)
    }
    return insert
}

function makePointMax(editor: Editor): () => EditorPosition {
    function pointMax() {
        let lastLine = editor.lastLine()
        let lastChar = editor.getLine(lastLine).length
        return { line: lastLine, ch: lastChar }
    }
    return pointMax
}

function pointMin() {
    return { line: 0, ch: 0 }
}

function makeBufferString(editor: Editor): () => string {
    function bufferString() {
        return editor.getRange(pointMin(), makePointMax(editor)())
    }
    return bufferString
}

function makeSaveExcursion(editor: Editor) {
    function saveExcursion(f: () => any): void {
        let point = editor.getCursor()
        try {
            return f()
        } finally {
            editor.setCursor(point)
        }
    }
    return saveExcursion
}


function makeLineNumber(editor: Editor): () => number {
    function lineNumber(): number {
        return editor.getCursor().line
    }
    return lineNumber
}

function getResult(resultList: Array<any>, p: Promise<any>) {
    // get a result out of a promise
    p.then((x) => resultList.push(x)).catch((e) => message(e.message))
}

const formatObj = (x: any) => {
    console.log("formatting")
    if (x === undefined) {
        return "undefined";
    } else if (typeof x === "string") {
        return x.toString()
    } else if (typeof x === "boolean") {
        return x.toString()
    } else if (typeof x === "number") {
        return x.toString()
    } else if (x.constructor === undefined) {
        return util.inspect(x)
    } else if (x.constructor === Array) {
        return x.toString()
    } else if (x.constructor === Object) {
        return util.inspect(x)
    } else {
        console.log(x.constructor.name)
        return `[${x.constructor.name} object]`
    }
}

const makeEndOfLine = (editor: any) => {
    return () => {
        const cursor = editor.getCursor()
        const line = editor.getLine(cursor.line)
        editor.setCursor(cursor.line, line.length)
    }
}
export default class ReplPlugin extends Plugin {
    settings: MyPluginSettings;
    scope: Scope
    history: History

    runCommand(editor: Editor, view: MarkdownView, region: string) {
        let output: string = "";

        const endOfLine = makeEndOfLine(editor)

        this.scope.add("saveExcursion", makeSaveExcursion(editor))

        this.scope.add("lineNumber", makeLineNumber(editor))
        this.scope.add("command", makeCommand(this.app))
        this.scope.add("plugin", makePlugin(this.app))
        this.scope.add("bufferString", makeBufferString(editor))
        this.scope.add("insert", makeInsert(editor))
        this.scope.add("pointMin", pointMin)
        this.scope.add("pointMax", makePointMax(editor))
        this.scope.add("forwardChar", makeForwardChar(editor))
        this.scope.add("getResult", getResult)
        this.scope.add("message", message)
        this.scope.add("repl", this)
        this.scope.add("workspace", this.app.workspace)
        this.scope.add("app", this.app)
        this.scope.add("editor", editor)
        this.scope.add("view", view)
        this.scope.add("endOfLine", endOfLine)
        this.scope.add("dir", dir)
        try {
            output = formatObj(this.scope.eval(region))
        } catch (e) {
            new Notice(e.toString())
            throw e
        }
        return output
    }

    async onload() {
        this.scope = new Scope()
        this.history = new History()

        this.addCommand({
            id: 'repl-enter',
            name: 'Execute the current line or selection',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const cursor = editor.getCursor()
                const region = editor.getSelection() || editor.getLine(cursor.line)

                const endOfLine = makeEndOfLine(editor)

                const output = this.runCommand(editor, view, region)

                editor.setCursor(cursor.line + 1, 0)
                editor.replaceRange(output + "\n", editor.getCursor())
                endOfLine()
            }
        });

        this.addCommand({
            id: 'repl-exec',
            name: 'Execute run like or selection (no result)',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const cursor = editor.getCursor()
                const region = editor.getSelection() || editor.getLine(cursor.line)
                this.runCommand(editor, view, region)
            }
        });

        this.addCommand({
            id: 'repl-prompt-exec',
            name: 'Read some javascript and run it',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                let before = editor.getCursor()
                new CommandModal(this.app, this.history, (result) => {
                    let output = this.runCommand(editor, view, result)
                    message(output)
                    editor.setCursor(before)
                }).open()
            }
        });
    }
}

class History {
    index: number
    entries: Array<string>
    constructor() {
        this.index = 0
        this.entries = []
    }

    add(s: string): void {
        this.entries.push(s)
        this.index = this.entries.length - 1
    }

    previous() {
        let result = this.entries[this.index]
        this.index = Math.max(this.index - 1, 0)
        return result
    }

    next() {
        this.index = Math.min(this.index + 1, this.entries.length - 1)
        let result = this.entries[this.index]
        return result
    }

}

class CommandModal extends Modal {
    constructor(app: App, history: History, onSubmit: (result: string) => void) {
        super(app);
        this.setTitle('Execute javascript (press return)');

        let enterDown = false;
        let command = '';
        new Setting(this.contentEl)
            .setName('Javascript')
            .addText((text) => {
                text.inputEl.addEventListener("keydown", ({ key }) => {
                    if (key === 'Enter') {
                        enterDown = true
                    }
                })
                text.inputEl.addEventListener("keyup", ({ key }) => {
                    if ((key === 'Enter') && enterDown) {
                        this.close()
                        history.add(command)
                        onSubmit(command)
                        return true
                    } else if (key === 'ArrowUp') {
                        command = history.previous()
                        text.inputEl.value = command
                    } else if (key === 'ArrowDown') {
                        command = history.next()
                        text.inputEl.value = command
                    }

                })
                text.onChange((value) => {
                    command = value;
                });
            })
    }
}
