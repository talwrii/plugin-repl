import { App, Editor, Modal, Setting } from 'obsidian'

export function popup(app: App, editor: Editor, message: string): Promise<void> {
    const position = editor.getCursor()
    return new Promise<void>((resolve, reject) => {
        try {
            new Popup(app, message, resolve).open()
            editor.setCursor(position)
        } catch (e) {
            reject(e)
        }
    })
}

export class Popup extends Modal {
    constructor(app: App, msg: string, resolve: () => void) {
        super(app);

        const el = new DocumentFragment()
        const pre = el.createEl("pre")
        pre.appendText(msg)

        this.setContent(el)
        new Setting(this.contentEl).addButton((btn) => {
            btn.setButtonText("OK")

            const popup = this

            let keyDown = false;
            function done() {
                popup.close()
                resolve()
                return true
            }

            btn.buttonEl.addEventListener("keydown", (_) => {
                keyDown = true
            })

            btn.buttonEl.addEventListener('click', (_) => {
                return done()
            })

            btn.buttonEl.addEventListener("keyup", (_) => {
                if (keyDown) {
                    return done()
                }
            })
        })
    }
}
