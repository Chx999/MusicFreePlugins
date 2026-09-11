import axios from "axios";
// import { HttpsProxyAgent } from "https-proxy-agent";

// axios.defaults.httpsAgent = new HttpsProxyAgent("http://127.0.0.1:10809");

function formatMusicItem(item) {
  return {
    id: item.videoId,
    title: item.title.runs?.[0]?.text,
    artist: item.ownerText.runs?.[0]?.text,
    artwork: item?.thumbnail?.thumbnails?.[0]?.url,
  };
}

const searchContinuations = {};

const webClient = {
  clientName: "WEB",
  clientVersion: "2.20231121.08.00",
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

const playerClient = {
  clientName: "ANDROID",
  clientVersion: "20.35.36",
  userAgent:
    "com.google.android.youtube/20.35.36 (Linux; U; Android 14; en_US) gzip",
};

async function searchMusic(query, page) {
  if (page === 1) {
    searchContinuations[query] = {};
  }
  const continuation = searchContinuations[query]?.[page];
  if (page > 1 && !continuation) {
    return {isEnd: true, data: []};
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
        acceptHeader:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
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

  const response = (await axios(config)).data;

  const contents = response.contents?.twoColumnSearchResultsRenderer
    ?.primaryContents?.sectionListRenderer?.contents ??
    (response.onResponseReceivedCommands ?? []).reduce((items, command) => {
      const continuationItems =
        command.appendContinuationItemsAction?.continuationItems;
      if (continuationItems) {
        items.push(...continuationItems);
      }
      return items;
    }, []);

  const isEndItem = contents.find(
    (it) =>
      it.continuationItemRenderer?.continuationEndpoint?.continuationCommand
        ?.request === "CONTINUATION_REQUEST_TYPE_SEARCH"
  );
  if (isEndItem) {
    searchContinuations[query][page + 1] =
      isEndItem.continuationItemRenderer.continuationEndpoint
        .continuationCommand.token;
  }

  const musicData = contents.reduce((items, item) => {
    if (item.itemSectionRenderer?.contents) {
      items.push(...item.itemSectionRenderer.contents);
    } else if (item.videoRenderer) {
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

  const result = (await axios(config)).data;
  if (result.playabilityStatus?.status !== "OK" || !result.streamingData) {
    throw new Error(
      `获取 YouTube 音源失败：${result.playabilityStatus?.reason ?? result.playabilityStatus?.status ?? "视频不可播放"}`
    );
  }

  const audioFormats = (result.streamingData.adaptiveFormats ?? [])
    .filter((item) => item.url && item.mimeType?.startsWith("audio/"));
  const aacLcFormats = audioFormats.filter(
    (item) =>
      item.mimeType.startsWith("audio/mp4") &&
      item.mimeType.includes("mp4a.40.2")
  );
  const mp4Formats = audioFormats.filter((item) =>
    item.mimeType.startsWith("audio/mp4")
  );
  const preferredFormats = aacLcFormats.length
    ? aacLcFormats
    : mp4Formats.length
      ? mp4Formats
      : audioFormats;
  preferredFormats.sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0));

  const qualityIndex = {low: 0, standard: 1, high: 2, super: 3}[quality] ?? 1;
  const format = preferredFormats[Math.min(qualityIndex, preferredFormats.length - 1)];
  if (!format?.url) {
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
  srcUrl:
    "https://raw.githubusercontent.com/Chx999/MusicFreePlugins/master/dist/youtube/index.js",
  cacheControl: "no-store",
  search,
  getMediaSource,
};
