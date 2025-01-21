import { App, Modal, Setting } from 'obsidian';

export async function promptString(app: App, prompt: string) {
    return new Promise((resolve, reject) => {
        try {
            new PromptStringModal(app, prompt, [resolve, reject]).open()
        } catch (e) {
            reject(e)
        }
    })
}

class PromptStringModal extends Modal {
    constructor(app: App, prompt: string, onSubmit: [resolve: (_: any) => void, reject: (_: any) => void]) {
        super(app);
        this.setTitle(prompt);
        const [resolve, reject] = onSubmit

        let enterDown = false;
        let result = '';
        new Setting(this.contentEl)
            .setName(prompt)
            .addText((text: any) => {
                text.inputEl.addEventListener("keydown", ({ key }: KeyboardEvent) => {
                    if (key === 'Enter') {
                        enterDown = true
                    }
                })
                text.inputEl.addEventListener("keyup", ({ key }: KeyboardEvent) => {
                    if ((key === 'Enter') && enterDown) {
                        this.close()
                        resolve(result)
                        return true
                    }
                })
                text.onChange((value: any) => {
                    result = value;
                });
            })
    }
}
