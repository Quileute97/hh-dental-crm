#!/usr/bin/env node
/**
 * HH DENTAL CRM - APPLY SQL RUNNER
 * Chạy các file SQL migration lên Supabase (qua DATABASE_URL hoặc Supabase Management API)
 * Hỗ trợ cờ --dry-run để liệt kê các file cần thực thi mà không ghi vào database.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Đọc biến môi trường từ .env
function loadEnv() {
  const envFiles = ['.env', '.env.local', '.env.production'];
  for (const envFile of envFiles) {
    const envPath = path.join(rootDir, envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

// 2. Parse arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const fileArgs = args.filter(a => !a.startsWith('--'));

const defaultFiles = [
  'supabase/security_fix.sql',
  'supabase/migrations/005_audit_triggers.sql',
  'supabase/migrations/006_visit_clinical_fields.sql'
];

const targetFiles = fileArgs.length > 0 ? fileArgs : defaultFiles;

console.log('================================================================================');
console.log('HH DENTAL CRM - BỘ THỰC THI SQL MIGRATION');
console.log('================================================================================');
if (isDryRun) {
  console.log('🔍 CHẾ ĐỘ: --dry-run (Chỉ kiểm tra tệp, KHÔNG thực thi lên Database)');
}
console.log(`Danh sách ${targetFiles.length} file SQL:`);

const resolvedFiles = [];
for (const relPath of targetFiles) {
  const fullPath = path.isAbsolute(relPath) ? relPath : path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Không tìm thấy file: ${relPath} (đường dẫn: ${fullPath})`);
    process.exit(1);
  }
  const stat = fs.statSync(fullPath);
  resolvedFiles.push({ relPath, fullPath, size: stat.size });
  console.log(`  - [${stat.size.toString().padStart(6, ' ')} bytes] ${relPath}`);
}
console.log('--------------------------------------------------------------------------------');

if (isDryRun) {
  console.log('✅ DRY-RUN HOÀN TẤT: Tất cả file SQL đều tồn tại và hợp lệ.');
  console.log('Để thực thi, cung cấp DATABASE_URL hoặc SUPABASE_ACCESS_TOKEN và chạy không có cờ --dry-run.');
  process.exit(0);
}

// 3. Kiểm tra thông tin kết nối
const databaseUrl = process.env.DATABASE_URL;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

let projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef && supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    projectRef = parsed.hostname.split('.')[0];
  } catch {
    // ignore
  }
}

if (!databaseUrl && !accessToken) {
  console.log('\n⚠️  CẦN DATABASE_URL HOẶC SUPABASE_ACCESS_TOKEN ĐỂ THỰC THI TỰ ĐỘNG.');
  console.log('Cấu hình yêu cầu trong .env:');
  console.log('  DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres');
  console.log('  HOẶC:');
  console.log('  SUPABASE_ACCESS_TOKEN=sbp_...');
  console.log('  SUPABASE_PROJECT_REF=' + (projectRef || '<project-ref>'));
  console.log('\n👉 HƯỚNG DẪN DÁN THỦ CÔNG VÀO SUPABASE SQL EDITOR:');
  console.log('1. Truy cập https://supabase.com/dashboard/project/' + (projectRef || '_') + '/sql');
  console.log('2. Mở và dán nội dung tuần tự các file sau vào SQL Editor rồi bấm RUN:');
  resolvedFiles.forEach((f, i) => {
    console.log(`   ${i + 1}) ${f.relPath}`);
  });
  console.log('3. Sau khi chạy, kiểm chứng hệ thống bằng:');
  console.log('   npm run verify:rls');
  console.log('================================================================================\n');
  process.exit(2);
}

// 4. Thực thi qua Management API
async function executeViaManagementApi() {
  if (!projectRef) {
    console.error('❌ Thiếu SUPABASE_PROJECT_REF để gọi Management API.');
    process.exit(2);
  }

  console.log(`🚀 Thực thi qua Supabase Management API (Project: ${projectRef})...`);
  for (const file of resolvedFiles) {
    const startTime = Date.now();
    const sql = fs.readFileSync(file.fullPath, 'utf-8');
    process.stdout.write(`Đang chạy ${file.relPath}... `);

    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: sql })
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      if (!res.ok) {
        const errorText = await res.text();
        console.log(`❌ THẤT BẠI (${elapsed}s)`);
        console.error(`Chi tiết lỗi: ${errorText}`);
        process.exit(1);
      }
      console.log(`✅ THÀNH CÔNG (${elapsed}s)`);
    } catch (err) {
      console.log(`❌ LỖI KẾT NỐI: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('================================================================================');
  console.log('🎉 Toàn bộ migration đã được thực thi thành công!');
  console.log('Chạy kiểm chứng RLS: npm run verify:rls');
}

// 5. Thực thi qua DATABASE_URL (nếu có thư viện pg hoặc tương đương)
async function executeViaDatabaseUrl() {
  console.log('🚀 Thực thi qua DATABASE_URL connection pooler...');
  try {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();

    for (const file of resolvedFiles) {
      const startTime = Date.now();
      const sql = fs.readFileSync(file.fullPath, 'utf-8');
      process.stdout.write(`Đang chạy ${file.relPath}... `);
      try {
        await client.query(sql);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ THÀNH CÔNG (${elapsed}s)`);
      } catch (err) {
        console.log(`❌ THẤT BẠI`);
        console.error(`Chi tiết lỗi: ${err.message}`);
        await client.end();
        process.exit(1);
      }
    }
    await client.end();
    console.log('================================================================================');
    console.log('🎉 Toàn bộ migration đã được thực thi thành công!');
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('❌ Gói "pg" chưa được cài đặt trong node_modules.');
      console.log('Vui lòng sử dụng SUPABASE_ACCESS_TOKEN hoặc dán thủ công vào Supabase SQL Editor.');
      process.exit(2);
    }
    throw err;
  }
}

if (accessToken) {
  executeViaManagementApi();
} else if (databaseUrl) {
  executeViaDatabaseUrl();
}

