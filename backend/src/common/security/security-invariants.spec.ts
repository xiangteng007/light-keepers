/**
 * 安全不變量（回歸守衛）
 *
 * 這支 spec 不測任何單一模組的行為，而是把「P0 已經修好、不准再壞回去」的三件事
 * 釘成 CI 阻擋式檢查。它掃描 `src/` 的原始碼，所以不需要啟動 Nest 或連 DB，
 * 已經被既有的 `npm test` 涵蓋（ci-cd.yml 的 backend job 是阻擋式）。
 *
 * 守衛的三件事：
 *  1. authz 定級覆蓋率：掛了 UnifiedRolesGuard 的端點必須有 @RequiredLevel /
 *     @RequiredRoles / @Public。因為 UnifiedRolesGuard 沒有 metadata 時是 **fail-open**
 *     （見 unified-roles.guard.ts），漏標＝該端點只剩「已登入」保護。
 *  2. `@Body() x: any`：全域 ValidationPipe 對 `any` 型別無從驗證，等於沒有輸入驗證。
 *  3. 已外洩的硬編碼密鑰字串：只允許出現在 jwt.config.ts 的「已知外洩清單」常數裡，
 *     不得再被當成任何 fallback 值使用。
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, posix, relative, sep } from 'path';

/** `src/` 目錄（本檔位於 src/common/security/） */
const SRC_ROOT = join(__dirname, '..', '..');

const IGNORED_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git']);

function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (IGNORED_DIRS.has(entry)) continue;
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            walk(full, acc);
        } else if (full.endsWith('.ts')) {
            acc.push(full);
        }
    }
    return acc;
}

function toRepoPath(absolute: string): string {
    return relative(SRC_ROOT, absolute).split(sep).join(posix.sep);
}

/**
 * 移除註解（保留行號），避免把 JSDoc 範例或被註解掉的裝飾器誤判為真的裝飾器。
 *
 * 必須是 string-aware 的：路由字串裡真的會出現 `/*`，
 * 例如 `@Get('download/*filepath')`。用純 regex 會從那裡一路吃掉後面的程式碼。
 */
function stripComments(source: string): string {
    let out = '';
    let i = 0;
    let quote: string | null = null;
    let inLineComment = false;
    let inBlockComment = false;

    while (i < source.length) {
        const ch = source[i];
        const next = source[i + 1];

        if (inLineComment) {
            if (ch === '\n') { inLineComment = false; out += ch; } else { out += ' '; }
            i++;
            continue;
        }
        if (inBlockComment) {
            if (ch === '*' && next === '/') { inBlockComment = false; out += '  '; i += 2; continue; }
            out += ch === '\n' ? ch : ' ';
            i++;
            continue;
        }
        if (quote) {
            out += ch;
            if (ch === '\\') { out += next ?? ''; i += 2; continue; }
            if (ch === quote) quote = null;
            i++;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') { quote = ch; out += ch; i++; continue; }
        if (ch === '/' && next === '/') { inLineComment = true; out += '  '; i += 2; continue; }
        if (ch === '/' && next === '*') { inBlockComment = true; out += '  '; i += 2; continue; }

        out += ch;
        i++;
    }

    return out;
}

const ALL_TS_FILES = walk(SRC_ROOT);
const CONTROLLER_FILES = ALL_TS_FILES.filter(
    (f) => f.endsWith('.controller.ts') && !f.endsWith('.spec.ts'),
);

const ROUTE_DECORATOR = /^\s*@(Get|Post|Put|Patch|Delete|Head|Options|All)\s*\(/;
const AUTHZ_MARKER = /@(RequiredLevel|RequiredRoles|Roles|MinRoleLevel|Public)\s*\(/;
const ROLES_GUARD = /UnifiedRolesGuard|RolesGuard/;

/** 一行的括號淨值（用來把多行裝飾器當成一個整體） */
function parenBalance(line: string): number {
    let balance = 0;
    for (const ch of line) {
        if (ch === '(' || ch === '{' || ch === '[') balance++;
        if (ch === ')' || ch === '}' || ch === ']') balance--;
    }
    return balance;
}

/**
 * 取得某個路由裝飾器所屬的「裝飾器串」行號集合。
 *
 * 往上走：連續的裝飾器行（含多行裝飾器，靠括號淨值判斷是否還在同一個裝飾器內）。
 * 往下走：同上，直到遇到方法簽章。
 */
function decoratorRun(lines: string[], routeLine: number, skippable: Set<number> = new Set()): number[] {
    const run = [routeLine];

    let i = routeLine - 1;
    let pending = 0;
    while (i >= 0) {
        const line = lines[i];
        const trimmed = line.trim();
        // 被清成空白的註解行不算「中斷」——裝飾器之間夾註解是本 repo 的常見寫法
        if (skippable.has(i)) { i--; continue; }
        if (trimmed === '') break;
        if (pending < 0) {
            // 還在某個多行裝飾器的內部，繼續往上找它的起始行
            pending += parenBalance(line);
            run.push(i);
            i--;
            continue;
        }
        if (trimmed.startsWith('@')) {
            run.push(i);
            i--;
            continue;
        }
        const balance = parenBalance(line);
        if (balance < 0) {
            pending = balance;
            run.push(i);
            i--;
            continue;
        }
        break;
    }

    let j = routeLine + 1;
    while (j < lines.length) {
        if (skippable.has(j)) { j++; continue; }
        const trimmed = lines[j].trim();
        if (!trimmed.startsWith('@')) break;
        run.push(j);
        // 跳過多行裝飾器的其餘部分
        let balance = parenBalance(lines[j]);
        while (balance > 0 && j + 1 < lines.length) {
            j++;
            balance += parenBalance(lines[j]);
            run.push(j);
        }
        j++;
    }

    return run;
}

interface UnmarkedHandler {
    file: string;
    line: number;
    route: string;
}

function findUnmarkedHandlers(source: string, repoPath: string): UnmarkedHandler[] {
    const clean = stripComments(source);
    if (!ROLES_GUARD.test(clean)) return [];

    const lines = clean.split('\n');
    const originalLines = source.split('\n');
    /** 原本是註解、被 stripComments 清成空白的行 */
    const skippable = new Set<number>();
    lines.forEach((line, index) => {
        if (line.trim() === '' && (originalLines[index] ?? '').trim() !== '') skippable.add(index);
    });

    // 類別層級的定級涵蓋所有 handler。
    // 注意：不能用「第一個 class 宣告之前的內容」判斷——不少 controller 檔案在
    // controller 類別之前先宣告了 DTO class（例如 routing.controller.ts），
    // 那樣會把類別裝飾器整段漏掉。改為直接看 @Controller() 所在的裝飾器串。
    const controllerLine = lines.findIndex((l) => /^\s*@Controller\s*\(/.test(l));
    if (controllerLine >= 0) {
        const classRun = decoratorRun(lines, controllerLine, skippable);
        if (classRun.some((i) => AUTHZ_MARKER.test(lines[i]))) return [];
    }

    const unmarked: UnmarkedHandler[] = [];
    lines.forEach((line, index) => {
        if (!ROUTE_DECORATOR.test(line)) return;
        const covered = decoratorRun(lines, index, skippable).some((i) => AUTHZ_MARKER.test(lines[i]));
        if (!covered) {
            unmarked.push({ file: repoPath, line: index + 1, route: line.trim() });
        }
    });
    return unmarked;
}

/**
 * 已知未定級、且「暫時不在本次範圍內」的檔案（棘輪基準線）。
 *
 * 這裡不是赦免，是把技術債固定住：允許的數量只能持平或下降，任何新增一律擋下。
 * 沿用 ci-cd.yml 的 LINT_ERROR_BASELINE 同一套棘輪思路。
 */
const AUTHZ_BASELINE: Record<string, { count: number; reason: string }> = {
    'modules/auth/auth.controller.ts': {
        count: 34,
        reason:
            'auth 的登入/註冊/OTP/綁定端點語意上需要 @Public()＋public-surface 政策條目，' +
            '不是補 @RequiredLevel 能解的；檔頭已記錄此決定（工作項 1.5），需 owner 拍板公開介面清單。',
    },
    'modules/auth/auth-oauth.controller.ts': {
        count: 4,
        reason: '同上：LINE/Google 綁定與解綁端點的公開介面定義待 public-surface 政策一併處理。',
    },
};

/**
 * 行內型別 `@Body() body: { ... }` 的偵測。
 *
 * 為什麼這是安全問題：全域 ValidationPipe 只有在參數型別是「類別」時才會執行。
 * TypeScript 的行內物件型別編譯後不留下 metatype，Nest 拿不到可驗證的型別，
 * 於是整個 whitelist / forbidNonWhitelisted / 型別檢查全部靜默跳過——
 * 端點看起來有驗證，實際上什麼都沒驗。
 */
function countInlineBodies(source: string): number {
    const clean = stripComments(source);
    // @Body() 或 @Body('key')，接參數名，接 `: {`（可能換行後才是 `{`）
    const inlineBody = /@Body\(\s*(?:'[^']*'|"[^"]*")?\s*\)\s*[A-Za-z_$][\w$]*\s*[?!]?\s*:\s*\{/g;
    return (clean.match(inlineBody) ?? []).length;
}

/**
 * 已經完成 DTO 化、必須維持 0 的 controller。
 * 這些是 P0 判定的高風險面：作戰情資、派遣、簽到座標、心理健康特種個資。
 */
const INLINE_BODY_PROTECTED = new Set([
    'modules/mission-sessions/sitrep.controller.ts',
    'modules/mission-sessions/iap.controller.ts',
    'modules/mission-sessions/aar.controller.ts',
    'modules/overlays/map-dispatch.controller.ts',
    'modules/psychological-support/mood-tracker.controller.ts',
    'modules/task-dispatch/task-dispatch.controller.ts',
    'modules/auth/auth.controller.ts',
    'modules/auth/two-factor.controller.ts',
]);

/**
 * 其餘尚未 DTO 化的端點總數（棘輪基準線）。
 * 2026-08-02 實測值。剩下的建議照「碰個資／碰錢／碰指揮權」分批補，屬 P0 之後。
 */
const INLINE_BODY_BASELINE = 111;

describe('安全不變量（P0 回歸守衛）', () => {
    describe('authz 定級覆蓋率', () => {
        it('掛了角色 Guard 的端點都必須宣告 @RequiredLevel / @RequiredRoles / @Public', () => {
            const unmarked = CONTROLLER_FILES.flatMap((file) =>
                findUnmarkedHandlers(readFileSync(file, 'utf8'), toRepoPath(file)),
            );

            const byFile = new Map<string, UnmarkedHandler[]>();
            for (const item of unmarked) {
                byFile.set(item.file, [...(byFile.get(item.file) ?? []), item]);
            }

            const violations: string[] = [];
            for (const [file, items] of byFile) {
                const baseline = AUTHZ_BASELINE[file];
                if (!baseline) {
                    violations.push(
                        `${file} 有 ${items.length} 個端點沒有授權標記：\n` +
                        items.map((i) => `    ${i.file}:${i.line} ${i.route}`).join('\n'),
                    );
                    continue;
                }
                if (items.length > baseline.count) {
                    violations.push(
                        `${file} 未定級端點從基準線 ${baseline.count} 增加到 ${items.length}，不得再新增。`,
                    );
                }
            }

            expect(
                violations.length === 0
                    ? ''
                    : `UnifiedRolesGuard 對未標記的端點是 fail-open（只剩「已登入」保護）：\n${violations.join('\n')}`,
            ).toBe('');
        });

        it('基準線只能下降：已修好的檔案不得留在基準線裡', () => {
            const unmarked = CONTROLLER_FILES.flatMap((file) =>
                findUnmarkedHandlers(readFileSync(file, 'utf8'), toRepoPath(file)),
            );
            const stale = Object.entries(AUTHZ_BASELINE)
                .map(([file, { count }]) => {
                    const actual = unmarked.filter((u) => u.file === file).length;
                    return actual < count ? `  ${file}：實際 ${actual} < 基準線 ${count}，請調降基準線鎖住成果` : '';
                })
                .filter(Boolean);

            expect(stale.join('\n')).toBe('');
        });

        it('掃描器本身要能抓出漏標的端點（負向測試）', () => {
            const bad = `
                import { UnifiedRolesGuard } from '../shared/guards';

                @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
                @Controller('demo')
                export class DemoController {
                    @Get('secret')
                    @ApiOperation({ summary: 'x' })
                    async secret() { return 1; }
                }
            `;
            expect(findUnmarkedHandlers(bad, 'demo.controller.ts')).toHaveLength(1);
        });

        it('掃描器要接受方法層級與類別層級兩種標法（負向測試的對照組）', () => {
            const methodLevel = `
                @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
                @Controller('demo')
                export class DemoController {
                    @Get('secret')
                    @RequiredLevel(ROLE_LEVELS.OFFICER)
                    async secret() { return 1; }

                    @ApiBody({
                        schema: { type: 'object' },
                    })
                    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
                    @Post('other')
                    async other() { return 2; }
                }
            `;
            const classLevel = `
                @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
                @RequiredLevel(ROLE_LEVELS.OFFICER)
                @Controller('demo')
                export class DemoController {
                    @Get('secret')
                    async secret() { return 1; }
                }
            `;
            expect(findUnmarkedHandlers(methodLevel, 'a.controller.ts')).toHaveLength(0);
            expect(findUnmarkedHandlers(classLevel, 'b.controller.ts')).toHaveLength(0);
        });
    });

    describe('輸入驗證', () => {
        it('controller 不得再出現 `@Body() x: any`（ValidationPipe 對 any 無效）', () => {
            const offenders: string[] = [];
            const bodyAny = /@Body\(\s*(?:'[^']*'|"[^"]*")?\s*\)\s*[A-Za-z_$][\w$]*\s*[?!]?\s*:\s*any\b/;

            for (const file of CONTROLLER_FILES) {
                const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
                lines.forEach((line, index) => {
                    if (bodyAny.test(line)) {
                        offenders.push(`  ${toRepoPath(file)}:${index + 1} ${line.trim()}`);
                    }
                });
            }

            expect(offenders.length === 0 ? '' : `以下 @Body() 參數是 any：\n${offenders.join('\n')}`).toBe('');
        });

        it('已 DTO 化的 controller 不得回退成行內型別 body', () => {
            const offenders: string[] = [];
            for (const file of CONTROLLER_FILES) {
                const repoPath = toRepoPath(file);
                if (!INLINE_BODY_PROTECTED.has(repoPath)) continue;
                const count = countInlineBodies(readFileSync(file, 'utf8'));
                if (count > 0) {
                    offenders.push(`  ${repoPath}：出現 ${count} 個行內型別 @Body()`);
                }
            }
            expect(
                offenders.length === 0
                    ? ''
                    : `這些檔案的端點已改用 DTO，不得回退（行內型別會讓 ValidationPipe 空轉）：\n${offenders.join('\n')}`,
            ).toBe('');
        });

        it('全專案行內型別 body 的總數只能下降（棘輪）', () => {
            const total = CONTROLLER_FILES.reduce(
                (sum, file) => sum + countInlineBodies(readFileSync(file, 'utf8')),
                0,
            );

            if (total > INLINE_BODY_BASELINE) {
                const perFile = CONTROLLER_FILES.map((file) => ({
                    file: toRepoPath(file),
                    count: countInlineBodies(readFileSync(file, 'utf8')),
                }))
                    .filter((x) => x.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .map((x) => `  ${x.file}: ${x.count}`)
                    .join('\n');
                throw new Error(
                    `行內型別 @Body() 從基準線 ${INLINE_BODY_BASELINE} 增加到 ${total}。` +
                    `新端點請一律用 class DTO（行內型別編譯後沒有 metatype，ValidationPipe 不會執行）。\n${perFile}`,
                );
            }

            // 降低時要求同步調降基準線，才不會把已經修好的成果又讓出去
            expect(
                total < INLINE_BODY_BASELINE
                    ? `行內型別 @Body() 已降到 ${total}，請把 INLINE_BODY_BASELINE 調成這個數字以鎖住成果。`
                    : '',
            ).toBe('');
        });
    });

    describe('密鑰', () => {
        it('已外洩的預設密鑰只能出現在 jwt.config.ts 的已知外洩清單', () => {
            // 刻意用 join 組出來，避免這支 spec 自己成為「原始碼裡出現該字串」的違規者
            const leaked = [
                ['light', 'keepers', 'jwt', 'secret', '2024'].join('-'),
                ['offline', 'fallback', 'secret'].join('-'),
            ];
            const allowedFile = 'common/config/jwt.config.ts';
            const offenders: string[] = [];

            for (const file of ALL_TS_FILES) {
                const repoPath = toRepoPath(file);
                if (repoPath === allowedFile) continue;
                const source = readFileSync(file, 'utf8');
                for (const secret of leaked) {
                    if (source.includes(secret)) {
                        offenders.push(`  ${repoPath} 含有已外洩密鑰字串 "${secret}"`);
                    }
                }
            }

            expect(
                offenders.length === 0 ? '' : `硬編碼密鑰不得復活（缺值時應 fail-fast）：\n${offenders.join('\n')}`,
            ).toBe('');
        });
    });
});
