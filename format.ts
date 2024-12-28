import * as util from 'util'

export const formatObj = (x: any) => {
    if (x === undefined) {
        return "undefined"
    }
    else if (x === null) {
        return "null"
    } else if (typeof x === "string") {
        return x.toString()
    } else if (typeof x === "boolean") {
        return x.toString()
    } else if (typeof x === "number") {
        return x.toString()
    } else if (x.constructor === undefined) {
        return util.inspect(x)
    } else if (x.constructor === Array) {
        return x.toString()
    } else if (x.constructor === Object) {
        return util.inspect(x)
    } else {
        return `[${x.constructor.name} object]`
    }
}
