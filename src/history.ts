// Keeps track of input history. E.g for running commands


export class History {
    index: number
    entries: Array<string>
    constructor() {
        this.index = 0
        this.entries = []
    }

    add(s: string): void {
        this.entries.push(s)
        this.index = this.entries.length - 1
    }

    previous() {
        const result = this.entries[this.index]
        this.index = Math.max(this.index - 1, 0)
        return result
    }

    next() {
        this.index = Math.min(this.index + 1, this.entries.length - 1)
        const result = this.entries[this.index]
        return result
    }

}
