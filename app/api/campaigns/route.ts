import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { turso } from "@/lib/db";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, targetAudience } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Campaign name is required" },
        { status: 400 }
      );
    }

    const campaignId = randomUUID();
    const now = new Date().toISOString();

    await turso.execute({
      sql: `
        INSERT INTO campaigns (id, user_id, name, status, target_audience, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        campaignId,
        session.user.id,
        name.trim(),
        "draft",
        targetAudience || null,
        now,
        now,
      ],
    });

    return NextResponse.json({
      id: campaignId,
      name: name.trim(),
      status: "draft",
      target_audience: targetAudience || null,
      created_at: now,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
