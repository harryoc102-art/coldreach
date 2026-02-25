import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { turso } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Users, Mail, Calendar } from "lucide-react";

interface CampaignWithStats {
  id: string;
  name: string;
  status: string;
  created_at: string;
  prospect_count: number;
  email_count: number;
}

async function getCampaigns(userId: string, userEmail?: string | null): Promise<CampaignWithStats[]> {
  try {
    console.log("Fetching campaigns for userId:", userId, "email:", userEmail);
    
    // Try to find user by email if ID doesn't match
    let effectiveUserId = userId;
    if (userEmail) {
      const userResult = await turso.execute({
        sql: "SELECT id FROM users WHERE email = ?",
        args: [userEmail],
      });
      if (userResult.rows.length > 0) {
        effectiveUserId = String(userResult.rows[0].id);
        console.log("Found user by email, using ID:", effectiveUserId);
      }
    }
    
    // Simple query without JOINs first to verify basic access
    const simpleResult = await turso.execute({
      sql: "SELECT id, name, status, created_at FROM campaigns WHERE user_id = ? ORDER BY created_at DESC",
      args: [effectiveUserId],
    });
    console.log("Simple query found:", simpleResult.rows.length, "campaigns");
    
    // Now get counts separately for each campaign
    const campaignsWithStats = await Promise.all(
      simpleResult.rows.map(async (row) => {
        const campaignId = String(row.id);
        
        const prospectResult = await turso.execute({
          sql: "SELECT COUNT(*) as count FROM prospects WHERE campaign_id = ?",
          args: [campaignId],
        });
        
        const emailResult = await turso.execute({
          sql: `SELECT COUNT(*) as count FROM generated_emails e 
                JOIN prospects p ON e.prospect_id = p.id 
                WHERE p.campaign_id = ?`,
          args: [campaignId],
        });
        
        return {
          id: campaignId,
          name: String(row.name),
          status: String(row.status),
          created_at: String(row.created_at),
          prospect_count: Number(prospectResult.rows[0]?.count || 0),
          email_count: Number(emailResult.rows[0]?.count || 0),
        };
      })
    );
    
    console.log("Campaigns with stats:", campaignsWithStats.length);
    return campaignsWithStats;
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return [];
  }
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    draft: "secondary",
    active: "default",
    paused: "outline",
    completed: "outline",
  };
  return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
}

export default async function CampaignsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  console.log("[CAMPAIGNS PAGE] Session user ID:", session.user.id);
  console.log("[CAMPAIGNS PAGE] Session user email:", session.user.email);
  
  const campaigns = await getCampaigns(session.user.id, session.user.email);
  console.log("[CAMPAIGNS PAGE] Found campaigns:", campaigns.length);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage your cold outreach campaigns
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first campaign to start reaching out to prospects
              </p>
              <Link href="/dashboard/campaigns/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg truncate">{campaign.name}</CardTitle>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <CardDescription>
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{campaign.prospect_count} prospects</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span>{campaign.email_count} emails</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
