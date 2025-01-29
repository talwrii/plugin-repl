import {
    Editor, MarkdownView, Notice, Plugin, EditorPosition, App, Modal, Setting, TFile,
    MarkdownPostProcessorContext, Command, FileSystemAdapter,
} from 'obsidian';

import { execFileSync, execSync } from 'child_process'
import { parse as shellParse, quote as shellQuote } from 'shell-quote';
import { expandRegionWithRegexp } from './editorUtils'
import { jump, forwardChar, point, pointMax, pointMin, lineNumber, mark, endOfLine, endOfLinePoint, atEndOfBuffer } from './bufferMotion'
import { forwardRegexp, atRegexp } from './regexpMotion'
import { bufferString, restOfLine } from './bufferData'




import { formatObj } from './format'
import { Scope } from './scope'
import { History } from './history'
import { PrivateApp, DataviewPlugin } from "./types"


import { fuzzySelect } from './fuzzy'
import { promptString } from './prompt'
import { promptCommand } from './promptCommand'
import { popup } from './popup'
import { openSetting } from './settings'
import { templater_expand } from './templater'



export default class ReplPlugin extends Plugin {
    scope: Scope
    history: History
    initLoaded: boolean = false
    function_docs: Array<string> = []

    runInCodeBlock(el: HTMLElement, input: string) {
        this.updateScopeApp()
        this.scope.add("el", el)
        this.scope.eval(input)
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

        this.registerEvent(this.app.workspace.on('active-leaf-change', () => { plugin.loadInit() }))
        this.registerMarkdownCodeBlockProcessor("plugin-repl", renderCodeBlock.bind(null, plugin))

    }

    addToScopeWithDoc(name: string, obj: any, doc: string) {
        this.scope.add(name, obj)
        let full_doc = `${name} -- ${doc}`
        if (this.function_docs.indexOf(full_doc) == -1) {
            this.function_docs.push(full_doc)
        }
    }

    updateScopeApp() {
        // @ts-ignore path does exist
        let path = this.app.workspace.getLeaf().view.path
        // @ts-ignore
        let frontmatter = this.app.metadataCache.getFileCache(this.app.workspace.getLeaf().view.file)["frontmatter"]

        this.scope.add("repl", this)
        this.scope.add("path", path)

        this.scope.add("frontmatter", frontmatter)

        let vaultPath
        if (this.app.vault.adapter instanceof FileSystemAdapter) {
            vaultPath = this.app.vault.adapter.getBasePath()
        } else {
            vaultPath = undefined
        }

        this.scope.add("vaultPath", vaultPath)

        this.addToScopeWithDoc(
            "functions", functions.bind(null, this, this.app),
            "Search convenience functions and variables provided by Plugin REPL"
        )
        this.addToScopeWithDoc(
            "dir", dir,
            "Return a list of the attributes of the Object"
        )
        this.addToScopeWithDoc(
            "fuzzyDir", fuzzyDir.bind(null, this.app),
            "Popup a fuzzy search listing the attributes of an Object"
        )
        this.addToScopeWithDoc(
            "clipboardGet", clipboardGet,
            "Get the contents of the clipboard"

        )
        this.addToScopeWithDoc(
            "clipboardPut", clipboardPut,
            "Put a string in the clipboard"
        )

        this.addToScopeWithDoc(
            "renameFile", renameFile.bind(null, this.app),
            "(a:string, b: string) Move the markdown note called a to b"
        )
        this.addToScopeWithDoc(
            "replRequire", replRequire.bind(null, vaultPath),
            "Import the JavaScript module installed with plugin-import-module."
        )

        this.addToScopeWithDoc(
            "renameCurrent", renameFile.bind(null, this.app, path),
            "Change the note title."
        )

        this.addToScopeWithDoc(
            "openSetting", openSetting.bind(null, this.app),
            "Open a setting tab with the name. (See the names in settings for possible values)"

        )
        this.addToScopeWithDoc(
            "runProc", runProc,
            "(s: string) or (['prog', 'arg1', 'args2']) run a program and return its output. To send "
        )
        this.addToScopeWithDoc(
            "newCommand", this.makeNewCommand(),
            "Given a function called command_name_with_underscores create a new command that runs this function"
        )
        this.addToScopeWithDoc(
            "source", this.makeSource(this.app),
            "(note_name:string) load (import / require) the note with title note_name and execute it with plugin repl"
        )
        this.addToScopeWithDoc(
            "plugin", plugin.bind(null, this.app),
            "(id: string) Return the plugin object for the plugin with id (see app.plugins.plugins) to get names ")
        this.addToScopeWithDoc(
            "promptString", promptString.bind(null, this.app),
            "(prompt?: string) Read a string from a popup window "
        )
        this.addToScopeWithDoc(
            "command", command.bind(null, this.app),
            "(name: string) Run the command called string (Call commands for a list)"

        )
        this.addToScopeWithDoc(
            "commands", commands.bind(null, this.app),
            "Return the ids of all commands. Perhaps you want to call fuzzySelect(commands())."

        )
        this.addToScopeWithDoc(
            "readFile", readFile.bind(null, this.app),
            "(title: string) Read the contents of the file with the title name"

        )
        this.addToScopeWithDoc(
            "writeFile", writeFile.bind(null, this.app),
            "(title: string, contents: string) Write the contents to the file with a title"
        )
        this.addToScopeWithDoc(
            "appendToFile", appendToFile.bind(null, this.app),
            "(title: string, content: string) Add the content to the note with a titel"
        )

        this.addToScopeWithDoc(
            "message", message,
            "(msg: string) Popup a message with a notification message msg"
        )
        this.addToScopeWithDoc(
            "openFile", openFile.bind(null, this.app),
            "(title: string) Open the file with title string in Obsidian"
        )
        this.addToScopeWithDoc(
            "fuzzySelect", fuzzySelect.bind(null, this.app),
            "(options: Array<string>, prompt?: string) Select from options with fuzzy search"

        )
        this.addToScopeWithDoc(
            "openUrl", openUrl,
            "(url: string) Open this url in a browser "
        )


        this.addToScopeWithDoc(
            "getDv", getDv.bind(null, this.app),
            "Get hold of the dataview object for querying pages"
        )
        this.addToScopeWithDoc(
            "templater_expand", templater_expand.bind(null, this.app),
            "If templater is installed, expand the templater string and return the result."
        )

    }

    updateScopeEditor(editor: Editor, view: MarkdownView) {
        this.addToScopeWithDoc(
            "popup", popup.bind(null, this.app, editor),
            "(message: string) Open a popup showing a message"
        )
        this.addToScopeWithDoc(
            "endOfLine", endOfLine.bind(null, editor),
            "Go the end of the line"
        )
        this.addToScopeWithDoc(
            "endOfLinePoint", endOfLinePoint.bind(null, editor),
            "Return the point a the end of the line."
        )
        this.addToScopeWithDoc(
            "lineNumber", lineNumber.bind(null, editor),
            "Return the current line number"
        )
        this.addToScopeWithDoc(
            "bufferString", bufferString.bind(null, editor),
            "Return the content of the buffer. If you provide (start, end) cursor positions return the string between start end"
        )
        this.addToScopeWithDoc(
            "point", point.bind(null, editor),
            "Return the current cursor position"
        )
        this.addToScopeWithDoc(
            "atEndOfBuffer", atEndOfBuffer.bind(null, editor),
            "Return true if the cursor is at the end of the buffer."
        )

        this.addToScopeWithDoc(
            "mark", mark.bind(null, editor),
            "Return the cursor at the beginning of the current selection"
        )
        this.addToScopeWithDoc(
            "insert", insert.bind(null, editor),
            "(s: string) Insert a string at the current point"
        )
        this.addToScopeWithDoc(
            "kill", kill.bind(null, editor),
            "(start: Position, end: Position) Delete the region between start and end"
        )
        this.addToScopeWithDoc(
            "lineAtPoint", lineAtPoint.bind(null, editor),
            "Return the content of the line where the cursor is. Optionally takes a cursor position as an argument"
        )
        this.addToScopeWithDoc(
            "wordAtPoint", wordAtPoint.bind(null, editor),
            "Returns the word where the cursor is. Optionally takes a cursor position as an argument"

        )
        this.addToScopeWithDoc(
            "pointMin", pointMin,
            "Returns the cursor position at the beginning of the note"
        )
        this.addToScopeWithDoc(
            "pointMax", pointMax.bind(null, editor),
            "Returns the cursor positoin at the beginning of the note"
        )
        this.addToScopeWithDoc(
            "jump", jump.bind(null, editor),
            "Jump to the given point."
        )
        this.addToScopeWithDoc(
            "selection", selection.bind(null, editor),
            "Returns the text of the selection."
        )
        this.addToScopeWithDoc(
            "forwardChar", forwardChar.bind(null, editor),
            "(count?: number) Move count (or 1) character forward"

        )
        this.addToScopeWithDoc(
            "editor", editor,
            "The editor object for the note. (See Obsidian api)"
        )
        this.addToScopeWithDoc(
            "view", view,
            "The view for the current not (See Obsidian api)"
        )
    }

    makeNewCommand() {
        const plugin = this
        function newCommand(f: () => void): (() => void) {
            let commandName = f.name.replace("/_/g", " ")
            plugin.addCommand({
                id: f.name,
                name: commandName,
                editorCallback: (editor: Editor, view: MarkdownView) => {
                    plugin.updateScopeApp()
                    plugin.updateScopeEditor(editor, view)
                    try {
                        plugin.scope.run(f)
                    } catch (e) {
                        message(`${commandName} failed: ${e.message}`)
                    }
                }
            });
            return f
        }
        return newCommand
    }

    makeSource(app: App) {
        const plugin = this
        async function source(name: string) {
            plugin.updateScopeApp()
            const path = name + ".md"
            const file = app.vault.getFileByPath(path)

            if (file !== null) {
                const contents = await app.vault.read(file)
                plugin.scope.eval(contents)
            }
        }
        return source
    }

    addCommands() {
        this.addCommand({
            id: 'eval',
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
            id: 'exec',
            name: 'Execute current line or selection (without printing result)',
            editorCallback: (editor: Editor, view: MarkdownView) => {
                const cursor = editor.getCursor()
                const region = editor.getSelection() || editor.getLine(cursor.line)
                this.runCommand(editor, view, region)
            }
        });

        this.addCommand({
            id: 'prompt-exec',
            name: 'Read some JavaScript and run it (result shown as Notification)',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const command = await promptCommand(this.app, this.history, editor)
                message(this.runCommand(editor, view, command))
            }
        });
    }
}

async function openFile(app: App, name: string) {
    await app.workspace.openLinkText(name, "")
}

function plugin(app: PrivateApp, name: string) {
    return app.plugins.getPlugin(name)
}

function runProc(commandAndArgs: string | Array<string>, input?: string): string {
    if (typeof commandAndArgs === "string") {
        const command = shellParse(commandAndArgs) as string[]
        return runProc(command, input)
    }

    if (input == undefined) {
        const [command, ...args] = commandAndArgs
        return execFileSync(command, args).toString()
    } else {
        let quoted = shellQuote(commandAndArgs)
        return execSync(quoted, { input: input }).toString()
    }
}

function dir(obj: Object) {
    const p = [];
    for (; obj != null; obj = Object.getPrototypeOf(obj)) {
        const op = Object.getOwnPropertyNames(obj);
        for (let i = 0; i < op.length; i++)
            if (p.indexOf(op[i]) == -1)
                p.push(op[i]);
    }
    return p;
}

function fuzzyDir(app: App, obj: Object) {
    return fuzzySelect(app, dir(obj))
}

function message(s: string) {
    new Notice(s)
}

function command(app: PrivateApp, id: string) {
    app.commands.executeCommandById(id)
}

function lineAtPoint(editor: Editor) {
    return editor.getLine(editor.getCursor().line)
}

function selection(editor: Editor) {
    const selection = editor.getSelection()
    return selection
}

function readFile(app: App, name: string) {
    const path = name + ".md"
    const file = app.vault.getFileByPath(path)
    if (file !== null) {
        return app.vault.read(file)
    } else {
        throw Error(`${path} does not exist`)
    }
}

async function writeFile(app: App, name: string, text: string) {
    name = name + ".md"
    let file: TFile
    file = app.vault.getFileByPath(name)!
    if (file === null) {
        file = await app.vault.create(name, "")
    }
    return await app.vault.process(file, (_: string) => text)
}

async function appendToFile(app: App, name: string, appended: string) {
    let file = app.vault.getFileByPath(name + ".md")!
    if (file === null) {
        return await writeFile(app, name, appended)
    } else {
        return await app.vault.append(file, appended)
    }
}

function getDv(app: PrivateApp) {
    const p = plugin(app, "dataview") as DataviewPlugin
    if (p === undefined) {
        throw new Error("dataview plugin is missing. Is it installed?")
    }
    return p.localApi()
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

function replRequire(vaultPath: string, name: string) {
    const modPath = vaultPath + "/plugin-repl-imports/imports_bundled.js"
    delete window.require.cache[modPath]
    const mod = window.require(modPath)
    return mod.packages[name]
}

function functions(plugin: ReplPlugin, app: App) {
    fuzzySelect(app, plugin.function_docs)
}

function commands(app: PrivateApp) {
    return app.commands.listCommands().map((x: Command) => x.id)
}

export function renderCodeBlock(plugin: ReplPlugin, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
    try {
        plugin.runInCodeBlock(el, source)
    } catch (e) {
        el.appendText(e.message)
        el.appendText(e.stack)
    }
}
