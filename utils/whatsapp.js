// utils/whatsapp.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// WhatsApp API Config
const SIMPLYWHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
const SIMPLYWHATSAPP_API_KEY = process.env.WHATSAPP_ACCESS_TOKEN;
const SIMPLYWHATSAPP_INSTANCE_ID = process.env.WHATSAPP_INSTANCE_ID;

/**
 * Send WhatsApp message to a teacher
 */
export const sendWhatsAppMessage = async (phoneNumber, message) => {
  try {
    console.log("📱 Sending WhatsApp message to:", phoneNumber);

    const payload = {
      instance_id: SIMPLYWHATSAPP_INSTANCE_ID,
      access_token: SIMPLYWHATSAPP_API_KEY,
      number: phoneNumber,
      type: "text",
      message,
    };

    const response = await axios.post(SIMPLYWHATSAPP_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("✅ WhatsApp Message Sent:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("❌ WhatsApp Error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.message,
      details: error.response?.data || null,
    };
  }
};
