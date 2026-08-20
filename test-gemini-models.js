import axios from 'axios';

async function run() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    console.log(response.data.models.map(m => m.name).join('\n'));
  } catch(e) {
    console.error(e.response?.data || e.message);
  }
}

run();
