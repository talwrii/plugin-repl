# Plugin repl - In-editor Scripting and Rapid Plugin Development
[@readwithai](https://x.com/readwithai) ([🦋](https://bsky.app/profile/readwithai.bsky.social), [𝕏](https://x.com/readwithai), [blog](https://readwithai.substack.com/), [▶️](https://www.youtube.com/@readerai/shorts), [support](https:://ko-fi.com/readwithai), [Plugin REPL docs](https://readwithai.substack.com/p/obsidian-plugin-repl))

Rapidly automate tasks from within notes. Test code for plugins without having to reload.

This plugin adds an emacs-like read evaluate print loop (REPL) to Obsidian.
This lets you execute JavaScript directly in a document *and*, importantly, interact with Obsidian's plugin API to make Obsidian do things (like move the cursor, insert text, open files, etc).
You can also define new commands in JavaScript.

This can be useful when developing plugins or for "light-weight" scripting without having to develop a full plugin yourself.

A range of convenience functions, partly inspired by emacs, is also provided to speed up development of straight-forward features.

*I am in no way affiliated with Obsidian. This is a third-party plugin.*

# Demo
![demo](demo.gif)

# Installation
In your vault, there should be a `.obsidian/plugins` directory. You can clone this repo into that
directory and then run the following to build the plugin:

```
npm install
npm run dev
```

You should then be able to enable the plugin in the "Community Plugins" section of settings.

## Using
For basic usage, write a JavaScript expression on a line, then run the command "Execute the current line or selection" in the Command Palette. You can also select a region and run this command.
I would advise binding `CTRL-J` to this command.

Other commands are provided which you can find the command palette. These allow you to execute a region of JavaScript without inserting the result, or read JavaScript in a popup window to run.

To define a *command* ( run [Command Palette]( https://help.obsidian.md/Plugins/Command+palette) or a hotkey ) use the [newCommand](#commands) function.

The code you write can make use of the [convenience functions and variables](#convenience). This may well provide all the functionality you need for basic scripts, but Plugin REPL also gives you access to much of [Obsidian's plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
through the `app`, `editor` and `repl` (plugin) objects.

The `dir` and `fuzzyDir` methods can help explore these objects allong with the [API documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin).

If you want functionality, such as commands, to [rerun each time Obsidian loads](#startup) you can put it in a `repl.md` file in your vault.

IMPORTANT LIMITATION. Functions that you define are not shared between different invocations of plugin repl. To share them, you must instead define them as variables like so: `var f = function f() {`

## Documentation
This page provides an overview of functionality you might like to look at the [Obsidian and Plugin Repl Cookbook](https://readwithai.substack.com/p/obsidian-plugin-repl-cookbook) that provides various examples of how plugin repl can be used.

## Convenience functions provided
<a name="convenience"> </a>
Various convenience functions are provided:

* `functions()` - List the convenience functions and methods provided

* `source(f:string)` - Open the markdown file called f and execute the code in it
* `command(id:string)` - Run a command
* `commands()` - Return all the ids for commands. You may want to call `fuzzySelect(commands())`
* `newCommand(function name_with_underscores { ...)` - Create a new command with name "new name" which runs the function new_name
* `dir(o:Object)` - List the property in an object
* `fuzzyDir(o: Object)` - Explore the properties of an object with a fuzzy selector

### User interface
* `message(s:string)` - Print a notification message to the corner of the screen
* `popup(s: string)` - Popup a dialog displaying a message
* `await promptString(prompt: string)` - Read a string from a popup
* `await fuzzySelect(choices: Array<string>, prompt?: string)` - Select from an Array of strings
* `openFile(f:string)` - Open a file in the current pane
* `openUrl(url:string)` - Open a url

### Settings
* `openSetting(name: string)` - Open settings and display the tab (see left hand side) with the given name.
* `vaultPath` is the absolute path of the current vault

### Editor commands
* `path` is the path of the current note
* `lineNumber()` - return the line number of the current line
* `point()` - Return the current cursor position
* `mark()` - Return the cursor position at the  beginning of the selection
* `pointMin()` - Return the minimum cursor in the buffer
* `pointMax()` - Return the maximun cursor in the buffer
* `jump(p: CursorPoint)` - Jump to this point
* `forwardChar(count?: number)` - Move count (or one) character forward
* `selection()` - Get the text contained in the selection

* `bufferString()` - Return a string containing the entire text of the buffer
* `bufferString(start, end)` - Return the string between these two cursor positions (see `point()` and `editor.getCursor()`)
* `insert(s:string)` - Insert a string into the buffer
* `kill(start?: cursor, end?: cursor)` - Delete a region (defaults to the selection)
* `await clipboardPut(s: string)`  - Put a string on the clipboard
* `await clipboardGet()`  - Get the contents of the clipboard

* `wordAtPoint(p?:string)` - Returns the word at the cursor position. Default to current postion.
* `lineAtPoint(p?:string)` - Retunrs the line at the cursor position. Default to current positiong.

### Reading and files
* `await readFile(name: string) - Read the markup file with the title name.
* `await writeFile(name: string)` - Overwrite the markdown file with the title name with the given string
* `await appendToFile(name: string)` - Append the given string to the markdown with the title `name`
### Processes
* `runProc(s: string)` - Parse the bash-style command string s (e.g "ls /home") and call runProc on it
* `runProc([command, arg1, arg2, ...])` - Run a command and return what it writes to standard out. Raise and error on error. See [require('child_process')](https://nodejs.org/api/child_process.html) for more advanced usage.

### Plugins and Modules
* `plugin(s:string)` - Get the object for a plugin. You may be able to reuse features from another plugin with this.
* `getDv()` - Get the dataview object
* `replRequire(s: string)` - Import the node module installed using [Plugin Repl Imports](
https://github.com/talwrii/plugin-repl-imports)


### API access
* `repl` is the plugin object for repl.
* `editor` is the editor object. You can use this to write to current-file
* `app` is the application object.

## Defining commands
<a name="commands"></a>
The function `newCommand` will create a new command from a function. You can then
define a hotkey to this command.

```javascript
newCommand(function new_command_name() {
...
})
```

creates a command with the name "new command name" (and the id `new_command_name`).
You can use all Plugin REPL's extra functions and variables (`app`, `editor` etc) in this function.

If you want to test this funtion by hand you can do the following

```javascript
var f = newCommand(function new_command_name() {
...
})
```

You can then call `f()` using eval to test it.

## Running code at startup
<a name="startup"> </a>
If you want code to run at startup, such as for [defining commands](#commands), then you can place this code in a special file called `repl.md`. If this file exists, it is read when Obsidian starts (or is reloaded) and the code in it is executed.

## Asynchronous code
For convenience, if you call an asynchronous function, plugin repl will store the result of the call in the underscore variable (`_`) or, if there was an error, the error is stored in `_error`.

## Images and Graphs
In order to output images and graphs you can use code-blocks. These give you access to an `el` HTML object you can use for arbitrary HTML output. Note that all JavaScript executes in the same scope by design: Plugin REPL is for scripting.

````
```plugin-repl
el.appendText("hello")
```
````
## Dataview support
The [dataview plugin](https://blacksmithgu.github.io/obsidian-dataview/) provides
functionality to query your obsidian vault. For example, it can return pages or bullet points that match a particular query.

If you have installed the dataview plugin, plugin repl gives you access to a dataview object `dv` which can be used to query pages.


The following code returns the first list of the page called `templates/daily.md`.

```javascript
dv = getDv()
dv.pages().filter((x) => x.file.path == "templates/daily.md")[0].file.lists[0]
```

## Templater support
The [Templater](https://github.com/SilentVoid13/Templater) library provides functionality to insert templates with some parts of the template derived from JavaScript code. If you have installed Templater you can use
the async `templater_expand` function to expand template strings.

This creates a command that inserts a files tags using a template.
```
newCommand(async function templater_example() {
    insert(await templater_expand("The files tags: <% tp.file.tags %>"))
})
```

If you want to expand a template for a file you can use `readFile`:
```
newCommand(async function templater_from_file() {
    insert(await templater_expand(await readFile("myTemplate")))
})
```


## Importing modules
Modules in Obsidian work in an interesting way that makes installing from NPM a little tricky. There is a [technical explanation here](https://github.com/talwrii/plugin-repl-imports#technical).

There is a system to provide imports to Plugin REPL provided by [this repository](https://github.com/talwrii/plugin-repl-imports). To use it, you have to checkout a repository into your vault, update a text file, run a make command and then you can use the `replRequire` function within Obsidian, as described in the [docs](https://github.com/talwrii/plugin-repl-imports).

## Some questions and answers about plugin repl
[Questions and answers](questions.md)

## Alternatives and prior work
* You can [use plugins](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin) to do the same things that you can do with Plugin REPL but this tends to mean more code.
* [js-engine](https://github.com/mProjectsCode/obsidian-js-engine-plugin) lets you evaulate JavaScript code in code blocks. [Execute code](https://github.com/twibiral/obsidian-execute-code) gives you code blocks in multiple programming languages. Neither give you access to Obsidian API objects to let you do scripting.
* [dataview](https://blacksmithgu.github.io/obsidian-dataview/) similarly lets you execute JavasSript in code blocks.  It gives you access to the `app` object.
* [Templater](https://github.com/SilentVoid13/Templater) defines a template language with JavaScript code blocks. It's API gives you access to the `app` object and people have used "Templates" that when run script Obsidian.

Many plugins can create commands at run time from within Obsidian - but they tend to be for more specific uses. I was influenced by [obsidian-open-settings](https://github.com/Mara-Li/obsidian-open-settings) for this, as well as for the `openSettings` command.

Both [dataview](https://blacksmithgu.github.io/obsidian-dataview/) and [Templater](https://github.com/SilentVoid13/Templater) implement provide APIs that wrap and simplify aspects of the Obsidian API, [Templater's](https://silentvoid13.github.io/Templater/internal-functions/internal-modules/app-module.html) is rather more complete

# Attribution
This plugin was based on the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin) from Obsidian.

It uses the [shell-quote](https://github.com/ljharb/shell-quote) library by ljharb and the source code for this is compiled into distribited `main.js`. This is under an MIT license.

At runtime, it binds against [dataview](https://blacksmithgu.github.io/obsidian-dataview/) by blacksmithg if you use dataview functionality. This is under an MIT license.

This plugin is highly influenced by [Emacs](https://www.gnu.org/software/emacs/) (as are most text editors and a lot of software).

This code exposes and wraps the [Obsidian plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin) - as all plugins do - but Plugin REPL does this in a rather more direct / turing-complete way.

## About me
*If you are interesting in this you might be interested in my [obsidian cookbook](https://medium.com/@readwithai/youtube-shorts-introduction-to-obsidian-56bd01506fa0).*

*I make productivity tools and AI tools related to reading and research.*
*If that sounds interesting you can follow me on <a href="https://x.com/readwithai">twitter</a> or <a href="https://bsky.app/profile/readwithai.bsky.social">bluesky</a>.*

*I write about these topics on <a href="https://readwithai.substack.com/readwithai">substack</a>.*

*If you find **this** piece of software useful. Maybe give me money (like $10 dollars?) on my <a href="ko-fi.com/readwithai">kofi</a>.*
