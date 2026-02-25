import { turso } from "./lib/db";

async function initDatabase() {
  console.log("Initializing database...");

  try {
    // Create campaigns table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'draft',
        target_audience TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✓ campaigns table created");

    // Create prospects table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS prospects (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        email TEXT NOT NULL,
        name TEXT,
        company TEXT,
        title TEXT,
        linkedin_url TEXT,
        status TEXT DEFAULT 'pending',
        personalization_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        UNIQUE(campaign_id, email)
      )
    `);
    console.log("✓ prospects table created");

    // Create generated_emails table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS generated_emails (
        id TEXT PRIMARY KEY,
        prospect_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        personalized_body TEXT NOT NULL,
        ai_model TEXT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        sent_at DATETIME,
        FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
      )
    `);
    console.log("✓ generated_emails table created");

    console.log("\nDatabase initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

initDatabase();
