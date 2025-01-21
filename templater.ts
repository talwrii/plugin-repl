export async function templater_expand(app: any, template: string) {
    let path = this.app.workspace.getLeaf().view.path
    let p = app.plugins.getPlugin("templater-obsidian")
    if (p === undefined) {
        new Error("Templater must be installed")
    }

    p.templater.start_templater_task("plugin-repl");

    const running_config = p.templater.create_running_config(
        "plugin-repl",
        app.vault.getFileByPath(path),
        1
    );
    const functions_object = await p.templater.functions_generator.generate_object(
        running_config,
        1
    );
    this.current_functions_object = functions_object;
    const output_content = await p.templater.parser.parse_commands(
        template,
        functions_object
    );

    if (output_content == null) {
        await this.end_templater_task("plugin-repl");
        return;
    }

    await p.templater.end_templater_task("plugin-repl");
    return output_content
}

async function getTp(app: any) {
    let path = this.app.workspace.getLeaf().view.path
    let p = app.plugins.getPlugin("templater-obsidian")
    if (p === undefined) {
        new Error("Templater must be installed")
    }

    const running_config = p.templater.create_running_config(
        "plugin-repl",
        app.vault.getFileByPath(path),
        1
    );
    const functions_object = await p.templater.functions_generator.generate_object(
        running_config,
        1
    );
    return functions_object
}
