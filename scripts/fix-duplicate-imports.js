/**
 * PR-05: Fix Duplicate Imports
 * 
 * Some files have duplicate imports from '../shared/guards'
 * This script consolidates them into a single import
 * 
 * Usage: node scripts/fix-duplicate-imports.js
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '../backend/src/modules');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Find all lines importing from shared/guards
    const lines = content.split('\n');
    const sharedGuardsImports = [];
    const otherLines = [];
    let insertPosition = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("from '../shared/guards'") || line.includes('from "../shared/guards"')) {
            if (insertPosition === -1) {
                insertPosition = i;
            }
            // Extract the imported items
            const match = line.match(/import\s*{([^}]+)}/);
            if (match) {
                const items = match[1].split(',').map(s => s.trim()).filter(s => s);
                sharedGuardsImports.push(...items);
            }
        } else {
            otherLines.push(line);
        }
    }
    
    // If we found multiple imports, consolidate them
    if (sharedGuardsImports.length > 0) {
        // Deduplicate
        const uniqueImports = [...new Set(sharedGuardsImports)];
        const newImportLine = `import { ${uniqueImports.join(', ')} } from '../shared/guards';`;
        
        // Insert at the right position
        otherLines.splice(insertPosition, 0, newImportLine);
        content = otherLines.join('\n');
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

// Run fix
console.log('🔐 PR-05: Fix Duplicate Imports\n');
let count = 0;
walkDir(MODULES_DIR, (filePath) => {
    if (processFile(filePath)) {
        count++;
    }
});
console.log(`\n✨ Fixed ${count} files`);
