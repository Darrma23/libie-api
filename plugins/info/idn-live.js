// plugins/Info/jkt48.js
const axios = require("axios");

function formatTime(ts) {
  if (!ts) return null;
  return new Date(ts * 1000).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  });
}

function formatCountdown(seconds) {
  if (!seconds || seconds <= 0) return "Sedang berlangsung";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days) parts.push(`${days} hari`);
  if (hours) parts.push(`${hours} jam`);
  if (minutes) parts.push(`${minutes} menit`);

  return parts.join(" ");
}

module.exports = {
  name: "JKT48",
  desc: "Menampilkan jadwal atau list live streaming JKT48 dari IDN Live",
  category: "Info",
  method: "GET",
  path: "/jkt48",
  params: [
    {
      name: "limit",
      type: "query",
      required: false,
      desc: "Jumlah data yang ditampilkan (default: 10)"
    }
  ],

  async run(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      const { data } = await axios.get(
        "https://api.idn.app/api/v4/livestreams",
        {
          params: {
            category: "idnliveplus",
            n: limit,
          },
          headers: {
            "x-api-key": "123f4c4e-6ce1-404d-8786-d17e46d65b5c",
          },
          timeout: 10000,
        }
      );

      const streams = data?.data;

      if (!streams || !streams.length) {
        return res.status(404).json({
          status: false,
          message: "Livestream tidak ditemukan",
        });
      }

      const now = Math.floor(Date.now() / 1000);

      // Sort: live paling atas → lalu scheduled terdekat
      streams.sort((a, b) => {
        if (a.status === "live") return -1;
        if (b.status === "live") return 1;
        return (a.scheduled_at || 0) - (b.scheduled_at || 0);
      });

      const result = streams.map((item) => {
        const isLive = item.status === "live";
        const isUpcoming =
          !isLive &&
          item.scheduled_at &&
          item.scheduled_at > now;

        const startsIn =
          isUpcoming
            ? Math.max(0, item.scheduled_at - now)
            : 0;

        return {
          title: item.title,
          slug: item.slug,
          status: item.status,
          view_count: item.view_count,
          is_live: isLive,
          is_upcoming: isUpcoming,
          badge: isLive ? "LIVE" : null,
          live_time: isLive ? formatTime(item.live_at) : null,
          scheduled_time: formatTime(item.scheduled_at),
          starts_in: formatCountdown(startsIn),
          creator: item.creator?.name || null,
          category: item.category?.name || null,
          watch_url: `https://www.idn.app/live/${item.slug}`,
        };
      });

      res.status(200).json({
        status: true,
        creator: "Himejima",
        total: result.length,
        server_time: new Date().toISOString(),
        data: result,
        metadata: {
          source: "IDN Live API",
          timestamp: new Date().toISOString(),
        },
      });

    } catch (err) {
      console.error("[Plugin JKT48]", err.message);

      res.status(500).json({
        status: false,
        message: "Gagal mengambil data livestream",
        error: err.response?.data || err.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
};