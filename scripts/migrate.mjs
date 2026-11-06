import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Tự động đọc biến môi trường từ .env nếu có
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log('========================================================================');
  console.log('⚠️  CHƯA CẤU HÌNH BIẾN MÔI TRƯỜNG CHO SUPABASE MIGRATION');
  console.log('========================================================================');
  console.log('Vui lòng tạo tệp .env (hoặc truyền qua biến môi trường) với:');
  console.log('  VITE_SUPABASE_URL=https://<your-project>.supabase.co');
  console.log('  VITE_SUPABASE_ANON_KEY=ey...');
  console.log('  SUPABASE_SERVICE_ROLE_KEY=ey...');
  console.log('\nSau đó chạy lại lệnh: node scripts/migrate.mjs');
  console.log('========================================================================\n');
  process.exit(1);
}

// 2. Hàm sinh UUID tất định (Deterministic UUID) để map ID chuỗi sang UUID Postgres
function toUUID(prefix, id) {
  if (!id) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const hash = crypto.createHash('md5').update(`${prefix}:${id}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '4' + hash.substring(13, 16),
    'a' + hash.substring(17, 20),
    hash.substring(20, 32)
  ].join('-');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log('🚀 Bắt đầu quá trình Migration dữ liệu lên Supabase...');
  console.log('Target URL:', SUPABASE_URL);

  const dbPath = fs.existsSync(path.resolve(__dirname, './seed_database.json'))
    ? path.resolve(__dirname, './seed_database.json')
    : path.resolve(__dirname, '../server/data/database.json');
  if (!fs.existsSync(dbPath)) {
    console.error('❌ Không tìm thấy scripts/seed_database.json hoặc server/data/database.json');
    process.exit(1);
  }
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  // --------------------------------------------------------------------------
  // BƯỚC 1: MIGRATE SERVICES
  // --------------------------------------------------------------------------
  console.log('\n[1/4] Di chuyển bảng services...');
  const servicesToInsert = (db.services || []).map(s => ({
    id: toUUID('service', s.id),
    code: s.id,
    name: s.name,
    default_price: s.defaultPrice || 0,
    active: true
  }));

  const { error: errServices } = await supabase.from('services').upsert(servicesToInsert, { onConflict: 'id' });
  if (errServices) {
    console.error('❌ Lỗi insert services:', errServices.message);
  } else {
    console.log(`✅ Đã insert ${servicesToInsert.length} gói dịch vụ.`);
  }

  // --------------------------------------------------------------------------
  // BƯỚC 2: MIGRATE PARTNERS (Sort by depth ASC: Node cha trước, Node con sau)
  // --------------------------------------------------------------------------
  console.log('\n[2/4] Di chuyển bảng partners (sắp xếp theo depth tăng dần)...');
  const partnersSorted = [...(db.partners || [])].sort((a, b) => (a.depth || 0) - (b.depth || 0));
  
  const partnersToInsert = partnersSorted.map(p => ({
    id: toUUID('partner', p.id),
    code: p.code,
    name: p.name,
    title: p.title || `Đối tác Tuyến ${p.depth || 0}`,
    phone: p.phone || '',
    email: p.email || '',
    parent_id: toUUID('partner', p.parentId),
    depth: p.depth || 0,
    status: p.status || 'ACTIVE',
    bank_name: p.bankName || 'Vietcombank',
    bank_account_no: p.bankAccountNo || '',
    bank_account_name: p.bankAccountName || p.name,
    joined_at: p.joinedAt || new Date().toISOString().substring(0, 10),
    created_at: p.createdAt || new Date().toISOString()
  }));

  // Insert từng tầng để đảm bảo khóa ngoại parent_id không bị vi phạm
  for (const partner of partnersToInsert) {
    const { error: errP } = await supabase.from('partners').upsert(partner, { onConflict: 'id' });
    if (errP) {
      console.error(`❌ Lỗi insert partner ${partner.code}:`, errP.message);
    }
  }
  console.log(`✅ Đã insert ${partnersToInsert.length} đối tác.`);

  // --------------------------------------------------------------------------
  // BƯỚC 3: MIGRATE CUSTOMERS
  // --------------------------------------------------------------------------
  console.log('\n[3/4] Di chuyển bảng customers (Chuỗi khách hàng)...');
  const customersSorted = [...(db.customers || [])].sort((a, b) => (a.depth || 1) - (b.depth || 1));
  const customersToInsert = customersSorted.map(c => ({
    id: toUUID('customer', c.id),
    code: c.code,
    name: c.name,
    phone: c.phone || '',
    owner_partner_id: toUUID('partner', c.ownerPartnerId),
    referrer_customer_id: toUUID('customer', c.referrerCustomerId),
    depth: c.depth || 1,
    treatment: c.treatment || '',
    status: c.status || 'completed',
    created_at: c.createdAt || new Date().toISOString()
  }));

  for (const customer of customersToInsert) {
    const { error: errC } = await supabase.from('customers').upsert(customer, { onConflict: 'id' });
    if (errC) {
      console.error(`❌ Lỗi insert customer ${customer.code}:`, errC.message);
    }
  }
  console.log(`✅ Đã insert ${customersToInsert.length} khách hàng.`);

  // --------------------------------------------------------------------------
  // BƯỚC 4: MIGRATE VISITS
  // --------------------------------------------------------------------------
  console.log('\n[4/4] Di chuyển bảng visits (Lượt điều trị & Doanh thu)...');
  const visitsToInsert = (db.visits || []).map(v => ({
    id: toUUID('visit', v.id),
    customer_id: toUUID('customer', v.customerId),
    amount: v.amount,
    note: v.note || 'Lượt điều trị',
    occurred_at: v.occurredAt || new Date().toISOString(),
    created_at: v.occurredAt || new Date().toISOString()
  }));

  const { error: errVisits } = await supabase.from('visits').upsert(visitsToInsert, { onConflict: 'id' });
  if (errVisits) {
    console.error('❌ Lỗi insert visits:', errVisits.message);
  } else {
    console.log(`✅ Đã insert ${visitsToInsert.length} lượt điều trị.`);
  }

  // --------------------------------------------------------------------------
  // BƯỚC 5: KIỂM CHỨNG ĐỐI SOÁT VỚI GOLDEN SNAPSHOT
  // --------------------------------------------------------------------------
  console.log('\n🔍 ĐANG CHẠY RPC compute_month(\'2026-11\') TRÊN SUPABASE ĐỂ ĐỐI SOÁT...');
  const { data: rpcRows, error: rpcErr } = await supabase.rpc('compute_month', { p_month: '2026-11' });

  if (rpcErr) {
    console.error('❌ Lỗi gọi RPC compute_month:', rpcErr.message);
    console.log('Hãy chắc chắn rằng bạn đã chạy supabase/migrations/003_compute.sql trên Supabase SQL Editor.');
    return;
  }

  const goldenPath = path.resolve(__dirname, './golden.json');
  if (fs.existsSync(goldenPath)) {
    const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
    console.log('\n--- BẢNG SO SÁNH KẾT QUẢ SUPABASE RPC VỚI GOLDEN SNAPSHOT ---');

    let allMatch = true;
    for (const gRow of golden.partnerRows) {
      const mappedUUID = toUUID('partner', gRow.partnerId);
      const rRow = rpcRows.find(r => r.partner_id === mappedUUID);

      if (!rRow) {
        console.error(`❌ Thiếu đối tác ${gRow.partnerId} (${gRow.partnerName}) trong RPC!`);
        allMatch = false;
        continue;
      }

      const matchOwn = Number(rRow.own_revenue) === Number(gRow.ownRevenue);
      const matchBranch = Number(rRow.branch_revenue) === Number(gRow.branchRevenue);
      const matchComm = Number(rRow.commission) === Number(gRow.commission);
      const matchFee = Number(rRow.branch_fee) === Number(gRow.branchFee);
      const matchTotal = Number(rRow.total) === Number(gRow.total);

      if (matchOwn && matchBranch && matchComm && matchFee && matchTotal) {
        console.log(`✅ [${gRow.partnerCode}] ${gRow.partnerName}: KHỚP 100% (Tổng: ${Number(rRow.total).toLocaleString('vi-VN')} ₫)`);
      } else {
        allMatch = false;
        console.error(`❌ [${gRow.partnerCode}] KHÔNG KHỚP:`, {
          golden: { own: gRow.ownRevenue, branch: gRow.branchRevenue, comm: gRow.commission, fee: gRow.branchFee, total: gRow.total },
          supabase: { own: rRow.own_revenue, branch: rRow.branch_revenue, comm: rRow.commission, fee: rRow.branch_fee, total: rRow.total }
        });
      }
    }

    if (allMatch) {
      console.log('\n🎉 TUYỆT VỜI! TOÀN BỘ KẾT QUẢ TÍNH TIỀN TRÊN SUPABASE RPC KHỚP CHÍNH XÁC 100% VỚI GOLDEN BENCHMARK!');
    }
  }

  console.log('\n✅ Hoàn tất quá trình migration!');
}

runMigration().catch(console.error);
