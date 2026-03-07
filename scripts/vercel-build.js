const fs = require('fs');
const path = require('path');

// Only run this cleanup script if we're on Vercel
if (process.env.VERCEL) {
    console.log('🚀 Vercel environment detected.');
    console.log('🧹 Removing non-landing page directories to speed up build and avoid deployment errors...');

    const dirsToRemove = [
        'src/app/dashboard',
        'src/app/api',
        'src/app/views',
        'src/naukriAutomator',
        'src/lib',
        'src/components'
    ];

    dirsToRemove.forEach(dir => {
        const fullPath = path.join(process.cwd(), dir);
        if (fs.existsSync(fullPath)) {
            console.log(`Removing ${fullPath}`);
            fs.rmSync(fullPath, { recursive: true, force: true });
        }
    });

    console.log('✅ Cleanup complete. Proceeding with Next.js build...');
} else {
    console.log('💻 Local environment detected. Skipping cleanup.');
}
