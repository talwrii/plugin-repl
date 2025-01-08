import { FuzzySuggestModal, App } from 'obsidian';



export function fuzzySelect(app: App, choices: Array<string>, prompt?: string) {
    return new Promise((reject, resolve) => {
        let selector = new FuzzySelector(app, prompt || "select:", choices, [reject, resolve])
        selector.run()
    })
}

class FuzzySelector extends FuzzySuggestModal<string> {
    resolve: (_: any) => void
    reject: (_: any) => void
    choices: Array<string>

    constructor(app: App, prompt: string, choices: Array<string>, callbacks: [resolv: (_: any) => void, reject: (_: any) => void]) {
        const [resolve, reject] = callbacks
        super(app);
        this.setPlaceholder(prompt);
        this.resolve = resolve
        this.reject = reject
        this.choices = choices
    }

    getItems(): string[] {
        return this.choices;
    }

    getItemText(choice: string): string {
        return choice
    }

    onChooseItem(item: string): void {
        this.resolve(item)
    }

    run() {
        try {
            this.open()
        } catch (e) {
            this.reject(e)
        }
    }
}
