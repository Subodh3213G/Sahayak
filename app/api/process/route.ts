
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    console.log("Received text:", text);

    // Simple mocked AI for Hackathon Demo
    // In a real app, you'd call OpenAI/Gemini here.
    
    // Normalize text
    const lowerText = text.toLowerCase();
    
    // Default values
    let recipient = "Merchant"; 
    let amount = "500";
    let intent = "payment";

    // 1. Extract Amount (Find the first number in the text)
    const amountMatch = lowerText.match(/(\d+)/);
    if (amountMatch) {
      amount = amountMatch[1];
    }

    // 2. Extract Recipient Name
    // Strategy A: Look for "ko" (Hindi: "Raju ko...")
    if (lowerText.includes(" ko ")) {
      const parts = lowerText.split(" ko ");
      // The name is usually immediately before "ko"
      // e.g. "raju ko" -> "raju"
      // e.g. "mere bhai amit ko" -> "mere bhai amit"
      // We'll take the text before 'ko' and clean it up.
      let rawName = parts[0].trim();
      
      // Cleanup: Remove common start words if they exist (optional)
      // But purely taking everything before 'ko' is safest for full names.
      // We just need to remove the amount if the user said "500 rupees raju ko" (rare but possible)
      // If the amount is in the name string, remove it.
      if (amountMatch && rawName.includes(amountMatch[0])) {
         rawName = rawName.replace(amountMatch[0], "").trim();
      }
      // Remove "rupees", "rupaye" from name if present
      rawName = rawName.replace(/(rupees|rupaye|rs|bhejo|send|pay|paise|money|transfer|karo)/g, "").trim();
      
      if (rawName.length > 0) {
        recipient = rawName;
      }
    }
    // Strategy B: Look for "to" (English: "pay to Raju...")
    else if (lowerText.includes("to ")) {
      const parts = lowerText.split("to ");
      if (parts.length > 1) {
         let rawName = parts[1].trim();
         // The name is after "to". 
         // "to raju" -> "raju"
         // "to raju please" -> "raju please"
         // We should stop at the end of the sentence or before amount if mentioned after
         
         if (amountMatch && rawName.includes(amountMatch[0])) {
             rawName = rawName.replace(amountMatch[0], "").trim();
         }
         rawName = rawName.replace(/(rupees|rupaye|rs|please)/g, "").trim();
         
         if (rawName.length > 0) {
            recipient = rawName;
         }
      }
    }
    // Strategy C: Fallback if no "to" or "ko"
    else {
        // If we have a number, assume the rest is the name?
        // "pay raju 500"
        let tempName = lowerText.replace(amount, "").replace(/(pay|send|rupees|rupaye|rs|bhejo)/g, "").trim();
        if (tempName.length > 0 && tempName.length < 20) {
            recipient = tempName;
        }
    }

    // Capitalize recipient
    recipient = recipient.charAt(0).toUpperCase() + recipient.slice(1);

    // Generate Deep Link
    // upi://pay?pa=merchant@upi&pn=Raju&am=500&cu=INR
    // For demo, we assume a generic merchant VPA or use the name as part of it mockingly.
    // In real UPI, pa needs to be a valid VPA.
    // We will use a placeholder VPA for the hackathon demo unless specified.
    const vpa = "merchant@upi"; 
    const upiLink = `upi://pay?pa=${vpa}&pn=${recipient}&am=${amount}&cu=INR`;

    return NextResponse.json({
      intent,
      recipient,
      amount,
      upiLink,
      originalText: text
    });

  } catch (error) {
    console.error("Error processing text:", error);
    return NextResponse.json({ error: "Failed to process voice command" }, { status: 500 });
  }
}
