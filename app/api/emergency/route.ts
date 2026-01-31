
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { lat, long } = await request.json();
    
    // In a real production app, we would use Twilio/AWS SNS here.
    // Example: await twilio.messages.create({ to: '+918866278406', body: ... })
    
    const mapLink = `https://maps.google.com/?q=${lat},${long}`;
    const message = `EMERGENCY ALERT! User needs help. Location: ${mapLink}`;
    
    console.log("--- SAFTEY ALERT ---");
    console.log("Sending SMS to: 8866278406");
    console.log("Message:", message);
    console.log("--------------------");

    // Simulating network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({ success: true, message: "SOS Alert Sent Successfully" });

  } catch (error) {
    console.error("Emergency API Error:", error);
    return NextResponse.json({ error: "Failed to send alert" }, { status: 500 });
  }
}
