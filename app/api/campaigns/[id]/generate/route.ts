import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { turso } from "@/lib/db";
import { randomUUID } from "crypto";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

interface Prospect {
  id: string;
  email: string;
  name?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
}

interface Campaign {
  target_audience?: string;
}

async function verifyCampaignOwnership(campaignId: string, userId: string): Promise<boolean> {
  try {
    const result = await turso.execute({
      sql: "SELECT id FROM campaigns WHERE id = ? AND user_id = ?",
      args: [campaignId, userId],
    });
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error verifying campaign ownership:", error);
    return false;
  }
}

async function getCampaign(campaignId: string): Promise<Campaign | null> {
  try {
    const result = await turso.execute({
      sql: "SELECT target_audience FROM campaigns WHERE id = ?",
      args: [campaignId],
    });
    if (result.rows.length === 0) return null;
    return {
      target_audience: result.rows[0].target_audience 
        ? String(result.rows[0].target_audience) 
        : undefined,
    };
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return null;
  }
}

async function getPendingProspects(campaignId: string): Promise<Prospect[]> {
  try {
    const result = await turso.execute({
      sql: `
        SELECT p.id, p.email, p.name, p.company, p.title, p.linkedin_url
        FROM prospects p
        LEFT JOIN generated_emails e ON e.prospect_id = p.id
        WHERE p.campaign_id = ? AND p.status = 'pending' AND e.id IS NULL
        LIMIT 50
      `,
      args: [campaignId],
    });

    return result.rows.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      name: row.name ? String(row.name) : undefined,
      company: row.company ? String(row.company) : undefined,
      title: row.title ? String(row.title) : undefined,
      linkedin_url: row.linkedin_url ? String(row.linkedin_url) : undefined,
    }));
  } catch (error) {
    console.error("Error fetching pending prospects:", error);
    return [];
  }
}

async function generateEmail(prospect: Prospect, targetAudience?: string): Promise<{ subject: string; body: string } | null> {
  try {
    const prompt = `You are an expert cold email copywriter. Write a personalized cold email for the following prospect:

Prospect Information:
- Name: ${prospect.name || "Not provided"}
- Email: ${prospect.email}
- Company: ${prospect.company || "Not provided"}
- Title: ${prospect.title || "Not provided"}
${targetAudience ? `\nTarget Audience Context: ${targetAudience}` : ""}

Requirements:
1. Write a concise, professional cold email (max 150 words)
2. Personalize it based on their company and role
3. Use a friendly but professional tone
4. Include a clear, soft call-to-action
5. Do not use generic phrases like "I hope this email finds you well"
6. Make it feel like genuine 1:1 outreach, not mass email

Return your response in this exact format:
SUBJECT: [email subject line]

[email body]
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert cold email copywriter who writes personalized, high-converting cold emails.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    // Parse the response
    const lines = content.trim().split("\n");
    let subject = "";
    let bodyStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toUpperCase().startsWith("SUBJECT:")) {
        subject = lines[i].substring(8).trim();
        bodyStartIndex = i + 1;
        break;
      }
    }

    // If no subject line found, use first line as subject
    if (!subject && lines.length > 0) {
      subject = lines[0].trim();
      bodyStartIndex = 1;
    }

    // Get body (skip empty lines at start)
    const body = lines
      .slice(bodyStartIndex)
      .join("\n")
      .trim();

    return { subject, body };
  } catch (error) {
    console.error("Error generating email for prospect:", prospect.id, error);
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    // Verify campaign ownership
    const hasAccess = await verifyCampaignOwnership(campaignId, session.user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Get campaign details for context
    const campaign = await getCampaign(campaignId);

    // Get pending prospects without emails
    const prospects = await getPendingProspects(campaignId);

    if (prospects.length === 0) {
      return NextResponse.json(
        { error: "No pending prospects found without existing emails" },
        { status: 400 }
      );
    }

    let generated = 0;
    const errors: string[] = [];
    const now = new Date().toISOString();

    // Generate emails for each prospect
    for (const prospect of prospects) {
      const emailContent = await generateEmail(prospect, campaign?.target_audience);

      if (!emailContent) {
        errors.push(`Failed to generate email for ${prospect.email}`);
        continue;
      }

      try {
        const emailId = randomUUID();
        await turso.execute({
          sql: `
            INSERT INTO generated_emails (id, prospect_id, subject, body, personalized_body, ai_model, generated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            emailId,
            prospect.id,
            emailContent.subject,
            emailContent.body,
            emailContent.body, // Using body as personalized_body since it's already personalized
            "gpt-4o-mini",
            now,
          ],
        });
        generated++;
      } catch (error: any) {
        errors.push(`Failed to save email for ${prospect.email}: ${error.message}`);
      }
    }

    return NextResponse.json({
      generated,
      total: prospects.length,
      errors: errors.slice(0, 5),
      errorCount: errors.length,
    });
  } catch (error) {
    console.error("Error generating emails:", error);
    return NextResponse.json(
      { error: "Failed to generate emails" },
      { status: 500 }
    );
  }
}
