#!/usr/bin/env node
/**
 * HH DENTAL CRM - RLS SECURITY VERIFIER
 * Sử dụng CHỈ anon key để kiểm tra 4 probe bảo mật trên Supabase Rest API.
 * Nếu bất kỳ probe nào bị lọt (anon có quyền của admin), script in bảng và exit code 1.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Đọc env
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

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cbumyrnukqqznfizcgwi.supabase.co';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9HMdUlPmoyyVvGClSVUG7Q_pYyxErsI';

console.log('================================================================================');
console.log('HH DENTAL CRM - KIỂM CHỨNG BẢO MẬT ROW LEVEL SECURITY (RLS)');
console.log(`Target: ${supabaseUrl}`);
console.log('Quyền kiểm thử: CHỈ SỬ DỤNG ANON / PUBLISHABLE KEY (Không có phiên đăng nhập)');
console.log('================================================================================\n');

async function runProbes() {
  const results = [];
  const headers = {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  };

  // --------------------------------------------------------------------------
  // PROBE 1: rpc/my_role
  // Kỳ vọng: "anon" hoặc mã lỗi 401/403. KHÔNG ĐƯỢC trả "admin"
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/my_role`, {
      method: 'POST',
      headers
    });
    const text = (await res.text()).trim();
    let isPass = false;
    let actual = '';

    if (res.status === 401 || res.status === 403) {
      isPass = true;
      actual = `HTTP ${res.status} (Bị từ chối)`;
    } else if (res.ok) {
      let role = text;
      try { role = JSON.parse(text); } catch { /* ignore */ }
      actual = `HTTP ${res.status}: "${role}"`;
      isPass = (role === 'anon');
    } else {
      actual = `HTTP ${res.status}: ${text.slice(0, 50)}`;
      isPass = !text.includes('admin');
    }

    results.push({
      id: 1,
      probe: 'POST /rpc/my_role',
      expected: '"anon" hoặc 401/403',
      actual: actual.replace(/\r?\n/g, ' '),
      pass: isPass
    });
  } catch (err) {
    results.push({
      id: 1,
      probe: 'POST /rpc/my_role',
      expected: '"anon" hoặc 401/403',
      actual: `Lỗi kết nối: ${err.message}`,
      pass: false
    });
  }

  // --------------------------------------------------------------------------
  // PROBE 2: GET /customers?select=id
  // Kỳ vọng: [] (0 dòng dữ liệu) hoặc 401/403. KHÔNG ĐƯỢC lộ danh sách khách
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/customers?select=id`, {
      method: 'GET',
      headers
    });
    let isPass = false;
    let actual = '';

    if (res.status === 401 || res.status === 403) {
      isPass = true;
      actual = `HTTP ${res.status} (Bị từ chối)`;
    } else if (res.ok) {
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : -1;
      actual = `HTTP ${res.status}: [${count} dòng]`;
      isPass = (count === 0);
    } else {
      const text = await res.text();
      actual = `HTTP ${res.status}: ${text.slice(0, 50)}`;
      isPass = true;
    }

    results.push({
      id: 2,
      probe: 'GET /customers?select=id',
      expected: '[] (0 dòng) hoặc 401/403',
      actual: actual.replace(/\r?\n/g, ' '),
      pass: isPass
    });
  } catch (err) {
    results.push({
      id: 2,
      probe: 'GET /customers?select=id',
      expected: '[] (0 dòng) hoặc 401/403',
      actual: `Lỗi kết nối: ${err.message}`,
      pass: false
    });
  }

  // --------------------------------------------------------------------------
  // PROBE 3: POST /customers {}
  // Kỳ vọng: 401 hoặc 403. KHÔNG ĐƯỢC là 400 với mã 23502 (đã lọt qua RLS)
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/customers`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({})
    });
    const text = await res.text();
    let isPass = false;
    let actual = '';

    if (res.status === 401 || res.status === 403) {
      isPass = true;
      actual = `HTTP ${res.status} (RLS chặn)`;
    } else if (res.status === 400 && text.includes('23502')) {
      isPass = false;
      actual = `HTTP 400 mã 23502 (Lọt qua RLS!)`;
    } else {
      actual = `HTTP ${res.status}: ${text.slice(0, 50)}`;
      isPass = (res.status >= 401 && res.status <= 403);
    }

    results.push({
      id: 3,
      probe: 'POST /customers {}',
      expected: 'HTTP 401/403 (Chặn ghi)',
      actual: actual.replace(/\r?\n/g, ' '),
      pass: isPass
    });
  } catch (err) {
    results.push({
      id: 3,
      probe: 'POST /customers {}',
      expected: 'HTTP 401/403 (Chặn ghi)',
      actual: `Lỗi kết nối: ${err.message}`,
      pass: false
    });
  }

  // --------------------------------------------------------------------------
  // PROBE 4: POST /rpc/settle_month {"p_month":"bad"}
  // Kỳ vọng: Lỗi "Yêu cầu đăng nhập" / Permission denied / 401 / 403.
  // KHÔNG ĐƯỢC là lỗi nghiệp vụ P0001 "Định dạng tháng không hợp lệ"
  // --------------------------------------------------------------------------
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/settle_month`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_month: 'bad' })
    });
    const text = await res.text();
    let isPass = false;
    let actual = '';

    if (res.status === 401 || res.status === 403) {
      isPass = true;
      actual = `HTTP ${res.status} (Bị từ chối)`;
    } else if (text.includes('Định dạng tháng không hợp lệ') || (res.status === 400 && text.includes('P0001'))) {
      isPass = false;
      actual = `HTTP ${res.status}: P0001 (Lọt qua role-guard!)`;
    } else if (text.includes('Yêu cầu đăng nhập') || text.includes('permission denied') || text.includes('không có quyền')) {
      isPass = true;
      actual = `HTTP ${res.status}: Đã chặn (Auth/Role Guard)`;
    } else {
      actual = `HTTP ${res.status}: ${text.slice(0, 50)}`;
      isPass = (res.status === 401 || res.status === 403);
    }

    results.push({
      id: 4,
      probe: 'POST /rpc/settle_month',
      expected: 'HTTP 401/403 hoặc "Yêu cầu đăng nhập"',
      actual: actual.replace(/\r?\n/g, ' '),
      pass: isPass
    });
  } catch (err) {
    results.push({
      id: 4,
      probe: 'POST /rpc/settle_month',
      expected: 'HTTP 401/403 hoặc "Yêu cầu đăng nhập"',
      actual: `Lỗi kết nối: ${err.message}`,
      pass: false
    });
  }

  // --------------------------------------------------------------------------
  // IN BẢNG KẾT QUẢ ASCII
  // --------------------------------------------------------------------------
  console.log('┌────┬─────────────────────────────┬────────────────────────────────────┬────────────────────────────────────┬────────┐');
  console.log('│ #  │ Probe                       │ Expected                           │ Actual                             │ Status │');
  console.log('├────┼─────────────────────────────┼────────────────────────────────────┼────────────────────────────────────┼────────┤');
  for (const r of results) {
    const id = r.id.toString().padEnd(2, ' ');
    const probe = r.probe.padEnd(27, ' ').slice(0, 27);
    const expected = r.expected.padEnd(34, ' ').slice(0, 34);
    const actual = r.actual.padEnd(34, ' ').slice(0, 34);
    const status = r.pass ? ' PASS ' : ' FAIL ';
    console.log(`│ ${id} │ ${probe} │ ${expected} │ ${actual} │ ${status} │`);
  }
  console.log('└────┴─────────────────────────────┴────────────────────────────────────┴────────────────────────────────────┴────────┘');

  const failedCount = results.filter(r => !r.pass).length;
  if (failedCount > 0) {
    console.log(`\n❌ PHÁT HIỆN ${failedCount}/4 LỖ HỔNG BẢO MẬT RLS CHƯA ĐƯỢC VÁ!`);
    console.log('Anon key hiện vẫn truy cập được dữ liệu hoặc vượt qua role-guard.');
    console.log('Vui lòng thực thi các file SQL sau trên Supabase Dashboard -> SQL Editor:');
    console.log('  1) supabase/security_fix.sql');
    console.log('  2) supabase/migrations/005_audit_triggers.sql');
    console.log('  3) supabase/migrations/006_visit_clinical_fields.sql');
    console.log('Sau đó chạy lại: npm run verify:rls\n');
    process.exit(1);
  } else {
    console.log('\n🎉 4/4 PROBES ĐÃ PASS HOÀN TOÀN! ROW LEVEL SECURITY (RLS) HOẠT ĐỘNG CHUẨN XÁC.\n');
    process.exit(0);
  }
}

runProbes();

