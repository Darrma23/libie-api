const cloudscraper = require("cloudscraper")
const cheerio = require("cheerio")

async function gsmarena(query){

  const base = "https://www.gsmarena.com"

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "en-US,en;q=0.9"
  }

  const searchUrl =
    `${base}/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(query)}`

  const html = await cloudscraper.get({
    url: searchUrl,
    headers
  })

  const $ = cheerio.load(html)

  const results = []

  $(".makers ul li").each((i,el)=>{

    const link = $(el).find("a")
    const name = link.find("span").text().trim()
    const detailUrl = link.attr("href")
    const image = link.find("img").attr("src")

    if(name && detailUrl){

      results.push({
        name,
        image: image || null,
        detail_url:
          detailUrl.startsWith("http")
            ? detailUrl
            : base + "/" + detailUrl
      })

    }

  })

  let detail = null

  if(results.length){

    const html2 = await cloudscraper.get({
      url: results[0].detail_url,
      headers
    })

    const $$ = cheerio.load(html2)

    const name = $$(".specs-phone-name-title").text().trim()

    const image =
      $$(".specs-photo-main img").attr("src")

    const quickSpecs = []

    $$(".specs-spotlight-features li").each((i,el)=>{
      const txt = $$(el)
        .text()
        .trim()
        .replace(/\s+/g," ")

      if(txt) quickSpecs.push(txt)
    })

    const specs = []

    $$("table").each((i,table)=>{

      const title =
        $$(table).find("th").first().text().trim()

      if(!title) return

      const items = []

      $$(table).find("tr").each((j,row)=>{

        const label =
          $$(row).find("td.ttl").text().trim()

        const value =
          $$(row)
          .find("td.nfo")
          .text()
          .trim()
          .replace(/\s+/g," ")

        if(label && value){
          items.push({ label, value })
        }

      })

      if(items.length){
        specs.push({
          category: title,
          items
        })
      }

    })

    detail = {
      name,
      image: image ? "https:" + image : null,
      url: results[0].detail_url,
      quickSpecs,
      specs
    }

  }

  return {
    search: results,
    detail
  }

}

module.exports = {

  name: "GSMArena",
  desc: "Cari spesifikasi HP dari GSMArena",
  category: "Internet",
  method: "GET",
  path: "/gsmarena",

  params: [
    {
      name: "q",
      type: "query",
      model: "text",
      required: true,
      desc: "Nama HP yang ingin dicari"
    }
  ],

  example: "/internet/gsmarena?q=redmi note 13",

  async run(req,res){

    try{

      const { q } = req.query

      if(!q){
        return res.status(400).json({
          status:false,
          message:"Parameter q wajib diisi"
        })
      }

      const data = await gsmarena(q)

      res.json({
        status:true,
        creator:"Himejima",
        data
      })

    }

    catch(err){

      res.status(500).json({
        status:false,
        message: err.message
      })

    }

  }

}