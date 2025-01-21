import { Editor, MarkdownView, Notice, App, Modal, Setting } from 'obsidian';

import { History } from './history'

export function promptCommand(app: App, history: History, editor: Editor): Promise<string> {
    return new Promise((resolve, reject) => {
        new CommandModal(app, history, (result) => {
            resolve(result)
        }).open()
    })
}

class CommandModal extends Modal {
    constructor(app: App, history: History, onSubmit: (result: string) => void) {
        super(app);
        this.setTitle('Execute JavaScript (press return to run)');

        let enterDown = false;
        let command = '';
        new Setting(this.contentEl)
            .setName('JavaScript')
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
