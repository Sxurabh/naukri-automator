import { runNaukriAutomation, AppSettings } from '../src/app/lib/naukriAutomator';

const SECTIONS = [
  "Recommended jobs",
  "Jobs based on your profile", 
  "Jobs where you are a top applicant"
];

// Simple logger for the cloud console
const log = (msg: string) => console.log(`[CLOUD]: ${msg}`);

async function main() {
  const cookie = process.env.NAUKRI_COOKIE;
  
  if (!cookie) {
    console.error("❌ ERROR: NAUKRI_COOKIE not found.");
    process.exit(1);
  }

  const settings: AppSettings = {
    jobsPerMission: 10, // Applies to 10 jobs per section (30 total)
    stealthMode: true
  };

  log("🚀 Starting Daily Cloud Automation...");

  for (const section of SECTIONS) {
    try {
      log(`\n--- Processing Section: ${section} ---`);
      
      // We pass an empty array for appliedJobIds. 
      // The script will rely on checking if the checkbox is visible/clickable.
      await runNaukriAutomation({
        cookie,
        section,
        log,
        appliedJobIds: [], 
        settings
      });

      log(`✅ Completed ${section}.`);
      
      // Small pause between sections to look natural
      await new Promise(r => setTimeout(r, 5000));

    } catch (error: any) {
      // If one section fails (e.g., "Top applicant" tab doesn't exist), we log it and continue to the next
      console.error(`⚠️ Could not process '${section}':`, error.message);
    }
  }

  log("\n🎉 All sections processed. Exiting.");
}

main();