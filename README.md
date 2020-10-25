# Obsidian REPL plugin

This plugin adds an emacs-like read evaluate print loop (REPL) to obsidian.
This lets you execute javascript in a document *and* importantly interact with editor objects as though you were writing a plugin.
This can be useful when developing plugins, or for "light-weight" scripting without having to develop a plugin.

Over time various convenience functions may be added.

# Using
Install the plugin. I would advise binding CTRL-J to the commamd (Execute the current line or selection).

You can then write javascript expressions and press CTRL-J (or run the related command) to execute these expressions.
You can also assign to variables, but you have to use the `var` keyword when doing so.
A "dir" method is provided to allow you to inspect objects. And various useful objects are available.

`plugin` is the plugin object for repl.
`editor` is the editor object. You can use this to write to current-file
`app` is the application object.

You might like to [refer to the plugin documentation](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin) at the same time.

# About me

I'm [@readwithai](https://x.com/readwithai). I am interested in how AI (and other things) can increase access to information. I am an experiences emacs and org-mode user. I used to be quite into productivity tools.

You can give me money of [ko-fi](https://ko-fi.com/readwithai) if you like.

You might be interested in some other tools that I have made.
