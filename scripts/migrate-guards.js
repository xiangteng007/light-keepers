/**
 * PR-05: Legacy Guard Migration Script
 * 
 * Migrates JwtAuthGuard → CoreJwtGuard across all controllers
 * 
 * Usage: node scripts/migrate-guards.js
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '../backend/src/modules');

const PATTERNS = [
    // Import patterns to replace
    {
        // JwtAuthGuard from auth guards
        search: /import\s*{\s*JwtAuthGuard\s*}\s*from\s*['"]\.\.\/auth\/guards\/jwt-auth\.guard['"]/g,
        replace: "import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards'"
    },
    {
        // JwtAuthGuard, RolesGuard from auth guards
        search: /import\s*{\s*JwtAuthGuard,\s*RolesGuard,\s*MinLevel\s*}\s*from\s*['"]\.\.\/auth\/guards['"]/g,
        replace: "import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards'"
    },
    {
        // JwtAuthGuard usage
        search: /@UseGuards\(JwtAuthGuard\)/g,
        replace: '@UseGuards(CoreJwtGuard, UnifiedRolesGuard)'
    },
    {
        // JwtAuthGuard + RolesGuard usage
        search: /@UseGuards\(JwtAuthGuard,\s*RolesGuard\)/g,
        replace: '@UseGuards(CoreJwtGuard, UnifiedRolesGuard)'
    },
    {
        // MinLevel decorator → RequiredLevel
        search: /@MinLevel\(/g,
        replace: '@RequiredLevel('
    }
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const pattern of PATTERNS) {
        if (pattern.search.test(content)) {
            content = content.replace(pattern.search, pattern.replace);
            modified = true;
        }
    }
    
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Migrated: ${path.relative(process.cwd(), filePath)}`);
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
console.log('🔐 PR-05: Legacy Guard Migration\n');
let count = 0;
walkDir(MODULES_DIR, (filePath) => {
    if (processFile(filePath)) {
        count++;
    }
});
console.log(`\n✨ Migrated ${count} files`);
