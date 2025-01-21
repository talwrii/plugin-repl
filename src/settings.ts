
export async function openSetting(app: any, name: string) {
    function findTab(app: any, name: string): any {
        let result = undefined;

        app.setting.settingTabs.forEach((tab: any) => {
            if (tab.name === name) {
                result = tab
            }
        })

        app.setting.pluginTabs.forEach((tab: any) => {
            if (tab.name === name) {
                result = tab
            }
        })

        if (result === undefined) {
            throw new Error("Could not find tab with name:" + name)
        }
        return result
    }

    await app.setting.open()
    await app.setting.openTabById(findTab(app, name).id)
}
