module.exports = {
  name: "ScreenshotWeb",
  desc: "Screenshot full page website",
  category: "Tools",
  method: "GET",
  path: "/ssweb",

  params: [
    {
      name: "url",
      type: "query",
      required: true,
      dtype: "string",
      desc: "URL website (http:// atau https://)"
    }
  ],

  example: "/tools/ssweb?url=https://google.com",

  responses: [
    { code: 200, desc: "Berhasil mendapatkan link screenshot" },
    { code: 400, desc: "Bad Request" },
    { code: 500, desc: "Server Error" }
  ],

  run: async (req, res) => {
    try {
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({
          status: false,
          message: "Parameter ?url= wajib diisi"
        });
      }

      if (!/^https?:\/\//.test(url)) {
        return res.status(400).json({
          status: false,
          message: "URL harus diawali http:// atau https://"
        });
      }

      const screenshotUrl =
        `https://image.thum.io/get/fullpage/${encodeURIComponent(url)}`;

      return res.json({
        status: true,
        creator: "Himejima",
        data: {
          source: url,
          screenshot: screenshotUrl
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (err) {
      console.error("[ScreenshotWeb]", err.message);

      return res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};