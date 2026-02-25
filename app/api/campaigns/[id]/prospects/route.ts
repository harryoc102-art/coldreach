import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { turso } from "@/lib/db";
import { randomUUID } from "crypto";
import Papa from "papaparse";

interface ProspectRow {
  email: string;
  name?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
}

interface ParseResult {
  imported: number;
  total: number;
  errors: string[];
  errorCount: number;
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

function parseCSV(fileContent: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<ProspectRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const errors: string[] = [];
        
        // Validate required fields
        if (results.data.length === 0) {
          reject(new Error("CSV file is empty"));
          return;
        }

        const firstRow = results.data[0];
        if (!firstRow.email) {
          reject(new Error("CSV must have an 'email' column"));
          return;
        }

        resolve({
          imported: 0,
          total: results.data.length,
          errors,
          errorCount: 0,
          data: results.data,
        } as ParseResult & { data: ProspectRow[] });
      },
      error: (error: { message: string }) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 }
      );
    }

    // Read and parse CSV
    const fileContent = await file.text();
    
    let parseResult: ParseResult & { data: ProspectRow[] };
    try {
      parseResult = await parseCSV(fileContent) as ParseResult & { data: ProspectRow[] };
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    let imported = 0;
    const now = new Date().toISOString();
    
    // Process each row
    for (let i = 0; i < parseResult.data.length; i++) {
      const row = parseResult.data[i];
      
      // Validate email
      if (!row.email || !row.email.includes("@")) {
        errors.push(`Row ${i + 2}: Invalid or missing email`);
        continue;
      }

      try {
        const prospectId = randomUUID();
        await turso.execute({
          sql: `
            INSERT INTO prospects (id, campaign_id, email, name, company, title, linkedin_url, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            prospectId,
            campaignId,
            row.email.toLowerCase().trim(),
            row.name || null,
            row.company || null,
            row.title || null,
            row.linkedin_url || null,
            "pending",
            now,
          ],
        });
        imported++;
      } catch (error: any) {
        if (error.message?.includes("UNIQUE constraint failed")) {
          errors.push(`Row ${i + 2}: Email already exists in this campaign`);
        } else {
          errors.push(`Row ${i + 2}: ${error.message || "Database error"}`);
        }
      }
    }

    return NextResponse.json({
      imported,
      total: parseResult.total,
      errors: errors.slice(0, 10), // Limit errors returned
      errorCount: errors.length,
    });
  } catch (error) {
    console.error("Error uploading prospects:", error);
    return NextResponse.json(
      { error: "Failed to upload prospects" },
      { status: 500 }
    );
  }
}
