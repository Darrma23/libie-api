const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

const PUBLIC_KEY_STRING =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo+yvc35R8VPsfy1ScmQap+vVg/IYTcZCiJP5iiIo0HFLBrfDhwZ30wpvQ8lpezTN3exdZU3edIspp+weCgifbjFEyI7/Ecce7GTYXZyLncBrjzvO6IohPnaz/hx7+Uy6eNw8DNk15sxcJrQeSOULtOWJJ8dJ2IbR1eRIp0PXwJeXqdfoT52WzT/FaNzwh7sWmt4Zl8cw9o9JvdTqdU3WsCsdqsOXWIgyP/UIFWM+uu7P1xJ/DY40nMokHlG+fDdiT0us5Vu4LNUt3Er8OOZynnOESSQUocSvpb9UOcK5SurLCjWsk0RnQY2RBQluBnC9isJK5RC9FyK/5ezjmaQ1hQIDAQAB";

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY_STRING}\n-----END PUBLIC KEY-----`;

function getCurrentDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function decryptResponse(encryptedData, sessionKey) {
  try {
    const aesKey = sessionKey.substring(0, 16);
    const aesIv = sessionKey.substring(16, 32);

    const decipher = crypto.createDecipheriv(
      "aes-128-cbc",
      Buffer.from(aesKey, "utf8"),
      Buffer.from(aesIv, "utf8")
    );

    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("[✖] Decrypt gagal:", err.message);
    return null;
  }
}

function generateEncryptedBody(payloadJson) {
  const sessionKey = uuidv4().replace(/-/g, "");
  const aesKey = sessionKey.substring(0, 16);
  const aesIv = sessionKey.substring(16, 32);

  const cipher = crypto.createCipheriv(
    "aes-128-cbc",
    Buffer.from(aesKey, "utf8"),
    Buffer.from(aesIv, "utf8")
  );

  let encryptedData = cipher.update(
    JSON.stringify(payloadJson),
    "utf8",
    "base64"
  );
  encryptedData += cipher.final("base64");

  const encryptedKeyBuffer = crypto.publicEncrypt(
    {
      key: PUBLIC_KEY_PEM,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(sessionKey, "utf8")
  );

  return {
    rv: 1,
    ki: encryptedKeyBuffer.toString("base64"),
    data: encryptedData,
    sessionKey,
  };
}

async function uploadToFirebase(filePath) {
  const fileData = fs.readFileSync(filePath);
  const dateStr = getCurrentDate();
  const randomUuid = uuidv4();

  const storagePath = `snap_img2img/upload/${dateStr}/${randomUuid}_0.jpg`;
  const encodedPath = encodeURIComponent(storagePath);

  console.log("[…] Init upload:", storagePath);

  const initUrl = `https://firebasestorage.googleapis.com/v0/b/stn2_hs_us/o?name=${encodedPath}&uploadType=resumable`;

  const headers = {
    "User-Agent": "Dalvik/2.1.0",
    Connection: "Keep-Alive",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const initRes = await axios.post(initUrl, "", {
    headers: {
      ...headers,
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Protocol": "resumable",
      "Content-Length": "0",
    },
  });

  const uploadUrl = initRes.headers["x-goog-upload-url"];
  if (!uploadUrl) throw new Error("Upload URL tidak ditemukan");

  console.log("[…] Uploading image…");

  await axios.post(uploadUrl, fileData, {
    headers: {
      ...headers,
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
      "Content-Length": fileData.length,
    },
  });

  console.log("[✔] Upload selesai");

  return { imagePath: storagePath };
}

async function executeRequest(endpoint, payload) {
  try {
    console.log("[…] Fetch token…");

    const { data } = await axios.get(
      "https://www.kitsulabs.xyz/api/frida-hook/a/bd/jniutils/TokenUtils"
    );

    if (!data.success) throw new Error("TokenUtils gagal");

    const { uid, token } = data;

    console.log("[…] Encrypt payload…");

    const encryptedBody = generateEncryptedBody(payload);
    const currentTime = Date.now().toString();

    const res = await axios.post(
      endpoint,
      {
        rv: 1,
        ki: encryptedBody.ki,
        data: encryptedBody.data,
      },
      {
        headers: {
          "User-Agent": "okhttp/4.12.0",
          "Accept-Encoding": "gzip",
          "--v2-time": currentTime,
          uid,
          token,
          "content-type": "application/json; charset=utf-8",
        },
      }
    );

    console.log("[…] Decrypt response…");

    const decryptedRaw = decryptResponse(
      res.data.data,
      encryptedBody.sessionKey
    );

    if (!decryptedRaw) throw new Error("Decrypt gagal");

    const json = JSON.parse(decryptedRaw);

    const baseUrl = "https://hardstonepte.ltd/hs-us/";
    const rawResult = json.image_url || json.result_url;

    if (!rawResult) throw new Error("image_url kosong");

    if (Array.isArray(rawResult)) {
      return rawResult.map((p) =>
        baseUrl + (p.startsWith("/") ? p.slice(1) : p)
      );
    }

    return baseUrl + (rawResult.startsWith("/") ? rawResult.slice(1) : rawResult);
  } catch (err) {
    console.error("[✖] ExecuteRequest error:", err.message);
    throw err;
  }
}

module.exports = {
  name: "MorphAI",
  desc: "AI Morph / Edit gambar",
  category: "AI",
  method: "GET",
  path: "/morph",
  params: [
     {
       name: "url",
       type: "query",
       required: true,
       dtype: "string",
       desc: "URL gambar sumber"
     },
     {
       name: "style",
       type: "query",
       required: true,
       dtype: "string",
       desc: "Style morph (anime, realistic, cartoon, dll)"
     }
   ],
  example: "/ai/morph?url=https://files.catbox.moe/4j0udb.jpg&style=anime",

  async run(req, res) {
    const { url, style } = req.query;

    if (!url || !style) {
      return res.status(400).json({
        status: false,
        message: "Parameter url & style wajib",
      });
    }

    try {
      // 1️⃣ Download image
      const tempFile = path.join(os.tmpdir(), `morph_${Date.now()}.jpg`);
      const img = await axios.get(url, { responseType: "arraybuffer" });
      fs.writeFileSync(tempFile, img.data);

      console.log("[✔] Image downloaded");

      // 2️⃣ Upload
      const { imagePath } = await uploadToFirebase(tempFile);

      // 3️⃣ Execute edit
      const payload = {
        image_name: imagePath,
        nb: "stn2_hs_us",
        prompt: style,
      };

      const result = await executeRequest(
        "https://ai.hardstonepte.ltd/snap/chat/edit/v2/",
        payload
      );

      // 4️⃣ Response
      res.json({
        status: true,
        creator: "Himejima",
        data: {
          original: url,
          style,
          result,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: "Morph gagal",
        error: err.message,
      });
    }
  },
};