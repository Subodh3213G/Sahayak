# Sahayak AI Agent - Hackathon Demo

## 🚀 Live Demo
**Try it now:** [https://sahayak-jade.vercel.app](https://sahayak-jade.vercel.app)
*(Open this link on a mobile device to test the microphone and UPI deep linking features)*

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
- **Deployment**: [Vercel](https://sahayak-jade.vercel.app) (Production), Localhost (Dev)

## 📱 Mobile Testing
**Option A: Use the Live Link (Recommended)**
Simply open `https://sahayak-jade.vercel.app` on your phone. Since it is hosted on Vercel with HTTPS, the microphone permissions will work automatically.

**Option B: Local Testing (If Vercel is down)**
**Important:** Modern browsers block microphone access on "insecure" HTTP origins. You **MUST** use HTTPS to test on your phone.

1. Start your local server:
   ```bash
   npm run dev
