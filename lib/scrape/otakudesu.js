const axios = require("axios");
const cheerio = require("cheerio");

class Otakudesu {
  constructor() {
    this.inst = axios.create({
      baseURL: "https://uncors.netlify.app/",
      timeout: 20000
    });
  }

  async _fetch(path) {
    const { data } = await this.inst.get("", {
      params: {
        destination: `https://otakudesu.best${path}`
      }
    });
    return cheerio.load(data);
  }

  _splitElements(html, delimiter = "</li>") {
    return html
      .split(delimiter)
      .filter(i => i.trim())
      .map(i => `${i}${delimiter}`);
  }

  _mapGenres(html) {
    if (!html) return [];
    return html
      .split("</a>")
      .filter(i => i.trim())
      .map(i => cheerio.load(`${i}</a>`)("a").text());
  }

  _pagination(html) {
    const $ = cheerio.load(html);
    const current = parseInt(
      $(".pagination .pagenavix .page-numbers.current").text()
    );
    const last = parseInt(
      $(".pagination .pagenavix .page-numbers:last")
        .prev("a.page-numbers")
        .text()
    );

    return current
      ? { current_page: current, last_visible_page: Math.max(current, last) }
      : null;
  }

  /* ================= SEARCH ================= */

  async search(query) {
    if (!query) throw new Error("Query is required.");

    const $ = await this._fetch(`/?s=${encodeURIComponent(query)}&post_type=anime`);

    return this._splitElements($(".chivsrc li").toString()).map(anime => {
      const $a = cheerio.load(anime);
      return {
        title: $a("h2 a")
          .text()
          .replace(/\bsub(?:title)?[\s-]?(indo(?:nesia)?)\b/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim(),
        cover: $a("img").attr("src"),
        genres: this._mapGenres(
          $a(".set:nth-child(3)")
            ?.html()
            ?.replace("<b>Genres</b> : ", "")
        ),
        status: $a(".set:nth-child(4)")
          .text()
          ?.replace("Status : ", ""),
        rating: $a(".set:last-child")
          .text()
          ?.replace("Rating : ", ""),
        url: $a("h2 a").attr("href")
      };
    });
  }

  /* ================= DETAIL ================= */

  async detail(url) {
    if (!url.includes("otakudesu.best"))
      throw new Error("Invalid URL.");

    const { data } = await this.inst.get("", {
      params: { destination: url }
    });

    const $ = cheerio.load(data);

    const getText = (sel, rep = "") =>
      $(sel).text()?.replace(rep, "");

    const $ep = cheerio.load(
      `<div>${$(".episodelist").toString()}</div>`
    );

    const list = this._splitElements(
      $ep(".episodelist:nth-child(2) ul").html() || ""
    );

    const episode_lists = list
      .map(ep => {
        const $e = cheerio.load(ep);
        const title = $e("li span:first a")?.text();
        if (!title) return null;

        const epNum = title
          ?.replace(/^.*Episode\s+/, "")
          .replace(/\D.*$/, "")
          .trim();

        return {
          episode: title.trim(),
          episode_number: epNum ? parseInt(epNum, 10) : null,
          url: $e("li span:first a")?.attr("href")
        };
      })
      .filter(Boolean)
      .reverse();

    return {
      title: getText(".infozin .infozingle p:first span", "Judul: "),
      slug: $("link[rel=canonical]")
        .attr("href")
        ?.replace("https://otakudesu.best/anime/", "")
        ?.replace("/", ""),
      japanese_title: getText(
        ".infozin .infozingle p:nth-child(2) span",
        "Japanese: "
      ),
      cover: $(".fotoanime img").attr("src"),
      rating: getText(
        ".infozin .infozingle p:nth-child(3) span",
        "Skor: "
      ),
      type: getText(
        ".infozin .infozingle p:nth-child(5) span",
        "Tipe: "
      ),
      status: getText(
        ".infozin .infozingle p:nth-child(6) span",
        "Status: "
      ),
      episode_count: getText(
        ".infozin .infozingle p:nth-child(7) span",
        "Total Episode: "
      ),
      duration: getText(
        ".infozin .infozingle p:nth-child(8) span",
        "Durasi: "
      ),
      release_date: getText(
        ".infozin .infozingle p:nth-child(9) span",
        "Tanggal Rilis: "
      ),
      studio: getText(
        ".infozin .infozingle p:nth-child(10) span",
        "Studio: "
      ),
      genres: this._mapGenres(
        $(".infozin .infozingle p:last span a").toString()
      ),
      synopsis: $(".sinopc").text().trim(),
      episode_lists
    };
  }

  /* ================= ONGOING ================= */

  async ongoing(page = 1) {
    const $ = await this._fetch(`/ongoing-anime/page/${page}`);

    return {
      pagination: this._pagination($.html()),
      data: this._splitElements(
        $(".venutama .rseries .rapi .venz ul li").toString()
      ).map(anime => {
        const $a = cheerio.load(anime);
        return {
          title: $a(".jdlflm").text(),
          cover: $a("img").attr("src"),
          episode: $a(".epz").text().trim(),
          release_day: $a(".epztipe").text().trim(),
          url: $a("a").attr("href")
        };
      })
    };
  }

  /* ================= COMPLETE ================= */

  async complete(page = 1) {
    const $ = await this._fetch(`/complete-anime/page/${page}`);

    return {
      pagination: this._pagination($.html()),
      data: this._splitElements(
        $(".venutama .rseries .rapi .venz ul li").toString()
      ).map(anime => {
        const $a = cheerio.load(anime);
        return {
          title: $a(".jdlflm").text(),
          cover: $a("img").attr("src"),
          episode_count: $a(".epz")
            .text()
            .replace(" Episode", "")
            .trim(),
          rating: $a(".epztipe").text().trim(),
          url: $a("a").attr("href")
        };
      })
    };
  }

  /* ================= SCHEDULE ================= */

  async schedule() {
    const $ = await this._fetch("/jadwal-rilis");

    return $(".kglist321")
      .map((i, el) => ({
        day: $(el).find("h2").text().trim(),
        anime_list: $(el)
          .find("ul > li")
          .map((j, li) => ({
            anime_name: $(li).find("a").text().trim(),
            url: $(li).find("a").attr("href")
          }))
          .get()
      }))
      .get();
  }
}

module.exports = Otakudesu;