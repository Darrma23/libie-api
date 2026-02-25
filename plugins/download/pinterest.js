const axios = require("axios");
const cheerio = require("cheerio");
const qs = require("qs");
const path = require("path");

const CONFIG = {
  BASE_URL: "https://pindown.cc",
  ENDPOINTS: {
    HOME: "/en/",
    DOWNLOAD: "/en/download",
  },
  HEADERS: {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    Origin: "https://pindown.cc",
    Referer: "https://pindown.cc/en/",
  },
  TIMEOUT: 15000,
};

// ================= UTIL =================
const cleanText = (str) =>
  str ? str.replace(/\s+/g, " ").trim() : "";

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return null;
  const kb = bytes / 1024;
  const mb = kb / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${kb.toFixed(2)} KB`;
}

async function getFileSize(url) {
  try {
    const res = await axios.head(url, { timeout: 10000 });
    const size = res.headers["content-length"];
    return size ? formatBytes(parseInt(size)) : null;
  } catch {
    return null;
  }
}

// ================= DOWNLOAD LOGIC =================
async function downloadPinterest(pinUrl) {
  try {
    if (!/pinterest\.com\/pin\/|pin\.it\//i.test(pinUrl)) {
      throw new Error("URL Pinterest tidak valid.");
    }

    // 1️⃣ GET HOME (ambil CSRF + cookie)
    const homeRes = await axios.get(
      CONFIG.BASE_URL + CONFIG.ENDPOINTS.HOME,
      {
        headers: CONFIG.HEADERS,
        timeout: CONFIG.TIMEOUT,
      }
    );

    const cookies = homeRes.headers["set-cookie"];
    const cookieHeader = cookies ? cookies.join("; ") : "";

    const $home = cheerio.load(homeRes.data);
    const csrfToken = $home('input[name="csrf_token"]').val();

    if (!csrfToken) {
      throw new Error("CSRF token tidak ditemukan.");
    }

    // 2️⃣ POST DOWNLOAD
    const postData = qs.stringify({
      csrf_token: csrfToken,
      url: pinUrl,
    });

    const dlRes = await axios.post(
      CONFIG.BASE_URL + CONFIG.ENDPOINTS.DOWNLOAD,
      postData,
      {
        headers: {
          ...CONFIG.HEADERS,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieHeader,
        },
        timeout: CONFIG.TIMEOUT,
      }
    );

    const $ = cheerio.load(dlRes.data);

    const alertError = cleanText($(".alert-danger").text());
    if (alertError) {
      throw new Error(alertError);
    }

    const container = $(".square-box");

    if (!container.length) {
      throw new Error("Media tidak ditemukan.");
    }

    const title = cleanText(container.find(".font-weight-bold").text());
    const duration = cleanText(container.find(".text-muted").text());
    const thumbnail =
      container.find(".square-box-img img").attr("src");

    const mediasRaw = [];

    // 3️⃣ Ambil semua tombol download
    container.find(".square-box-btn a").each((_, el) => {
      const link = $(el).attr("href");
      const text = cleanText($(el).text());

      if (!link) return;

      let type = "unknown";
      if (/video/i.test(text)) type = "video";
      else if (/image/i.test(text)) type = "image";
      else if (/gif/i.test(text)) type = "gif";

      let ext = "jpg";
      if (link.includes(".mp4")) ext = "mp4";
      else if (link.includes(".gif")) ext = "gif";
      else if (link.includes(".png")) ext = "png";

      mediasRaw.push({
        type,
        extension: ext,
        quality: text.replace("Download ", ""),
        url: link,
      });
    });

    const medias = [];

    // 4️⃣ Tambahin filename + size
    for (const media of mediasRaw) {
      const size = await getFileSize(media.url);
      const filename = path.basename(media.url.split("?")[0]);

      medias.push({
        ...media,
        filename,
        size: size || "Unknown",
      });
    }

    // fallback thumbnail kalau ga ada media
    if (!medias.length && thumbnail) {
      const size = await getFileSize(thumbnail);

      medias.push({
        type: "image",
        extension: "jpg",
        quality: "Thumbnail",
        url: thumbnail,
        filename: path.basename(thumbnail),
        size: size || "Unknown",
      });
    }

    return {
      title,
      duration: duration || null,
      thumbnail: thumbnail || null,
      main_media: medias[0]?.url || null,
      total_media: medias.length,
      best_quality: medias[0]?.quality || null,
      media_summary: {
        images: medias.filter(m => m.type === "image").length,
        videos: medias.filter(m => m.type === "video").length,
        gifs: medias.filter(m => m.type === "gif").length,
      },
      medias,
    };

  } catch (err) {
    return { error: err.message };
  }
}

// ================= EXPORT PLUGIN =================
module.exports = {
  name: "PinterestDownloader",
  desc: "Download Pinterest Video / Image / GIF (Multi Media)",
  category: "Downloader",
  method: "GET",
  path: "/pinterest",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL Pinterest (pin / pin.it)",
    },
  ],

  example: "/downloader/pinterest?url=https://pin.it/xxxxxxxx",

  responses: [
    { code: 200, desc: "Berhasil mengambil media" },
    { code: 400, desc: "URL tidak valid / media tidak ditemukan" },
    { code: 500, desc: "Server error" },
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
      const result = await downloadPinterest(url);

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
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });

    } catch (err) {
      console.error("[Pinterest]", err.message);

      res.status(500).json({
        status: false,
        message: "Internal Server Error",
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
};