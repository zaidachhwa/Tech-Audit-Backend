


import dotenv from 'dotenv';
dotenv.config();

import { sendEmail } from './utils/email.js';

async function test() {
  try {
    console.log('Sending test email...');
    const result = await sendEmail({
      to: 'dev03nexcore@gmail.com',
      subject: 'Domain Verification Instructions',
      html: '<p>To send to dev03nexcore@gmail.com: You must verify your domain at <a href="https://resend.com/domains">resend.com/domains</a> by adding the provided DNS records to your domain provider. Once verified, it will work instantly.</p>'
    });
    console.log('Result:', result);
  } catch (error) {
    console.error('Error during test:', error);
  }
}

test();
