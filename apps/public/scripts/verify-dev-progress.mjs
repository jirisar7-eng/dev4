import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const snapshotPath = path.join(__dirname, '../src/generated/dev-progress.generated.json');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

let hasError = false;

function verifyCounts(obj, name) {
  const sum = obj.completed + obj.review + obj.inProgress + obj.blocked + obj.prepared + obj.notStarted;
  if (sum !== obj.total) {
    console.error(`[Error] ${name}: Sum of statuses (${sum}) does not match total (${obj.total})`);
    hasError = true;
  }
  
  const expectedPercent = obj.total === 0 ? 0 : Math.round((obj.completed / obj.total) * 1000) / 10;
  if (Math.abs(obj.strictCompletionPercent - expectedPercent) > 0.1) {
    console.error(`[Error] ${name}: strictCompletionPercent (${obj.strictCompletionPercent}) does not match expected (${expectedPercent})`);
    hasError = true;
  }
  
  if (obj.completed < 0 || obj.review < 0 || obj.inProgress < 0 || obj.blocked < 0 || obj.prepared < 0 || obj.notStarted < 0) {
    console.error(`[Error] ${name}: Contains negative counts`);
    hasError = true;
  }
}

verifyCounts(snapshot, 'Global');

let sumPhaseTotal = 0;
let sumPhaseCompleted = 0;
let sumPhaseReview = 0;
let sumPhaseInProgress = 0;
let sumPhaseBlocked = 0;
let sumPhasePrepared = 0;
let sumPhaseNotStarted = 0;

for (const phase of snapshot.phases) {
  verifyCounts(phase, `Phase ${phase.id}`);
  sumPhaseTotal += phase.total;
  sumPhaseCompleted += phase.completed;
  sumPhaseReview += phase.review;
  sumPhaseInProgress += phase.inProgress;
  sumPhaseBlocked += phase.blocked;
  sumPhasePrepared += phase.prepared;
  sumPhaseNotStarted += phase.notStarted;
}

if (sumPhaseTotal !== snapshot.total) {
  console.error(`[Error] Phases total (${sumPhaseTotal}) does not match global total (${snapshot.total})`);
  hasError = true;
}

if (sumPhaseCompleted !== snapshot.completed) {
  console.error(`[Error] Phases completed (${sumPhaseCompleted}) does not match global completed (${snapshot.completed})`);
  hasError = true;
}

if (hasError) {
  process.exit(1);
} else {
  console.log('Dev progress snapshot verified successfully.');
}
