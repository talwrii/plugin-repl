import { Editor, MarkdownView, Notice, Plugin, EditorPosition, App, Modal, Setting } from 'obsidian';

import { execFileSync } from 'child_process'
import * as util from 'util'
import { parse as shellParse } from 'shell-quote';
import { promisify } from 'util'

// the convenience functions are the things that change most and should
// be easiest to discover. Pull core funcitonality out
import { FuzzySelector } from './fuzzy'
import { PromptStringModal } from './promptString'
import { formatObj } from './format'
import { Scope } from './scope'
import { History } from './history'
import { promptCommand } from './promptCommand'

import { Cursor } from './types'

// Remember to rename these classes and interfaces!


interface MyPluginSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default'
}

function makeOpenFile(app: any) {
    function openFile(name: string) {
        app.workspace.openLinkText(name)
    }
    return openFile
}

function makePlugin(app: any) {
    function plugin(name: string) {
        return app.plugins.plugins[name]
    }
    return plugin
}

function runProc(commandAndArgs: string | Array<string>): string {
    if (typeof commandAndArgs === "string") {
        return runProc(shellParse(commandAndArgs))
    }
    let [command, ...args] = commandAndArgs
    return execFileSync(command, args).toString()
}

function makeFuzzySelect(app: App) {
    function fuzzySelect(choices: Array<string>, prompt?: string) {
        return new Promise((reject, resolve) => {
            let selector = new FuzzySelector(app, prompt || "select:", choices, [reject, resolve])
            selector.run()
        })
    }
    return fuzzySelect
}

function makePromptString(app: App) {
    async function promptString(prompt: string) {
        return new Promise((resolve, reject) => {
            try {
                new PromptStringModal(app, prompt, [resolve, reject]).open()
            } catch (e) {
                reject(e)
            }
        })
    }
    return promptString
}

function dir(obj: any) {
    let p = [];
    for (; obj != null; obj = Object.getPrototypeOf(obj)) {
        const op = Object.getOwnPropertyNames(obj);
        for (let i = 0; i < op.length; i++)
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

function makeLineAtPoint(editor: Editor) {
    function lineAtPoint() {
        return editor.getLine(editor.getCursor().line)
    }
    return lineAtPoint
}

function makeSelection(editor: Editor) {
    function selection() {
        let selection = editor.getSelection()
        if (selection === "") {
            throw Error("No text is selected")
        }
        return selection
    }
    return selection
}

function makeReadFile(app: any) {
    const readFile = function(name: string) {
        name = name + ".md"
        const file = app.vault.getAbstractFileByPath(name)
        return app.vault.read(file)
    }
    return readFile
}

function makeWriteToFile(app: any) {
    const writeToFile = function(name: string, text: string) {
        name = name + ".md"
        const file = app.vault.getAbstractFileByPath(name)
        return app.vault.modify(file, text)
    }
    return writeToFile
}

function makeGetDv(app: any) {
    function getDv() {
        let plugin = makePlugin(app)
        let p = plugin("dataview")
        if (p === undefined) {
            throw new Error("dataview plugin is missing. Is it installed?")
        }
        return p.localApi()
    }
    return getDv
}

function makeAppendToFile(app: any) {
    const writeToFile = makeWriteToFile(app)
    const readFile = makeReadFile(app)
    async function appendToFile(name: string, appended: string) {
        let existing = await readFile(name)
        if (existing === undefined) {
            existing = ""
        }
        const content = existing + appended
        await writeToFile(name, content)
    }
    return appendToFile
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
        const lastLine = editor.lastLine()
        const lastChar = editor.getLine(lastLine).length
        return { line: lastLine, ch: lastChar }
    }
    return pointMax
}

function pointMin(): Cursor {
    return { line: 0, ch: 0 }
}

function makeBufferString(editor: Editor): () => string {
    function bufferString(start?: Cursor, end?: Cursor) {
        return editor.getRange(start || pointMin(), end || makePointMax(editor)())
    }
    return bufferString
}

function makePoint(editor: Editor) {
    function point(): Cursor {
        return editor.getCursor("to")
    }
    return point
}

function makeMark(editor: Editor) {
    function mark() {
        return editor.getCursor("from")
    }
    return mark
}

function makeSaveExcursion(editor: Editor) {
    function saveExcursion(f: () => any): void {
        const point = editor.getCursor()
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

function openUrl(url: string) {
    window.open(url) // returns null for some reason
    return undefined
}

function makeEndOfLine(editor: any): (() => void) {
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
    initLoaded: boolean = false

    updateScopeApp() {
        this.scope.add("repl", this)
        this.scope.add("dir", dir)

        // @ts-ignore path does exist
        this.scope.add("path", this.app.workspace?.activeLeaf?.view?.path)
        //@ts-ignore
        this.scope.add("vaultPath", this.app.vault.adapter.basePath)
        this.scope.add("runProc", runProc)
        this.scope.add("newCommand", this.makeNewCommand())
        this.scope.add("source", this.makeSource(this.app))
        this.scope.add("plugin", makePlugin(this.app))
        this.scope.add("promptString", makePromptString(this.app))
        this.scope.add("command", makeCommand(this.app))
        this.scope.add("readFile", makeReadFile(this.app))
        this.scope.add("writeToFile", makeWriteToFile(this.app))
        this.scope.add("getDv", makeGetDv(this.app))
        this.scope.add("appendToFile", makeAppendToFile(this.app))
        this.scope.add("app", this.app)
        this.scope.add("message", message)
        this.scope.add("workspace", this.app.workspace)
        this.scope.add("openFile", makeOpenFile(this.app))
        this.scope.add("fuzzySelect", makeFuzzySelect(this.app))
        this.scope.add("openUrl", openUrl)
    }

    updateScopeEditor(editor: Editor, view: MarkdownView) {
        this.scope.add("popup", popup.bind(null, this.app, editor))
        this.scope.add("endOfLine", makeEndOfLine(editor))
        this.scope.add("saveExcursion", makeSaveExcursion(editor))
        this.scope.add("lineNumber", makeLineNumber(editor))
        this.scope.add("lineAtPoint", makeLineAtPoint(editor))
        this.scope.add("bufferString", makeBufferString(editor))
        this.scope.add("point", makePoint(editor))
        this.scope.add("mark", makeMark(editor))
        this.scope.add("insert", makeInsert(editor))
        this.scope.add("pointMin", pointMin)
        this.scope.add("pointMax", makePointMax(editor))
        this.scope.add("selection", makeSelection(editor))
        this.scope.add("forwardChar", makeForwardChar(editor))
        this.scope.add("editor", editor)
        this.scope.add("view", view)
    }


    makeNewCommand() {
        let plugin = this
        function newCommand(f: any) {
            plugin.addCommand({
                id: f.name,
                name: f.name.replaceAll("_", " "),
                editorCallback: (editor: Editor, view: MarkdownView) => {
                    plugin.updateScopeApp()
                    plugin.updateScopeEditor(editor, view)
                    plugin.scope.run(f)
                }
            });
            return f
        }
        return newCommand
    }

    runCommand(editor: Editor, view: MarkdownView, region: string) {
        let output: string = "";

        this.updateScopeApp()
        this.updateScopeEditor(editor, view)

        try {
            let result = this.scope.eval(region)

            const scope = this.scope

            if (result instanceof Promise) {
                result.then((x) => {
                    scope.add("_", x)
                }).catch((e) => {
                    scope.add("_error", e)
                    scope.add("_", undefined)
                })
            }

            output = formatObj(result)
        } catch (e) {
            new Notice(e.toString())
            throw e
        }
        return output
    }

    async onload() {
        this.scope = new Scope()
        this.history = new History()
        this.addCommands()

        this.initLoaded = false
        let plugin = this
        // This approach is stolen from vimrc - this event runs on startup (and lots of times after)
        this.app.workspace.on('active-leaf-change', () => { plugin.loadInit() })
    }

    makeSource(app: any) {
        const plugin = this
        async function source(name: string) {
            plugin.updateScopeApp()
            let path = name + ".md"
            const file: string = await app.vault.getAbstractFileByPath(path)
            const contents = await app.vault.read(file)
            plugin.scope.eval(contents)
        }
        return source
    }

    async loadInit() {
        if (!this.initLoaded) {
            let exists = await this.app.vault.exists("repl.md")
            let source = this.makeSource(this.app)
            if (exists) {
                source("repl")
            }
            this.initLoaded = true
        }
    }

    addCommands() {
        this.addCommand({
            id: 'repl-enter',
            name: 'Execute the current line or selection',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                try {
                    const cursor = editor.getCursor()
                    const region = editor.getSelection() || editor.getLine(cursor.line)

                    const endOfLine = makeEndOfLine(editor)

                    const output = this.runCommand(editor, view, region)

                    if (editor.getCursor().line == editor.lastLine()) {
                        editor.replaceRange("\n", editor.getCursor())
                    }

                    editor.setCursor(cursor.line + 1, 0)
                    editor.replaceRange(output + "\n", editor.getCursor())
                    endOfLine()
                } catch (e) {
                    message(e.message)
                }
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
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                let command = await promptCommand(this.app, this.history, editor)
                message(command)
                message(this.runCommand(editor, view, command))
            }
        });
    }
}

function popup(app: App, editor: Editor, message: string): Promise<void> {
    const position = editor.getCursor()
    return new Promise<void>((resolve, reject) => {
        new Popup(app, message, resolve).open()
        editor.setCursor(position)
    })
}

export class Popup extends Modal {
    constructor(app: App, msg: string, resolve: () => void) {
        super(app);
        this.setContent(msg)
        new Setting(this.contentEl).addButton((btn) => {
            btn.setButtonText("OK")

            let keyDown = false;

            btn.buttonEl.addEventListener("keydown", ({ key }) => {
                keyDown = true
            })


            btn.buttonEl.addEventListener("keyup", ({ key }) => {
                if (keyDown) {
                    this.close()
                    resolve()
                    return true
                }
            })
        })
    }
}
