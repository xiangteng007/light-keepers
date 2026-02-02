/**
 * PR-05: Legacy Guard Migration Script - Phase 2
 * 
 * Fixes remaining issues:
 * - @RequireLevel → @RequiredLevel
 * - Additional import patterns
 * 
 * Usage: node scripts/migrate-guards-phase2.js
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '../backend/src/modules');

const PATTERNS = [
    // Fix @RequireLevel → @RequiredLevel (case sensitive)
    {
        search: /@RequireLevel\(/g,
        replace: '@RequiredLevel('
    },
    // Import RequireLevel decorator replacement
    {
        search: /import\s*{\s*RequireLevel\s*}\s*from\s*['"]\.\.\/auth\/decorators\/require-level\.decorator['"]/g,
        replace: "// Decorator imported from ../shared/guards"
    },
    // Additional import patterns
    {
        search: /import\s*{\s*RolesGuard\s*}\s*from\s*['"]\.\.\/auth\/guards\/roles\.guard['"]/g,
        replace: "// RolesGuard replaced by UnifiedRolesGuard from ../shared/guards"
    },
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    for (const pattern of PATTERNS) {
        // Reset lastIndex for global regex
        pattern.search.lastIndex = 0;
        content = content.replace(pattern.search, pattern.replace);
    }
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
        return true;
    }
    return false;
}

function walkDir(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath, callback);
        } else if (file.endsWith('.controller.ts')) {
            callback(filePath);
        }
    }
}

// Run migration
console.log('🔐 PR-05: Legacy Guard Migration - Phase 2\n');
let count = 0;
walkDir(MODULES_DIR, (filePath) => {
    if (processFile(filePath)) {
        count++;
    }
});
console.log(`\n✨ Fixed ${count} files`);
