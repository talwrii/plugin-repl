import { Editor, EditorPosition } from 'obsidian'

import { point, endOfLinePoint, pointMin, pointMax } from './bufferMotion'

export function bufferString(editor: Editor, start?: EditorPosition, end?: EditorPosition) {
    return editor.getRange(start || pointMin(), end || pointMax(editor))
}

export function restOfLine(editor: Editor) {
    return bufferString(editor, point(editor), endOfLinePoint(editor))
}
