# Isn't this just reimplementing the Obsidian plugin API badly?
*Yes*, but it is reimplementing a subset that it most useful for
rapid (if ugly) procedural development so that you can get things done.

You can create hacky features in Plugin REPL far faster than with plugins. You can also debug a lot faster.

# What are plugins useful for the Plugin REPL is not
Plugins are easier to share.
Plugins have their own namespaces and you are guaranteed to not get bugs with things like name colissions.
Plugins let you use typescript to catch errors and make using modules easier.

# Wouldn't it be better to have classes for the functions
No the idea here is to make discoverability as easy as possible. The hope is that the *core* set of functions needed for rapid prototyping is small enough that they can be handled in a single namespace and the ease of discovery makes up for the lack of organizations. What can I say... it works well in emacs.
