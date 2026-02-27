module.exports = {
  name: "Cek XL / AXIS",
  desc: "Cek status nomor XL atau AXIS beserta paket aktif",
  category: "Info",
  method: "GET",
  path: "/cekxl",
  
  params: [
    {
      name: "number",
      type: "query",
      required: true,
      dtype: "string",
      desc: "Nomor HP (08xxx / 62xxx)"
    }
  ],
  example: "/info/cekxl?number=0819",

  async run(req, res) {
    try {
      let { number } = req.query;

      if (!number) {
        return res.status(400).json({
          status: false,
          message: "Parameter 'number' wajib diisi. Contoh: ?number=0817xxxx"
        });
      }

      number = number.replace(/\D/g, "");

      if (number.startsWith("08")) {
        number = "62" + number.slice(1);
      }

      if (!/^62\d{9,13}$/.test(number)) {
        return res.status(400).json({
          status: false,
          message: "Format nomor tidak valid. Gunakan 08xxxx atau 62xxxx"
        });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `https://bendith.my.id/end.php?check=package&number=${number}&version=2`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/116.0.0.0 Mobile Safari/537.36"
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(500).json({
          status: false,
          message: "Server eksternal tidak merespon dengan baik"
        });
      }

      const data = await response.json();

      if (!data.success) {
        return res.status(404).json({
          status: false,
          message: "Nomor tidak aktif atau bukan pelanggan XL/AXIS"
        });
      }

      const subs = data.data?.subs_info;
      const pack = data.data?.package_info;
      const volte = subs?.volte || {};
      const packages = pack?.packages || [];

      return res.status(200).json({
        status: true,
        creator: "Himejima",
        result: {
          number: subs?.msisdn,
          operator: subs?.operator,
          id_verified: subs?.id_verified,
          network: subs?.net_type,
          exp_date: subs?.exp_date,
          grace_until: subs?.grace_until,
          tenure: subs?.tenure,
          volte: {
            device: !!volte.device,
            area: !!volte.area,
            simcard: !!volte.simcard
          },
          packages
        }
      });
    } catch (err) {
      return res.status(500).json({
        status: false,
        message: "Terjadi kesalahan saat memproses permintaan",
        error: err.message
      });
    }
  }
};