const axios = require("axios");

module.exports = {
  name: "Tri Check",
  desc: "Cek status SIM Card TRI",
  category: "Info",
  method: "GET",
  path: "/cektri",

  params: [
    {
      name: "number",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Nomor TRI (08xxx / 62xxx)"
    }
  ],

  example: "/tools/tricheck?number=0897xxxx",

  run: async (req, res) => {
    try {
      let { number } = req.query;

      if (!number) {
        return res.status(400).json({
          status: false,
          message: "Parameter number wajib diisi"
        });
      }

      let msisdn = number.replace(/\D/g, "");

      if (msisdn.startsWith("08")) {
        msisdn = "62" + msisdn.slice(1);
      }

      const triPrefix = /^(6289[5-9])/;

      if (!triPrefix.test(msisdn)) {
        return res.status(400).json({
          status: false,
          message: "Nomor bukan prefix TRI (0895–0899)"
        });
      }

      const response = await axios.post(
        "https://tri.co.id/api/v1/information/sim-status",
        {
          action: "MSISDN_STATUS_WEB",
          input1: "",
          input2: "",
          language: "ID",
          msisdn
        },
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/145.0.0.0 Mobile Safari/537.36",
            Accept: "application/json, text/plain, */*",
            Origin: "https://tri.co.id",
            Referer: "https://tri.co.id/"
          },
          timeout: 20000
        }
      );

      const result = response.data;

      if (!result?.status || !result?.data) {
        return res.status(404).json({
          status: false,
          message: "Nomor tidak valid / bukan SIM TRI"
        });
      }

      const data = result.data;

      if (data.responseCode !== "00000") {
        return res.status(404).json({
          status: false,
          message: "Nomor tidak valid"
        });
      }

      const now = new Date();
      const endDate = data.actEndDate ? new Date(data.actEndDate) : null;

      const remainingDays =
        endDate && !isNaN(endDate)
          ? Math.max(
              0,
              Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
            )
          : null;

      res.json({
        status: true,
        creator: "Himejima",
        data: {
          msisdn: data.msisdn,
          iccid: data.iccid,
          card_status: data.cardStatus,
          activation_status: data.activationStatus,
          activation_date: data.activationDate,
          expired_date: data.actEndDate,
          remaining_days: remainingDays,
          product: data.prodDesc,
          region: data.retDistrict
        },
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      console.error("TRICHECK ERROR:", err.message);

      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};