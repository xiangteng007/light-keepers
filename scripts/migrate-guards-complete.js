/**
 * PR-05: Complete Legacy Guard Migration Script
 * 
 * Handles all import patterns for JwtAuthGuard → CoreJwtGuard migration
 * 
 * Usage: node scripts/migrate-guards-complete.js
 */

const fs = require('fs');
const path = require('path');

const MODULES_DIR = path.join(__dirname, '../backend/src/modules');

// This function adds the correct import if CoreJwtGuard is used but not imported
function addSharedGuardsImport(content) {
    // Check if file uses CoreJwtGuard or RequiredLevel but doesn't import from shared/guards
    const usesNewGuards = content.includes('CoreJwtGuard') || content.includes('RequiredLevel');
    const hasSharedImport = content.includes("from '../shared/guards'") || content.includes('from "../shared/guards"');
    
    if (usesNewGuards && !hasSharedImport) {
        // Find a good place to add the import (after other imports)
        const importLine = "import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';";
        
        // Try to add after API imports
        if (content.includes("from '@nestjs/swagger'")) {
            content = content.replace(
                /(import\s*{[^}]+}\s*from\s*['"]@nestjs\/swagger['"];?\r?\n)/,
                `$1${importLine}\n`
            );
        } else if (content.includes("from '@nestjs/common'")) {
            // Add after @nestjs/common import
            content = content.replace(
                /(import\s*{[^}]+}\s*from\s*['"]@nestjs\/common['"];?\r?\n)/,
                `$1${importLine}\n`
            );
        }
    }
    return content;
}

// Remove old guard imports
function removeOldImports(content) {
    // Remove JwtAuthGuard import lines
    content = content.replace(/import\s*{[^}]*JwtAuthGuard[^}]*}\s*from\s*['"][^'"]+['"];?\r?\n?/g, '');
    // Remove MinLevel import from roles.guard
    content = content.replace(/import\s*{[^}]*MinLevel[^}]*}\s*from\s*['"][^'"]*roles\.guard['"];?\r?\n?/g, '');
    // Remove RolesGuard import
    content = content.replace(/import\s*{\s*RolesGuard\s*}\s*from\s*['"][^'"]+['"];?\r?\n?/g, '');
    // Remove RequireLevel decorator import
    content = content.replace(/import\s*{[^}]*RequireLevel[^}]*}\s*from\s*['"][^'"]*require-level\.decorator['"];?\r?\n?/g, '');
    
    return content;
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Step 1: Replace @UseGuards patterns
    content = content.replace(/@UseGuards\(JwtAuthGuard,\s*RolesGuard\)/g, '@UseGuards(CoreJwtGuard, UnifiedRolesGuard)');
    content = content.replace(/@UseGuards\(JwtAuthGuard\)/g, '@UseGuards(CoreJwtGuard, UnifiedRolesGuard)');
    
    // Step 2: Replace decorator patterns
    content = content.replace(/@MinLevel\(/g, '@RequiredLevel(');
    content = content.replace(/@RequireLevel\(/g, '@RequiredLevel(');
    
    // Step 3: Remove old imports
    content = removeOldImports(content);
    
    // Step 4: Add new imports if needed
    content = addSharedGuardsImport(content);
    
    // Step 5: Clean up empty lines from removed imports
    content = content.replace(/\n{3,}/g, '\n\n');
    
    if (content !== originalContent) {
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
console.log('🔐 PR-05: Complete Legacy Guard Migration\n');
let count = 0;
walkDir(MODULES_DIR, (filePath) => {
    if (processFile(filePath)) {
        count++;
    }
});
console.log(`\n✨ Migrated ${count} files`);
