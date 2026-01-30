// 브라우저 콘솔에서 실행할 저장 테스트 스크립트

console.log('=== Gen AI Playground Storage Test ===\n');

// 1. LocalStorage 키 확인
console.log('📦 LocalStorage Keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key) {
    const value = localStorage.getItem(key);
    const size = value ? (value.length / 1024).toFixed(2) : '0';
    console.log(`  ${key}: ${size} KB`);
  }
}

// 2. 워크플로우 데이터 확인
console.log('\n💾 Workflow Data:');
const workflowData = localStorage.getItem('nano-banana-workflow');
if (workflowData) {
  try {
    const parsed = JSON.parse(workflowData);
    console.log(`  Nodes: ${parsed.nodes?.length || 0}`);
    console.log(`  Edges: ${parsed.edges?.length || 0}`);
  } catch (e) {
    console.error('  ❌ Failed to parse workflow data');
  }
} else {
  console.log('  ⚠️ No workflow data found');
}

// 3. 백업 데이터 확인
console.log('\n🔄 Backup Data:');
const backupData = localStorage.getItem('nano-banana-backups');
if (backupData) {
  try {
    const parsed = JSON.parse(backupData);
    console.log(`  Backups: ${parsed.length || 0}`);
    parsed.forEach((backup, i) => {
      const date = new Date(backup.timestamp);
      console.log(`    ${i + 1}. ${date.toLocaleString()}`);
    });
  } catch (e) {
    console.error('  ❌ Failed to parse backup data');
  }
} else {
  console.log('  ⚠️ No backup data found');
}

// 4. 저장 공간 테스트
console.log('\n🧪 Storage Write Test:');
try {
  localStorage.setItem('test-write', 'Hello World');
  localStorage.removeItem('test-write');
  console.log('  ✅ Write permission: OK');
} catch (e) {
  console.error('  ❌ Write permission: FAILED', e);
}

// 5. 총 사용량 계산
console.log('\n📊 Total Storage Usage:');
let totalSize = 0;
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key) {
    const value = localStorage.getItem(key);
    totalSize += value ? value.length : 0;
  }
}
console.log(`  Total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Limit: ~5-10 MB (browser dependent)`);
console.log(`  Usage: ${((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1)}%`);

console.log('\n=== Test Complete ===');
