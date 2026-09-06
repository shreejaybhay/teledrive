import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import User from "@/models/User";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) {
      return NextResponse.json({ error: "Missing telegramId" }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ telegramId });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { telegramId, storageChannelId } = await request.json();

    if (!telegramId || !storageChannelId) {
      return NextResponse.json({ error: "Missing telegramId or storageChannelId" }, { status: 400 });
    }

    await connectToDatabase();
    
    // Upsert the user configuration
    const user = await User.findOneAndUpdate(
      { telegramId },
      { storageChannelId },
      { new: true, upsert: true }
    );

    return NextResponse.json({ user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
