/**
 * PR-05: Fix Guard Import Paths
 * 
 * Fixes import paths like:
 * '../shared/guards/unified-roles.guard' → '../shared/guards'
 * '../shared/guards/core-jwt.guard' → '../shared/guards'
 * 
 * Usage: node scripts/fix-guard-imports.js
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '../backend/src/modules');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Fix direct imports from guard files to use barrel export
    content = content.replace(
        /from\s*['"]\.\.\/shared\/guards\/unified-roles\.guard['"]/g,
        "from '../shared/guards'"
    );
    content = content.replace(
        /from\s*['"]\.\.\/shared\/guards\/core-jwt\.guard['"]/g,
        "from '../shared/guards'"
    );
    
    // Consolidate multiple imports from shared/guards into one
    // This is a simple approach - just leave them be for now, NestJS will handle duplicates
    
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

// Run fix
console.log('🔐 PR-05: Fix Guard Import Paths\n');
let count = 0;
walkDir(MODULES_DIR, (filePath) => {
    if (processFile(filePath)) {
        count++;
    }
});
console.log(`\n✨ Fixed ${count} files`);
