import { Editor } from 'obsidian'
import { bufferString, restOfLine } from './bufferData'
import { jump, point, endOfLinePoint, forwardChar, atEndOfBuffer } from './bufferMotion'


export function atRegexp(editor: Editor, r: RegExp) {
    return makeRegexpMatch(r).test(restOfLine(editor))
}

export function forwardRegexp(editor: Editor, r: RegExp) {
    let start = point(editor)
    while (true) {
        if (atRegexp(editor, r)) {
            return true
        }
        if (atEndOfBuffer(editor)) {
            jump(editor, start)
            return false
        }
        forwardChar(editor, 1)
    }
}

function makeRegexpMatch(r: RegExp) {
    // convert a regexp into one that only matches
    // the beginning of a string
    const regexp_string = r.toString()
    const [start, flags] = rsplit("/", regexp_string)
    const regexp = start.slice(1)
    return new RegExp("^" + regexp, flags)
}

function split(separator: string, x: string) {
    let point = x.indexOf(separator)
    return [x.slice(0, point), x.slice(point + 1)]
}

function rsplit(separator: string, x: string) {
    let point = x.lastIndexOf(separator)
    return [x.slice(0, point), x.slice(point + 1)]
}
