const axios = require('axios');

const NOTIFY_URL = 'http://127.0.0.1:3001/notify/report';
const SECRET = 'libie';

async function sendReport(text) {
  try {
    console.log('➡ POST ke notifserver...');
    
    const res = await axios.post(
      NOTIFY_URL,
      { text },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-secret': SECRET
        },
        timeout: 5000
      }
    );

    console.log('✅ Notif terkirim:', res.data);

  } catch (err) {
    console.error('❌ Notify error:',
      err.response?.data || err.message
    );
  }
}

module.exports = { sendReport };