const axios = require("axios");
const redis = require("../../lib/redis");
const { randomUUID } = require("crypto");
const https = require("https");

const agent = new https.Agent({
  keepAlive: true,
});

const client = axios.create({
  timeout: 15000, // max 15 detik
  httpsAgent: agent,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
});

async function geminiRequest({ message, session, instruction }) {
  if (!message) throw new Error("Message is required.");

  let resumeArray = session?.resumeArray || null;
  let cookie = session?.cookie || null;
  let savedInstruction =
    instruction || session?.instruction || "";

  // Ambil cookie kalau belum ada
  if (!cookie) {
    const { headers } = await client.post(
      "https://gemini.google.com/_/BardChatUi/data/batchexecute?rpcids=maGuAc&source-path=%2F&hl=en-US&_reqid=173780&rt=c",
      "f.req=%5B%5B%5B%22maGuAc%22%2C%22%5B0%5D%22%2Cnull%2C%22generic%22%5D%5D%5D&",
      {
        headers: {
          "content-type":
            "application/x-www-form-urlencoded;charset=UTF-8",
        },
      }
    );

    cookie = headers["set-cookie"]?.[0]?.split("; ")[0] || "";
  }

  const requestBody = [
    [message, 0, null, null, null, null, 0],
    ["en-US"],
    resumeArray || ["", "", "", null, null, null, null, null, null, ""],
    null,
    null,
    null,
    [1],
    1,
    null,
    null,
    1,
    0,
    null,
    null,
    null,
    null,
    null,
    [[0]],
    1,
    null,
    null,
    null,
    null,
    null,
    ["", "", savedInstruction, null, null, null, null, null, 0, null, 1, null, null, null, []],
    null,
    null,
    1,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    [1,2,3,4,5,6,7,8,9,10],
    1,
    null,
    null,
    null,
    null,
    [1],
  ];

  const payload = [null, JSON.stringify(requestBody)];

  const { data } = await client.post(
    "https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?hl=en-US&_reqid=2813378&rt=c",
    new URLSearchParams({
      "f.req": JSON.stringify(payload),
    }).toString(),
    {
      headers: {
        "content-type":
          "application/x-www-form-urlencoded;charset=UTF-8",
        cookie,
      },
    }
  );

  const match = Array.from(data.matchAll(/^\d+\n(.+?)\n/gm));
  if (!match.length) throw new Error("Invalid Gemini response.");

  const selectedArray = match.reverse()[3]?.[1];
  if (!selectedArray) throw new Error("Gemini parsing failed.");

  const realArray = JSON.parse(selectedArray);
  const parse1 = JSON.parse(realArray[0][2]);

  const newResumeArray = [...parse1[1], parse1[4][0][0]];
  const text = parse1[4][0][1][0].replace(/\*\*(.+?)\*\*/g, "*$1*");

  return {
    text,
    resumeArray: newResumeArray,
    cookie,
    instruction: savedInstruction,
  };
}

module.exports = {
  name: "GeminiAI",
  desc: "Google Gemini AI dengan session",
  category: "AI",
  method: "GET",
  path: "/gemini",
  
  params: [
     {
        name: "prompt",
        type: "query",
        required: true,
        dtype: "string",
        desc: "Pesan untuk Gemini"
     },
     {
        name: "instruction",
        type: "query",
        required: false,
        dtype: "string",
        desc: "System prompt / karakter AI"
      },
      {
         name: "session_id",
         type: "query",
         required: false,
         dtype: "string",
         desc: "Session ID untuk melanjutkan chat"
      }
   ],
 
   example: [
      {
         title: "Start Chat",
         url: "/ai/gemini?prompt=Halo"
      },
      {
         title: "Continue Chat",
         url: "/ai/gemini?prompt=Siapa aku tadi?&session_id=gmn_xxxxx"
      }
   ],

  async run(req, res) {
    try {
      const { prompt, instruction, session_id } = req.query;

      if (!prompt) {
        return res.status(400).json({
          status: false,
          message: "Prompt wajib diisi",
        });
      }

      let sessionData = null;
      let currentSessionId = session_id;

      if (session_id) {
        const raw = await redis.get(`gemini:${session_id}`);

        if (!raw) {
          return res.status(400).json({
            status: false,
            message: "Session expired atau tidak ditemukan",
          });
        }

        sessionData = JSON.parse(raw);

        await redis.expire(`gemini:${session_id}`, 60 * 60);
      }

      const result = await geminiRequest({
        message: prompt,
        session: sessionData,
        instruction,
      });

      if (!currentSessionId) {
        currentSessionId = "gmn_" + randomUUID();
      }

      await redis.set(
        `gemini:${currentSessionId}`,
        JSON.stringify({
          resumeArray: result.resumeArray,
          cookie: result.cookie,
          instruction: result.instruction,
        }),
        { EX: 60 * 60 }
      );

      res.json({
        status: true,
        creator: "Himejima",
        session_id: currentSessionId,
        data: {
          prompt,
          response: result.text,
        },
        metadata: {
          expires_in: "1 hour (sliding)",
          timestamp: new Date().toISOString(),
        },
      });

    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  },
};