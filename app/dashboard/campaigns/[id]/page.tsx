import { getServerSession } from "next-auth/next";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { turso } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProspectUpload } from "./prospect-upload";
import { GenerateEmailsButton } from "./generate-emails-button";
import { 
  Users, 
  Mail, 
  MessageSquare, 
  Calendar,
  ArrowLeft,
  CheckCircle,
  Clock,
  Send
} from "lucide-react";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  status: string;
  target_audience?: string;
  created_at: string;
}

interface Prospect {
  id: string;
  email: string;
  name?: string;
  company?: string;
  title?: string;
  status: string;
  created_at: string;
}

interface GeneratedEmail {
  id: string;
  prospect_id: string;
  subject: string;
  personalized_body: string;
  generated_at: string;
  sent_at?: string;
}

async function getCampaign(campaignId: string, userId: string): Promise<Campaign | null> {
  try {
    const result = await turso.execute({
      sql: "SELECT * FROM campaigns WHERE id = ? AND user_id = ?",
      args: [campaignId, userId],
    });

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: String(row.id),
      name: String(row.name),
      status: String(row.status),
      target_audience: row.target_audience ? String(row.target_audience) : undefined,
      created_at: String(row.created_at),
    };
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return null;
  }
}

async function getProspects(campaignId: string): Promise<Prospect[]> {
  try {
    const result = await turso.execute({
      sql: `
        SELECT id, email, name, company, title, status, created_at 
        FROM prospects 
        WHERE campaign_id = ? 
        ORDER BY created_at DESC
      `,
      args: [campaignId],
    });

    return result.rows.map((row) => ({
      id: String(row.id),
      email: String(row.email),
      name: row.name ? String(row.name) : undefined,
      company: row.company ? String(row.company) : undefined,
      title: row.title ? String(row.title) : undefined,
      status: String(row.status),
      created_at: String(row.created_at),
    }));
  } catch (error) {
    console.error("Error fetching prospects:", error);
    return [];
  }
}

async function getGeneratedEmails(campaignId: string): Promise<GeneratedEmail[]> {
  try {
    const result = await turso.execute({
      sql: `
        SELECT e.id, e.prospect_id, e.subject, e.personalized_body, e.generated_at, e.sent_at
        FROM generated_emails e
        JOIN prospects p ON p.id = e.prospect_id
        WHERE p.campaign_id = ?
        ORDER BY e.generated_at DESC
      `,
      args: [campaignId],
    });

    return result.rows.map((row) => ({
      id: String(row.id),
      prospect_id: String(row.prospect_id),
      subject: String(row.subject),
      personalized_body: String(row.personalized_body),
      generated_at: String(row.generated_at),
      sent_at: row.sent_at ? String(row.sent_at) : undefined,
    }));
  } catch (error) {
    console.error("Error fetching emails:", error);
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

function getProspectStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    pending: "secondary",
    contacted: "default",
    responded: "default",
    unsubscribed: "outline",
  };
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3 mr-1" />,
    contacted: <Send className="w-3 h-3 mr-1" />,
    responded: <CheckCircle className="w-3 h-3 mr-1" />,
    unsubscribed: null,
  };
  return (
    <Badge variant={variants[status] || "secondary"} className="flex items-center">
      {icons[status]}
      {status}
    </Badge>
  );
}

export default async function CampaignDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const campaign = await getCampaign(id, session.user.id);

  if (!campaign) {
    notFound();
  }

  const prospects = await getProspects(id);
  const emails = await getGeneratedEmails(id);

  const stats = {
    prospects: prospects.length,
    emailsGenerated: emails.length,
    emailsSent: emails.filter(e => e.sent_at).length,
    responses: prospects.filter(p => p.status === "responded").length,
  };

  const pendingProspects = prospects.filter(p => p.status === "pending");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link href="/dashboard/campaigns" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              {getStatusBadge(campaign.status)}
              <span>Created {new Date(campaign.created_at).toLocaleDateString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospects</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prospects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Generated</CardTitle>
            <Mail className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailsGenerated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Send className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailsSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responses</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.responses}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="prospects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="emails">Generated Emails</TabsTrigger>
        </TabsList>

        <TabsContent value="prospects" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Prospects</h2>
            <div className="flex gap-2">
              {pendingProspects.length > 0 && (
                <GenerateEmailsButton campaignId={id} pendingCount={pendingProspects.length} />
              )}
              <ProspectUpload campaignId={id} />
            </div>
          </div>

          {prospects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No prospects yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload a CSV file with your prospect list
                </p>
                <ProspectUpload campaignId={id} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Company</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {prospects.map((prospect) => (
                        <tr key={prospect.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm">{prospect.name || "-"}</td>
                          <td className="px-4 py-3 text-sm">{prospect.email}</td>
                          <td className="px-4 py-3 text-sm">{prospect.company || "-"}</td>
                          <td className="px-4 py-3 text-sm">{prospect.title || "-"}</td>
                          <td className="px-4 py-3 text-sm">
                            {getProspectStatusBadge(prospect.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="emails" className="space-y-6">
          <h2 className="text-xl font-semibold">Generated Emails</h2>
          
          {emails.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No emails generated yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add prospects and generate personalized emails with AI
                </p>
                {prospects.length > 0 && (
                  <GenerateEmailsButton campaignId={id} pendingCount={pendingProspects.length} />
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {emails.map((email) => (
                <Card key={email.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{email.subject}</CardTitle>
                        <CardDescription>
                          Generated {new Date(email.generated_at).toLocaleString()}
                          {email.sent_at && (
                            <span className="ml-2 text-green-600">• Sent</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded text-sm whitespace-pre-wrap">
                      {email.personalized_body}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
