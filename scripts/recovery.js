const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TARGET_COMMIT = 'b8bad5aae8f2d3e7adf6b5dc8f70ca15b66da1c8';

function isAllowed(filePath) {
    // Skip .firebase directory
    if (filePath.startsWith('.firebase')) return false;

    // Skip mangled names (containing newlines or very long code-like parts)
    if (filePath.includes('\n')) return false;
    if (filePath.includes('\r')) return false;
    if (filePath.includes('tstsxsx')) return false;
    if (filePath.includes('language ===')) return false;

    // Skip files that look like junk binaries in text directories
    if (filePath.length > 200) return false;

    return true;
}

function run() {
    console.log(`Starting recovery from ${TARGET_COMMIT}...`);

    try {
        const output = execSync(`git ls-tree -r -z ${TARGET_COMMIT}`, { maxBuffer: 10 * 1024 * 1024 });
        // git ls-tree -r -z format: <mode> <type> <hash>\t<path>\0
        const entries = output.toString('binary').split('\0');

        let successCount = 0;
        let skippedCount = 0;

        for (const entry of entries) {
            if (!entry) continue;

            // Split by tab to get meta and path
            const tabIndex = entry.indexOf('\t');
            if (tabIndex === -1) continue;

            const meta = entry.substring(0, tabIndex);
            const filePath = entry.substring(tabIndex + 1);

            const [mode, type, hash] = meta.split(' ');

            if (type !== 'blob') continue;

            if (!isAllowed(filePath)) {
                console.log(`Skipping: ${filePath}`);
                skippedCount++;
                continue;
            }

            // Restore the file
            const absolutePath = path.join(process.cwd(), filePath);
            const parentDir = path.dirname(absolutePath);

            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            try {
                // Use cat-file to get content and write directly to file
                const content = execSync(`git cat-file -p ${hash}`, { maxBuffer: 50 * 1024 * 1024 });
                fs.writeFileSync(absolutePath, content);
                successCount++;
            } catch (err) {
                console.error(`Failed to restore ${filePath}: ${err.message}`);
                skippedCount++;
            }
        }

        console.log(`\nRecovery complete!`);
        console.log(`Restored: ${successCount} files`);
        console.log(`Skipped: ${skippedCount} items`);

    } catch (err) {
        console.error(`Recovery failed: ${err.message}`);
    }
}

run();
