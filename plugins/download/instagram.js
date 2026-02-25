const axios = require("axios");
const cheerio = require("cheerio");
const { XMLParser } = require("fast-xml-parser");

// ================= CONFIG =================
const CONFIG = {
  HEADERS: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    Referer: "https://www.instagram.com/",
  },
  TIMEOUT: 15000,
};

// ================= HELPER =================
function normalizeArray(data) {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

// ================= SCRAPER =================
async function scrapeInstagram(url) {
  try {
    if (!/instagram\.com\/(reel|reels|p)\//i.test(url)) {
      return { error: "URL Instagram tidak valid." };
    }

    const response = await axios.get(url, {
      headers: CONFIG.HEADERS,
      timeout: CONFIG.TIMEOUT,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let scriptJson = null;

    // ================= 1️⃣ JSON DETECTION =================
    $('script[type="application/json"]').each((_, el) => {
      const content = $(el).html();

      if (
        content &&
        content.includes("xdt_api__v1__media__shortcode__web_info")
      ) {
        try {
          scriptJson = JSON.parse(content);
        } catch {}
      }
    });

    // ================= 2️⃣ FALLBACK JSON DETECTION =================
    if (!scriptJson) {
      $("script").each((_, el) => {
        const content = $(el).html();
        if (!content) return;

        if (content.includes("shortcode_media")) {
          try {
            const match = content.match(
              /\{.*"shortcode_media".*\}/s
            );
            if (match) scriptJson = JSON.parse(match[0]);
          } catch {}
        }
      });
    }

    // ================= 3️⃣ OG FALLBACK =================
    const ogVideo = $('meta[property="og:video"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content");
    const ogTitle = $('meta[property="og:title"]').attr("content");

    if (!scriptJson && ogVideo) {
      return {
        status: true,
        fallback: true,
        metadata: {
          caption: ogTitle || "",
        },
        media: {
          videos: [
            {
              url: ogVideo,
              qualityLabel: "OG Video",
            },
          ],
          thumbnails: ogImage
            ? [{ url: ogImage, resolution: "OG Image" }]
            : [],
        },
      };
    }

    if (!scriptJson) {
      return {
        error:
          "Data JSON tidak ditemukan. Kemungkinan IG blokir / struktur berubah.",
      };
    }

    // ================= EXTRACT ITEM =================
    const item =
      scriptJson.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]
        ?.__bbox?.result?.data
        ?.xdt_api__v1__media__shortcode__web_info?.items?.[0] ||
      scriptJson.shortcode_media;

    if (!item) {
      return { error: "Struct media tidak ditemukan." };
    }

    // ================= BASIC DATA =================
    const caption =
      item.caption?.text ||
      item.edge_media_to_caption?.edges?.[0]?.node?.text ||
      "";

    const takenAt =
      item.taken_at ||
      item.taken_at_timestamp ||
      null;

    // ================= DASH MANIFEST =================
    const dashXml = item.video_dash_manifest;

    let videoTracks = [];
    let audioTracks = [];

    if (dashXml) {
      try {
        const parser = new XMLParser({ ignoreAttributes: false });
        const manifest = parser.parse(dashXml);

        const period = manifest.MPD?.Period;
        const adaptationSets = normalizeArray(period?.AdaptationSet);

        adaptationSets.forEach((set) => {
          if (!set) return;

          const isVideo = set["@_contentType"] === "video";
          const isAudio = set["@_contentType"] === "audio";

          const reps = normalizeArray(set.Representation);

          reps.forEach((rep) => {
            if (!rep?.BaseURL) return;

            const track = {
              url: rep.BaseURL,
              bandwidth: parseInt(rep["@_bandwidth"]) || 0,
              codecs: rep["@_codecs"] || "",
              mimeType: rep["@_mimeType"] || "",
            };

            if (isVideo) {
              videoTracks.push({
                ...track,
                resolution: `${rep["@_width"]}x${rep["@_height"]}`,
                qualityLabel: rep["@_FBQualityLabel"] || "",
              });
            }

            if (isAudio) {
              audioTracks.push(track);
            }
          });
        });

        videoTracks.sort((a, b) => b.bandwidth - a.bandwidth);
      } catch {}
    }

    // ================= FALLBACK VIDEO URL =================
    if (!videoTracks.length && item.video_url) {
      videoTracks.push({
        url: item.video_url,
        qualityLabel: "Direct Video",
      });
    }

    return {
      status: true,
      metadata: {
        id: item.id,
        shortcode: item.code || item.shortcode,
        caption,
        taken_at: takenAt,
        uploadDate: takenAt
          ? new Date(takenAt * 1000).toISOString()
          : null,
      },
      author: {
        id: item.user?.pk || item.owner?.id,
        username:
          item.user?.username ||
          item.owner?.username ||
          "N/A",
        fullName:
          item.user?.full_name ||
          item.owner?.full_name ||
          "",
        verified:
          item.user?.is_verified ||
          item.owner?.is_verified ||
          false,
      },
      media: {
        thumbnails: (item.image_versions2?.candidates ||
          item.display_resources ||
          []).map((img) => ({
          url: img.url,
          resolution: `${img.width}x${img.height}`,
        })),
        videos: videoTracks,
        audios: audioTracks,
      },
    };
  } catch (err) {
    return { error: err.message };
  }
}

// ================= EXPORT PLUGIN =================
module.exports = {
  name: "InstagramDownloader",
  desc: "Download Instagram Reels / Post dengan metadata lengkap",
  category: "Downloader",
  method: "GET",
  path: "/instagram",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL Instagram (reel / post)",
    },
  ],

  example:
    "/downloader/instagram?url=https://www.instagram.com/reel/xxxxx/",

  responses: [
    { code: 200, desc: "Berhasil mengambil media" },
    { code: 400, desc: "Bad Request / URL salah" },
    { code: 500, desc: "Server / Instagram error" },
  ],

  async run(req, res) {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Parameter ?url= wajib diisi",
      });
    }

    try {
      const result = await scrapeInstagram(url);

      if (result.error) {
        return res.status(400).json({
          status: false,
          message: result.error,
        });
      }

      res.json({
        status: true,
        creator: "Himejima",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[InstagramDownloader]", err.message);

      res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: err.message,
      });
    }
  },
};