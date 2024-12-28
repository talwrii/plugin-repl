// scope for evaluating javascript

import * as evalScope from "./evalScope"

export class Scope {
    // https://stackoverflow.com/questions/2051678/getting-all-variables-in-scope
    context: Object

    constructor() {
        this.context = {};
    }

    add(name: string, x: any) {
        //@ts-ignore
        this.context[name] = x
    }

    eval(s: string) {
        return evalScope.evalInScope(s, this.context)
    }

    run(f: any) {
        return evalScope.runInScope(f, this.context)
    }
}
