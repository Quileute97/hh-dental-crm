import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateMonthlySettlement } from '../src/services/commissionEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = fs.existsSync(path.resolve(__dirname, './seed_database.json'))
  ? path.resolve(__dirname, './seed_database.json')
  : path.resolve(__dirname, '../server/data/database.json');
const goldenPath = path.resolve(__dirname, './golden.json');

const raw = fs.readFileSync(dbPath, 'utf-8');
const db = JSON.parse(raw);

const month = '2026-11';
const result = calculateMonthlySettlement(month, db);

const goldenData = {
  month,
  generatedAt: new Date().toISOString(),
  periodRevenue: result.periodRevenue,
  totalCtvCommission: result.totalCtvCommission,
  totalPlatformShare: result.totalPlatformShare,
  totalBranchFee: result.totalBranchFee,
  totalCost: result.totalCost,
  costPercent: result.costPercent,
  partnerRows: result.partnerRows.map(r => ({
    partnerId: r.partnerId,
    partnerCode: r.partnerCode,
    partnerName: r.partnerName,
    ownRevenue: r.ownRevenue,
    branchRevenue: r.branchRevenue,
    commission: r.commission,
    branchFee: r.branchFee,
    total: r.total
  }))
};

fs.writeFileSync(goldenPath, JSON.stringify(goldenData, null, 2), 'utf-8');
console.log('✅ Golden benchmark generated at:', goldenPath);
console.log('Summary:', {
  periodRevenue: goldenData.periodRevenue,
  totalCtvCommission: goldenData.totalCtvCommission,
  totalBranchFee: goldenData.totalBranchFee,
  totalCost: goldenData.totalCost,
  costPercent: goldenData.costPercent
});
console.table(goldenData.partnerRows);
