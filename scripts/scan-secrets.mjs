#!/usr/bin/env node
/**
 * HH DENTAL CRM - SECRET SCANNER
 * Quét toàn bộ thư mục src/ để đảm bảo không chứa service_role, sb_secret_, hoặc JWT bí mật.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

const PATTERNS = [
  { name: 'Supabase Service Role', regex: /service_role/i },
  { name: 'Supabase Secret Key', regex: /sb_secret_[a-zA-Z0-9_\-]{16,}/i },
  { name: 'Raw HS256 JWT Secret', regex: /eyJhbGciOiJIUzI1Ni[a-zA-Z0-9_\-\.]{30,}/ }
];

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(fullPath, fileList);
    } else if (/\.(js|jsx|ts|tsx|json|html|css)$/i.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = getAllFiles(srcDir);
const violations = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    for (const p of PATTERNS) {
      if (p.regex.test(line)) {
        violations.push({
          file: path.relative(path.resolve(__dirname, '..'), file),
          line: index + 1,
          rule: p.name,
          snippet: line.trim().slice(0, 80)
        });
      }
    }
  });
}

console.log('================================================================================');
console.log('HH DENTAL CRM - QUÉT MÃ NGUỒN CHỐNG LỘ SECRET (scripts/scan-secrets.mjs)');
console.log(`Đã kiểm tra: ${files.length} tệp trong src/`);
console.log('================================================================================');

if (violations.length > 0) {
  console.error(`❌ PHÁT HIỆN ${violations.length} ĐIỂM VI PHẠM BẢO MẬT:`);
  for (const v of violations) {
    console.error(`  - [${v.file}:${v.line}] (${v.rule}): ${v.snippet}`);
  }
  console.error('\n⚠️  TUYỆT ĐỐI KHÔNG ĐƯỢC ĐỂ SECRET TRONG SRC! Vui lòng loại bỏ trước khi commit.\n');
  process.exit(1);
} else {
  console.log('✅ src/ SCAN PASS: Không phát hiện service_role, sb_secret_, hay secret token nào trong src/.');
  process.exit(0);
}

