import axios from 'axios';

async function run() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: 'Respond with: {"points":["good","bad","ok"], "overallRemarks":"done"}' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log(response.data.candidates[0].content.parts[0].text);
  } catch(e) {
    console.error(e.response?.data || e.message);
  }
}

run();
