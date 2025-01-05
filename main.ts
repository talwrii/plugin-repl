import { Editor, MarkdownView, Notice, Plugin, EditorPosition, App, Modal, Setting, TFile } from 'obsidian';

import { execFileSync } from 'child_process'
import { parse as shellParse } from 'shell-quote';
import { expandRegionWithRegexp } from './editorUtils'


// the convenience functions are the things that change most and should
// be easiest to discover. Pull core funcitonality out


import { formatObj } from './format'
import { Scope } from './scope'
import { History } from './history'


import { fuzzySelect } from './fuzzy'
import { promptString } from './prompt'
import { promptCommand } from './promptCommand'
import { popup } from './popup'


export default class ReplPlugin extends Plugin {
    scope: Scope
    history: History
    initLoaded: boolean = false

    runCommand(editor: Editor, view: MarkdownView, region: string) {
        let output: string = "";

        this.updateScopeApp()
        this.updateScopeEditor(editor, view)

        try {
            let result = this.scope.eval(region)

            const scope = this.scope

            if (result instanceof Promise) {
                result.then((x) => {
                    message("async result: " + formatObj(x))
                    scope.add("_", x)
                    scope.add("_error", undefined)
                }).catch((e) => {
                    message("async error: " + e.message + "(see _error)")
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


    async loadInit() {
        if (!this.initLoaded) {
            //@ts-ignore -- exists is missing
            const exists = await this.app.vault.exists("repl.md")
            const source = this.makeSource(this.app)
            if (exists) {
                source("repl")
            }
            this.initLoaded = true
        }
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

    updateScopeApp() {
        let path = this.app.workspace.getLeaf().view.path
        this.scope.add("repl", this)
        // @ts-ignore path does exist
        this.scope.add("path", path)
        //@ts-ignore
        this.scope.add("vaultPath", this.app.vault.adapter.basePath)

        this.scope.add("dir", dir)
        this.scope.add("fuzzyDir", fuzzyDir.bind(null, this.app))
        this.scope.add("clipboardGet", clipboardGet)
        this.scope.add("clipboardPut", clipboardPut)

        this.scope.add("renameFile", renameFile.bind(null, this.app))

        this.scope.add("renameCurrent", renameFile.bind(null, this.app, path))

        this.scope.add("openSetting", openSetting.bind(null, this.app))
        this.scope.add("runProc", runProc)
        this.scope.add("newCommand", this.makeNewCommand())
        this.scope.add("source", this.makeSource(this.app))
        this.scope.add("plugin", plugin.bind(null, this.app))
        this.scope.add("promptString", promptString.bind(null, this.app))
        this.scope.add("command", command.bind(null, this.app))
        this.scope.add("readFile", readFile.bind(null, this.app))
        this.scope.add("writeFile", writeFile.bind(null, this.app))
        this.scope.add("appendToFile", appendToFile.bind(null, this.app))

        this.scope.add("getDv", getDv.bind(null, this.app))
        this.scope.add("message", message)
        this.scope.add("openFile", openFile.bind(null, this.app))
        this.scope.add("fuzzySelect", fuzzySelect.bind(null, this.app))
        this.scope.add("openUrl", openUrl)
    }

    updateScopeEditor(editor: Editor, view: MarkdownView) {
        this.scope.add("popup", popup.bind(null, this.app, editor))
        this.scope.add("endOfLine", endOfLine.bind(null, editor))
        this.scope.add("lineNumber", lineNumber.bind(null, editor))
        this.scope.add("bufferString", bufferString.bind(null, editor))
        this.scope.add("point", point.bind(null, editor))
        this.scope.add("mark", mark.bind(null, editor))
        this.scope.add("insert", insert.bind(null, editor))
        this.scope.add("kill", kill.bind(null, editor))
        this.scope.add("lineAtPoint", lineAtPoint.bind(null, editor))
        this.scope.add("wordAtPoint", wordAtPoint.bind(null, editor))
        this.scope.add("pointMin", pointMin)
        this.scope.add("pointMax", pointMax.bind(null, editor))
        this.scope.add("selection", selection.bind(null, editor))
        this.scope.add("forwardChar", forwardChar.bind(null, editor))
        this.scope.add("editor", editor)
        this.scope.add("view", view)
    }

    makeNewCommand() {
        const plugin = this
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

    makeSource(app: any) {
        const plugin = this
        async function source(name: string) {
            plugin.updateScopeApp()
            const path = name + ".md"
            const file: string = await app.vault.getAbstractFileByPath(path)
            const contents = await app.vault.read(file)
            plugin.scope.eval(contents)
        }
        return source
    }

    addCommands() {
        this.addCommand({
            id: 'repl-enter',
            name: 'Execute the current line or selection',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                try {
                    const cursor = editor.getCursor()
                    const region = editor.getSelection() || editor.getLine(cursor.line)

                    const output = this.runCommand(editor, view, region)

                    if (editor.getCursor().line == editor.lastLine()) {
                        editor.replaceRange("\n", editor.getCursor())
                    }

                    editor.setCursor(cursor.line + 1, 0)
                    editor.replaceRange(output + "\n", editor.getCursor())
                    endOfLine(editor)
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
                const command = await promptCommand(this.app, this.history, editor)
                message(this.runCommand(editor, view, command))
            }
        });
    }
}

function openFile(app: any, name: string) {
    app.workspace.openLinkText(name)
}

function plugin(app: any, name: string) {
    return app.plugins.plugins[name]
}

function runProc(commandAndArgs: string | Array<string>): string {
    if (typeof commandAndArgs === "string") {
        const command = shellParse(commandAndArgs) as string[]
        return runProc(command)
    }
    const [command, ...args] = commandAndArgs
    return execFileSync(command, args).toString()
}



function dir(obj: any) {
    const p = [];
    for (; obj != null; obj = Object.getPrototypeOf(obj)) {
        const op = Object.getOwnPropertyNames(obj);
        for (let i = 0; i < op.length; i++)
            if (p.indexOf(op[i]) == -1)
                p.push(op[i]);
    }
    return p;
}

function fuzzyDir(app: App, obj: any) {
    return fuzzySelect(app, dir(obj))
}

function message(s: string) {
    new Notice(s)
}

function command(app: any, id: string) {
    app.commands.executeCommandById(id)
}

function lineAtPoint(editor: Editor) {
    return editor.getLine(editor.getCursor().line)
}

function selection(editor: Editor) {
    const selection = editor.getSelection()
    if (selection === "") {
        throw Error("No text is selected")
    }
    return selection
}

function readFile(app: any, name: string) {
    name = name + ".md"
    const file = app.vault.getAbstractFileByPath(name)
    return app.vault.read(file)
}

async function writeFile(app: any, name: string, text: string) {
    name = name + ".md"
    let file: TFile
    if (await app.vault.exists(name)) {
        file = await app.vault.getAbstractFileByPath(name)
    } else {
        file = await app.vault.create(name, "")
    }
    return await app.vault.process(file, (_: string) => text)
}

async function appendToFile(app: App, name: string, appended: string) {
    let existing
    if (!await app.vault.exists(name + ".md")) {
        existing = ""
    } else {
        existing = await readFile(app, name)
    }

    const content = existing + appended
    await writeFile(app, name, content)
}

function getDv(app: App) {
    const p = plugin(app, "dataview")
    if (p === undefined) {
        throw new Error("dataview plugin is missing. Is it installed?")
    }
    return p.localApi()
}

function forwardChar(editor: Editor, count: number | undefined): void {
    if (count === undefined) {
        count = 1
    }

    const cursor = editor.getCursor()
    cursor.ch += count
    editor.setCursor(cursor)
}

function insert(editor: Editor, s: string) {
    editor.replaceRange(s, editor.getCursor())
    forwardChar(editor, s.length)
}

function cmpCursor(a: EditorPosition, b: EditorPosition) {
    if (a.line < b.line) {
        return -1
    } else if (b.line < a.line) {
        return 1
    } else if (a.ch < b.ch) {
        return -1
    } else if (b.ch < a.ch) {
        return 1
    } else {
        return 0
    }
}

function kill(editor: Editor, pos1?: EditorPosition, pos2?: EditorPosition) {
    pos1 = pos1 || mark(editor)
    pos2 = pos2 || point(editor)

    const [a, b] = [pos1, pos2].sort(cmpCursor)
    editor.replaceRange("", a, b)
}

function pointMax(editor: Editor) {
    const lastLine = editor.lastLine()
    const lastChar = editor.getLine(lastLine).length
    return { line: lastLine, ch: lastChar }
}

function pointMin(): EditorPosition {
    return { line: 0, ch: 0 }
}


function lineNumber(editor: Editor): number {
    return editor.getCursor().line
}

function point(editor: Editor): EditorPosition {
    return editor.getCursor("to")
}

function mark(editor: Editor) {
    return editor.getCursor("from")
}


function endOfLine(editor: any) {
    const cursor = editor.getCursor()
    const line = editor.getLine(cursor.line)
    editor.setCursor(cursor.line, line.length)
}

function bufferString(editor: Editor, start?: EditorPosition, end?: EditorPosition) {
    return editor.getRange(start || pointMin(), end || pointMax(editor))
}

function openUrl(url: string) {
    window.open(url) // returns null for some reason
    return undefined
}




function wordAtPoint(editor: Editor) {
    const pos = editor.getCursor()
    const [start, end] = expandRegionWithRegexp(editor, /\w/, pos, { ...pos, ch: pos.ch + 1 })
    const line = editor.getLine(pos.line)
    return line.slice(start.ch, end.ch)
}

async function openSetting(app: any, name: string) {
    function findTab(app: any, name: string): any {
        let result = undefined;

        app.setting.settingTabs.forEach((tab: any) => {
            if (tab.name === name) {
                result = tab
            }
        })

        app.setting.pluginTabs.forEach((tab: any) => {
            if (tab.name === name) {
                result = tab
            }
        })

        if (result === undefined) {
            throw new Error("Could not find tab with name:" + name)
        }
        return result
    }

    await app.setting.open()
    await app.setting.openTabById(findTab(app, name).id)
}

async function clipboardPut(s: string) {
    return await navigator.clipboard.writeText(s)
}

async function clipboardGet() {
    return await navigator.clipboard.readText()
}

async function renameFile(app: App, current: string, target: string) {
    let file = app.vault.getAbstractFileByPath(current)
    if (file === undefined) {
        throw new Error(`Could not find file ${file}`)
    } else {
        app.fileManager.renameFile(file!, target + ".md")
    }
}
