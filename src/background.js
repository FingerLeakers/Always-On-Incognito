const CHROME_PROTOCOLS = ['http', 'https', 'file', 'ftp'];

class Incognito {

    constructor() {
        this.listenOnInstall();
        this.listenOnNavigation();
        this.listenOnToggle();
    }

    listenOnToggle() {
        chrome.browserAction.onClicked.addListener(async (tab) => {
            const isActive = await this.isActive();
            const toggle = !isActive;
        
            chrome.browserAction.setIcon({path: `icons/48${toggle === false ? 'd' : ''}.png`});
            chrome.storage.sync.set({ ALWAYS_ON_INCOGNITO_ACTIVE: toggle });
        
            // If set to true and tab is present... run the current tab as incognito
            if (toggle === true && tab.incognito === false && this.startsWithAny(tab.url, CHROME_PROTOCOLS)) {
                await this.incognito(tab);
            }
        });
    }

    listenOnInstall() {        
        chrome.runtime.onInstalled.addListener(details => {
            if (details.reason === 'install' || details.reason === 'update') {
                // Defaults
                this.setDefaults();
            }
        });
    }

    listenOnNavigation() {
        chrome.webRequest.onBeforeRequest.addListener(
            async (info) => {
                if (await this.isActive()) {
                    chrome.tabs.get(info.tabId, async tab => {
                        if(tab.url === '') {
                            tab.url = info.url;
                        }
                        await this.incognito(tab);
                    });
                    return {cancel: true};
                }
            },
            {
                urls: CHROME_PROTOCOLS.map(proto => {
                    return `${proto}://*/*`;
                }),
                types: ['main_frame']
            },
            ['blocking']
        );
    }

    startsWithAny(str, items) {
        for (let i in items) {
            if (str.startsWith(items[i])) return true;
        }
        return false;
    }

    setDefaults() {
        chrome.storage.sync.set({
            ALWAYS_ON_INCOGNITO_ACTIVE: true
        });
    }

    async incognito(tab) {
        if(!tab || tab.incognito === true || typeof tab.url !== 'string' || tab.url === '') {
            return;
        }
        chrome.windows.create({
            incognito: true,
            url: tab.url,
        });
        chrome.tabs.remove(tab.id);
    }

    isActive() {
        return new Promise(resolve => {
            chrome.storage.sync.get('ALWAYS_ON_INCOGNITO_ACTIVE', (data => {
                // Ensure the object is a boolean otherwise reset config to defaults
                if (typeof data.ALWAYS_ON_INCOGNITO_ACTIVE !== 'boolean') {
                    this.setDefaults();
                    return resolve(true);
                }
                return resolve(data.ALWAYS_ON_INCOGNITO_ACTIVE);
            }));
        });
    }
}

(new Incognito());