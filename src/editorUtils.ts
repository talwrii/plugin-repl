import { Editor, EditorPosition } from 'obsidian';

export function expandRegionWithRegexp(editor: Editor, regexp: RegExp, start: EditorPosition, end: EditorPosition) {
    if (start.line != end.line) {
        throw new Error("start and end must match")
    }
    const line = editor.getLine(start.line)
    let startChar = start.ch
    let endChar = end.ch
    while (startChar >= 1 && regexp.test(line[startChar - 1])) {
        startChar -= 1
    }
    while (endChar < line.length + 1 && regexp.test(line[endChar])) {
        endChar += 1
    }
    return [{ ...start, ch: startChar }, { ...end, ch: endChar }]
}
