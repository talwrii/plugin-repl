import { Notice } from 'obsidian';

export function test() {
    try {
        testInner()
    }
    catch (e) {
        new Notice("Tests failed.")
        return
    }
    new Notice("Tested passed.")
}

function testInner() {
    1
}
