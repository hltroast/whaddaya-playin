const API_BASE = 'https://api.steampowered.com';

class SteamImporter{
    constructor(apiKey){
        this.apiKey = apiKey;
    }

    async callService(path, input)  {
        const url = new URL(`${API_BASE}/${path}`);
        url.searchParams.set('key', this.apiKey);
        url.searchParams.set('input_json', JSON.stringify(input));

        const response = await fetch(url);
        if(!response.ok) {
            throw new Error(`Steam API ${path} failed: HTTP ${response.status}`);
        }
        const data = await response.json();
        return data.response;
    }

    async getTagList() {
        return this.callService('IStoreService/GetTagList/v1/', {language:'english'});
    }

    async getAppList(lastAppId = 0, maxResults = 50000) {
        return this.callService('IStoreService/GetAppList/v1/', {
            include_games: true,
            include_dlc: false,
            include_software: false,
            include_videos: false,
            include_hardware: false,
            last_appid: lastAppId,
            max_results: maxResults
        });
    }

    async getItems(appIds) {
        return this.callService('IStoreBrowseService/GetItems/v1/', {
            ids: appIds.map(appid => ({ appid })),
            context: {language: 'english', country_code: 'US'},
            data_request: {
                include_basic_info: true,
                include_release: true,
                include_assets: true,
                include_reviews: true,
                include_all_purchase_options: true,
                include_tag_count: 20
            }
        });
    }
}

module.exports = {SteamImporter};