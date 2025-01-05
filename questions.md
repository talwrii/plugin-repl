# Isn't this just reimplementing the Obsidian plugin API badly?
*Yes*, but it is reimplementing a subset that it most useful for
rapid (if ugly) procedural development so that you can get things done.

You can create hacky features in Plugin REPL far faster than with plugins. You can also debug a lot faster.

# What are plugins useful for that Plugin REPL is not?
Plugins are easier to share.
Plugins have their own namespaces and you are guaranteed to not get bugs with things like name colissions.
Plugins let you use typescript to catch errors and make using modules easier.

# Wouldn't it be better to have classes for the functions?
No, the idea here is to make discoverability as easy as possible. The hope is that the *core* set of functions needed for rapid prototyping is small enough that they can be handled in a single namespace and the ease of discovery makes up for the lack of organizations. This approach works well in emacs. "Shallow" development with a moderately fixed interface has difference trade offs to normal programming.

# What does going from a Plugin REPL "plugin" to a normal Obsidian Plugin look like
This is a model for how a path from Plugin REPL scripts to a full plugin would look.

1. You start off doing a task mostly manually.
2. At some stage tasks related to it start becoming so annoying or time consuming that they interfere with what you are doing, or you just want to play a little.
3. In the olden days, you would at this stage have to "roll up your sleaves" and make a plugin - which would possibly never happen.
4. Instead, you can just hack up a couple of commands with plugin REPL
5. Over time you add more and more commands and lay out a workflow.
6. At some stage you might start wanting to organize your code more - then you can use the source command

Eventually you might want to share what you are doing so someone can use it. This is one of the points when switching over to a traditoinal plugin might make sense. You can mostly just copy and paste your functions into a new plugin. An issue here is that you may be using convenience functions that are not present in the plugin. However, plugin repl is open source so you can either copy and paste those function, or maybe better, look at their implementation to use the Obsidian API.

Alternatively, you might start having enough code that you want a type system to hold your hand. At this point you might find it easier to switch over to a Plugin and typescript. Although you can still build and compile code and `require` it with Plugiun REPL.

Or, you might start wanting to use lots of javascript libraries. At which point it might make more sense to switch over to a plugin.



