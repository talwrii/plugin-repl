import { Plugin, TFile } from 'obsidian'
import { PrivateApp } from './types';



export async function templater_expand(app: PrivateApp, template: string) {
    // We are interacting with the internal templater api here
    //  this reimplements a small section of code to just get
    //  the string output rather than interacting with an underlying file

    let path = this.app.workspace.getLeaf().view.path

    let p = app.plugins.getPlugin("templater-obsidian") as TemplaterPlugin
    if (p === undefined) {
        new Error("Templater must be installed")
    }

    p.templater.start_templater_task("plugin-repl");

    const running_config = p.templater.create_running_config(
        "plugin-repl",
        app.vault.getFileByPath(path)!,
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

export async function getTp(app: PrivateApp) {
    let path = this.app.workspace.getLeaf().view.path
    let p = app.plugins.getPlugin("templater-obsidian") as TemplaterPlugin
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


// This is all a silly game of writing down the type signatures (that I use once)
//   to avoid using "as any" because there is a type check in the plugin submission
//   process
interface TemplaterPlugin extends Plugin {
    templater: Templater
}

// warning - these types don't really check anything... because all types
// are "structural types" / "duck types" in typescript. But most of the
// methods of creating pseudo-nominal types (https://dev.to/tylim88/typescript-nominal-type-the-right-way-k9j)
// appear to have runtime features - which I can't add here because I'm documenting someone else api.
interface RunningConfig {
}

interface FunctionsObject {
}

interface FunctionsGenerator {
    generate_object: (config: RunningConfig, mode: number) => Promise<FunctionsObject>
}

interface Templater {
    parser: Parser
    start_templater_task: (x: string) => void
    end_templater_task: (x: string) => Promise<void>
    create_running_config: (template_file: string, current_file: TFile, mode: number) => RunningConfig
    functions_generator: FunctionsGenerator

}

interface Parser {
    parse_commands: (template: string, functions: FunctionsObject,) => Promise<string>
}
