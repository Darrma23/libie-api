const cloudscraper = require("cloudscraper")
const axios = require("axios")
const cheerio = require("cheerio")

const BASE = "https://oploverz.ch"
const GOFILE_WEBSITE_TOKEN = "4fd6sg89d7s6"

let gofileToken = null

const SELECT = {
  search: "search",
  latest: "latest",
  detail: "detail",
  download: "download",
  bypass: "bypass"
}

const abs = (href) => {
  if (!href) return null
  return href.startsWith("http")
    ? href
    : BASE + (href.startsWith("/") ? "" : "/") + href
}

async function fetchHTML(url) {
  const html = await cloudscraper.get({
    url,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": BASE + "/"
    },
    timeout: 20000
  })

  return cheerio.load(html)
}

async function getGofileToken() {
  if (gofileToken) return gofileToken

  const res = await axios.post(
    "https://api.gofile.io/accounts",
    {},
    { timeout: 10000 }
  )

  if (res.data?.status !== "ok")
    throw new Error("Gagal mendapatkan token gofile")

  gofileToken = res.data.data.token
  return gofileToken
}

async function bypassGofile(url) {
  const id = url.match(/gofile\.io\/d\/([a-zA-Z0-9]+)/)?.[1]
  if (!id) throw new Error("ID gofile tidak ditemukan")

  const token = await getGofileToken()

  const res = await axios.get(
    `https://api.gofile.io/contents/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-website-token": GOFILE_WEBSITE_TOKEN
      }
    }
  )

  if (res.data?.status !== "ok")
    throw new Error("Gofile API error")

  const files = Object.values(res.data.data.children || {})
    .filter(v => v.type === "file")
    .map(v => ({
      name: v.name,
      size: v.size,
      link: v.link,
      md5: v.md5
    }))

  return {
    folder: res.data.data.name,
    files
  }
}

function parseCards($) {
  const results = []

  $("article.bs").each((_, el) => {
    const a = $(el).find("a").first()
    const link = abs(a.attr("href"))
    const img = $(el).find("img").first()

    const title =
      img.attr("title") ||
      img.attr("alt") ||
      $(el).find("h2").text().trim()

    if (title && link) {
      results.push({
        title,
        link,
        image: img.attr("src") || img.attr("data-src")
      })
    }
  })

  return results
}

async function searchAnime(q) {

  const html = await cloudscraper.get(BASE + "/series")

  const $ = cheerio.load(html)

  const results = []

  $(".serieslist ul li").each((_, el) => {

    const title = $(el)
      .find(".leftseries h4 a")
      .text()
      .trim()

    const link = $(el)
      .find(".leftseries h4 a")
      .attr("href")

    const image = $(el)
      .find(".imgseries img")
      .attr("src")

    if (!title || !link) return

    if (title.toLowerCase().includes(q.toLowerCase())) {
      results.push({
        title,
        link,
        image
      })
    }

  })

  return results
}

async function getLatest() {
  const $ = await fetchHTML(`${BASE}/`)
  return parseCards($)
}

async function getDetail(url) {
  const $ = await fetchHTML(url)

  return {
    title: $("h1").first().text().trim(),
    cover: $(".thumb img").first().attr("src"),
    synopsis: $(".entry-content p").first().text().trim()
  }
}

async function getDownload(url) {
  const $ = await fetchHTML(url)
  const links = {}

  $("a").each((_, a) => {
    const href = ($(a).attr("href") || "").trim()

    if (href.startsWith("http")) {
      links[$(a).text().trim() || "Download"] = href
    }
  })

  return links
}

module.exports = {
  name: "Oploverz",
  desc: "Scraper anime dari oploverz + bypass gofile",
  category: "Anime",
  method: "GET",
  path: "/oploverz",

  params: [
    {
      name: "action",
      type: "query",
      model: "select",
      options: SELECT,
      default: "search",
      desc: "Jenis aksi"
    },
    {
      name: "q",
      type: "query",
      model: "text",
      desc: "Query pencarian"
    },
    {
      name: "url",
      type: "query",
      required: false,
      desc: "URL detail / download / gofile"
    }
  ],

  example: "/anime/oploverz?action=search&q=naruto",

  async run(req, res) {
    try {

      const { action = "search", q, url } = req.query
      let result

      switch (action) {

        case "search":
          if (!q) throw new Error("Parameter q diperlukan")
          result = await searchAnime(q)
          break

        case "latest":
          result = await getLatest()
          break

        case "detail":
          if (!url) throw new Error("Parameter url diperlukan")
          result = await getDetail(url)
          break

        case "download":
          if (!url) throw new Error("Parameter url diperlukan")
          result = await getDownload(url)
          break

        case "bypass":
          if (!url) throw new Error("Parameter url diperlukan")
          result = await bypassGofile(url)
          break

        default:
          throw new Error("Action tidak valid")
      }

      res.json({
        status: true,
        creator: "Himejima",
        action,
        result
      })

    } catch (err) {

      res.status(500).json({
        status: false,
        creator: "Himejima",
        message: err.message
      })

    }
  }
}