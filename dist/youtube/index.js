"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
// import { HttpsProxyAgent } from "https-proxy-agent";
// axios.defaults.httpsAgent = new HttpsProxyAgent("http://127.0.0.1:10809");
function formatMusicItem(item) {
    var _a, _b, _c, _d, _e, _f, _g;
    return {
        id: item.videoId,
        title: (_b = (_a = item.title.runs) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.text,
        artist: (_d = (_c = item.ownerText.runs) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.text,
        artwork: (_g = (_f = (_e = item === null || item === void 0 ? void 0 : item.thumbnail) === null || _e === void 0 ? void 0 : _e.thumbnails) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.url,
    };
}
const searchContinuations = {};
const webClient = {
    clientName: "WEB",
    clientVersion: "2.20231121.08.00",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};
const playerClient = {
    clientName: "ANDROID",
    clientVersion: "20.35.36",
    userAgent: "com.google.android.youtube/20.35.36 (Linux; U; Android 14; en_US) gzip",
};
async function searchMusic(query, page) {
    var _a, _b, _c, _d, _e, _f, _g;
    if (page === 1) {
        searchContinuations[query] = {};
    }
    const continuation = (_a = searchContinuations[query]) === null || _a === void 0 ? void 0 : _a[page];
    if (page > 1 && !continuation) {
        return { isEnd: true, data: [] };
    }
    let data = JSON.stringify({
        context: {
            client: {
                hl: "zh-CN",
                gl: "US",
                deviceMake: "",
                deviceModel: "",
                userAgent: webClient.userAgent,
                clientName: webClient.clientName,
                clientVersion: webClient.clientVersion,
                osName: "Windows",
                osVersion: "10.0",
                platform: "DESKTOP",
                userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
                browserName: "Edge Chromium",
                browserVersion: "119.0.0.0",
                acceptHeader: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                screenWidthPoints: 1358,
                screenHeightPoints: 1012,
                screenPixelDensity: 1,
                screenDensityFloat: 1.2395833730697632,
                utcOffsetMinutes: 480,
                memoryTotalKbytes: "8000000",
                mainAppWebInfo: {
                    pwaInstallabilityStatus: "PWA_INSTALLABILITY_STATUS_UNKNOWN",
                    webDisplayMode: "WEB_DISPLAY_MODE_BROWSER",
                    isWebNativeShareAvailable: true,
                },
                timeZone: "Asia/Shanghai",
            },
            user: {
                lockedSafetyMode: false,
            },
            request: {
                useSsl: true,
                internalExperimentFlags: [],
            },
        },
        query: continuation ? undefined : query,
        continuation,
    });
    var config = {
        method: "post",
        url: "https://www.youtube.com/youtubei/v1/search?prettyPrint=false",
        headers: {
            "Content-Type": "text/plain",
            "User-Agent": webClient.userAgent,
        },
        data: data,
    };
    const response = (await (0, axios_1.default)(config)).data;
    const contents = (_f = (_e = (_d = (_c = (_b = response.contents) === null || _b === void 0 ? void 0 : _b.twoColumnSearchResultsRenderer) === null || _c === void 0 ? void 0 : _c.primaryContents) === null || _d === void 0 ? void 0 : _d.sectionListRenderer) === null || _e === void 0 ? void 0 : _e.contents) !== null && _f !== void 0 ? _f : ((_g = response.onResponseReceivedCommands) !== null && _g !== void 0 ? _g : []).reduce((items, command) => {
        var _a;
        const continuationItems = (_a = command.appendContinuationItemsAction) === null || _a === void 0 ? void 0 : _a.continuationItems;
        if (continuationItems) {
            items.push(...continuationItems);
        }
        return items;
    }, []);
    const isEndItem = contents.find((it) => {
        var _a, _b, _c;
        return ((_c = (_b = (_a = it.continuationItemRenderer) === null || _a === void 0 ? void 0 : _a.continuationEndpoint) === null || _b === void 0 ? void 0 : _b.continuationCommand) === null || _c === void 0 ? void 0 : _c.request) === "CONTINUATION_REQUEST_TYPE_SEARCH";
    });
    if (isEndItem) {
        searchContinuations[query][page + 1] =
            isEndItem.continuationItemRenderer.continuationEndpoint
                .continuationCommand.token;
    }
    const musicData = contents.reduce((items, item) => {
        var _a;
        if ((_a = item.itemSectionRenderer) === null || _a === void 0 ? void 0 : _a.contents) {
            items.push(...item.itemSectionRenderer.contents);
        }
        else if (item.videoRenderer) {
            items.push(item);
        }
        return items;
    }, []);
    let resultMusicData = [];
    for (let i = 0; i < musicData.length; ++i) {
        if (musicData[i].videoRenderer) {
            resultMusicData.push(formatMusicItem(musicData[i].videoRenderer));
        }
    }
    return {
        isEnd: !isEndItem,
        data: resultMusicData,
    };
}
async function search(query, page, type) {
    if (type === "music") {
        return await searchMusic(query, page);
    }
}
async function getMediaSource(musicItem, quality) {
    var _a, _b, _c, _d, _e, _f, _g;
    const data = {
        context: {
            client: {
                utcOffsetMinutes: 0,
                hl: "en",
                gl: "US",
                userAgent: playerClient.userAgent,
                clientName: playerClient.clientName,
                clientVersion: playerClient.clientVersion,
                osName: "Android",
                osVersion: "14",
                platform: "MOBILE",
                timeZone: "UTC",
            },
            request: {
                useSsl: true,
            },
        },
        videoId: musicItem.id,
    };
    var config = {
        method: "post",
        url: "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
        timeout: 10000,
        headers: {
            "Content-Type": "application/json",
            "User-Agent": playerClient.userAgent,
        },
        data: JSON.stringify(data),
    };
    const result = (await (0, axios_1.default)(config)).data;
    if (((_a = result.playabilityStatus) === null || _a === void 0 ? void 0 : _a.status) !== "OK" || !result.streamingData) {
        throw new Error(`获取 YouTube 音源失败：${(_e = (_c = (_b = result.playabilityStatus) === null || _b === void 0 ? void 0 : _b.reason) !== null && _c !== void 0 ? _c : (_d = result.playabilityStatus) === null || _d === void 0 ? void 0 : _d.status) !== null && _e !== void 0 ? _e : "视频不可播放"}`);
    }
    const audioFormats = ((_f = result.streamingData.adaptiveFormats) !== null && _f !== void 0 ? _f : [])
        .filter((item) => { var _a; return item.url && ((_a = item.mimeType) === null || _a === void 0 ? void 0 : _a.startsWith("audio/")); });
    const aacLcFormats = audioFormats.filter((item) => item.mimeType.startsWith("audio/mp4") &&
        item.mimeType.includes("mp4a.40.2"));
    const mp4Formats = audioFormats.filter((item) => item.mimeType.startsWith("audio/mp4"));
    const preferredFormats = aacLcFormats.length
        ? aacLcFormats
        : mp4Formats.length
            ? mp4Formats
            : audioFormats;
    preferredFormats.sort((a, b) => { var _a, _b; return ((_a = a.bitrate) !== null && _a !== void 0 ? _a : 0) - ((_b = b.bitrate) !== null && _b !== void 0 ? _b : 0); });
    const qualityIndex = (_g = { low: 0, standard: 1, high: 2, super: 3 }[quality]) !== null && _g !== void 0 ? _g : 1;
    const format = preferredFormats[Math.min(qualityIndex, preferredFormats.length - 1)];
    if (!(format === null || format === void 0 ? void 0 : format.url)) {
        throw new Error("获取 YouTube 音源失败：没有可直接播放的公开音频流");
    }
    return {
        url: format.url,
        headers: {
            "user-agent": playerClient.userAgent,
            accept: "*/*",
        },
    };
}
module.exports = {
    platform: "Youtube",
    author: "Chx999 / 猫头猫",
    version: "0.1.1",
    supportedSearchType: ["music"],
    srcUrl: "https://raw.githubusercontent.com/Chx999/MusicFreePlugins/master/dist/youtube/index.js",
    cacheControl: "no-store",
    search,
    getMediaSource,
};
