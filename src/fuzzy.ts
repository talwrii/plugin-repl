import { FuzzySuggestModal, App } from 'obsidian';


export function fuzzySelect(app: App, choices: Array<string>, prompt?: string) {
    return new Promise((reject, resolve) => {
        let selector = new FuzzySelector(app, prompt || "select:", choices.map((x) => [x, x]), [reject, resolve])
        selector.run()
    })
}


export function fuzzySelectPair(app: App, choices: Array<[string, any]>, prompt?: string) {
    return new Promise((reject, resolve) => {
        let selector = new FuzzySelector(app, prompt || "select:", choices, [reject, resolve])
        selector.run()
    })
}

class FuzzySelector extends FuzzySuggestModal<[string, any]> {
    resolve: (_: any) => void
    reject: (_: any) => void
    choices: Array<[string, any]>

    constructor(app: App, prompt: string, choices: Array<[string, any]>, callbacks: [resolv: (_: any) => void, reject: (_: any) => void]) {
        const [resolve, reject] = callbacks
        super(app);
        this.setPlaceholder(prompt);
        this.resolve = resolve
        this.reject = reject
        this.choices = choices
    }

    getItems(): Array<[string, any]> {
        return this.choices
    }

    getItemText(choice: [string, any]): string {
        return choice[0]
    }

    onChooseItem(item: [string, any]): void {
        this.resolve(item[1])
    }

    run() {
        try {
            this.open()
        } catch (e) {
            this.reject(e)
        }
    }
}
