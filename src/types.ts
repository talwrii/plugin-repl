import {
    Plugin, App, Command
} from 'obsidian';

export type Cursor = {
    line: number
    ch: number
}

export interface PrivateApp extends App {
    commands: PrivateCommands
    plugins: PrivatePlugins

    setting: PrivateSettingWindow
}

export interface PrivateSettingWindow {
    open: () => void
    openTabById: (tabId: string) => void
}

export interface PrivateCommands {
    listCommands: () => Array<Command>
    executeCommandById: (_: string) => null
}

export interface PrivatePlugins {
    getPlugin: (_: string) => Plugin,
    plugins: { [_: string]: Plugin }
}

export interface DataviewPlugin extends Plugin {
    localApi: () => any


}
