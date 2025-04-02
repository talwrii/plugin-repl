import { Editor, EditorPosition } from 'obsidian';

export function jumpLine(editor: Editor, line: number) {
    return editor.setCursor({ ch: 0, line: line })
}

export function jump(editor: Editor, position: EditorPosition) {
    return editor.setCursor(position)
}

export function forwardChar(editor: Editor, count: number | undefined): void {
    if (count === undefined) {
        count = 1
    }

    const cursor = editor.getCursor()
    cursor.ch += count
    editor.setCursor(cursor)
}

export function point(editor: Editor): EditorPosition {
    return editor.getCursor("to")
}

export function pointMax(editor: Editor) {
    const lastLine = editor.lastLine()
    const lastChar = editor.getLine(lastLine).length
    return { line: lastLine, ch: lastChar }
}

export function pointMin(): EditorPosition {
    return { line: 0, ch: 0 }
}

export function lineNumber(editor: Editor): number {
    return editor.getCursor().line
}


export function mark(editor: Editor) {
    return editor.getCursor("from")
}

export function endOfLine(editor: Editor) {
    let pos = endOfLinePoint(editor)
    editor.setCursor(pos.line, pos.ch)
}

export function endOfLinePoint(editor: Editor) {
    const cursor = editor.getCursor()
    const line = editor.getLine(cursor.line)
    return {
        line: cursor.line, ch: line.length
    }
}

export function atEndOfBuffer(editor: Editor) {
    return cursorEqual(point(editor), pointMax(editor))
}

function cursorEqual(a: EditorPosition, b: EditorPosition) {
    return (a.line === b.line) && (a.ch == b.ch)
}
