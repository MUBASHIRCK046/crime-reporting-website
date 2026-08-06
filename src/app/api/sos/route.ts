import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, lat, lng } = body;

    if (!userId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // MOCK SMS INTEGRATION
    // In a real application, you would use Twilio or a similar service here.
    // e.g. await twilioClient.messages.create({ body: 'SOS ALERT', to: '+1234567890', from: '+0987654321' });
    
    console.log("=========================================");
    console.log("🚨 MOCK SMS ALERT SENT 🚨");
    console.log(`User ID: ${userId}`);
    console.log(`Location: https://www.google.com/maps?q=${lat},${lng}`);
    console.log("=========================================");

    return NextResponse.json({ success: true, message: "SMS Alert dispatched successfully." });
  } catch (error) {
    console.error("API Error (SOS):", error);
    return NextResponse.json({ error: "Failed to dispatch SOS alert." }, { status: 500 });
  }
}
