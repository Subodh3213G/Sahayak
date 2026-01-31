
# Sahayak AI Agent - Hackathon Demo

## Overview
Sahayak is a Digital Inclusion tool for Senior Citizens, allowing them to make UPI payments using voice commands in their native language (Hindi/Hinglish).

## Features
- **Voice Input**: Large, accessible microphone button using Web Speech API.
- **AI Processing**: Simulates intent extraction (Name, Amount) from voice.
- **Voice Verification**: Reads out the payment details for confirmation (Text-to-Speech).
- **One-Tap Payment**: Generates a UPI Deep Link to open PhonePe/GPay directly.

## Technology Stack
- **Frontend**: Next.js 15, Tailwind CSS
- **Backend Logic**: Next.js API Routes (Simulated AI/Regex for demo reliability)
- **Deployment**: Localhost or Vercel

## 📱 Mobile Testing (Crucial for Microphone Access)
**Important:** Modern browsers block microphone access on "insecure" HTTP origins (like `http://192.168.x.x:3000`). You **MUST** use HTTPS to test on your phone.

### How to use on Phone immediately:
1. Start your local server:
   ```bash
   npm run dev
   ```
2. In a **new terminal**, run `localtunnel` to create a public HTTPS link:
   ```bash
   npx localtunnel --port 3000
   ```
3. Copy the URL it gives you (e.g., `https://floppy-donkey-42.loca.lt`).
4. Open that URL on your smartphone.
5. **Bypass the Warning**: Localtunnel shows a "friendly warning" page. You need to enter the tunnel password (which is your external IP) OR just click "Click to Continue" / "Bypass" if available.
   - *Better Option:* Use **ngrok** if you have it installed: `ngrok http 3000`.

## Hackathon Notes
- The "AI Brain" is currently mocked using Regex in `app/api/process/route.ts` to ensure it works offline/without API keys during the demo.
- You can say: "Raju ko 500 rupaye bhejo", "Pay 500 to Raju", etc.
- The UPI link generated uses `upi://pay` scheme. On a desktop, this might do nothing or try to open an app. On a mobile device, it will prompt to open a UPI app.

## Project Structure
- `app/page.tsx`: Main UI and Speech Logic.
- `app/api/process/route.ts`: Backend logic replacing n8n for the self-contained demo.
