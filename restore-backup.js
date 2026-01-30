// 브라우저 콘솔에서 실행: 백업에서 복원

console.log('=== Restore from Backup ===\n');

// 1. 백업 목록 확인
const backupData = localStorage.getItem('nano-banana-backups');
if (!backupData) {
  console.error('❌ No backups found!');
} else {
  const backups = JSON.parse(backupData);
  console.log(`✅ Found ${backups.length} backups:\n`);
  
  backups.forEach((backup, i) => {
    const date = new Date(backup.timestamp);
    const nodeCount = backup.data?.nodes?.length || 0;
    console.log(`${i + 1}. ${date.toLocaleString()} - ${nodeCount} nodes`);
  });
  
  // 2. 최신 백업 복원
  if (backups.length > 0) {
    const latest = backups[0];
    localStorage.setItem('nano-banana-workflow', JSON.stringify(latest.data));
    console.log('\n✅ Restored latest backup!');
    console.log('🔄 Please refresh the page (Cmd+R)');
  }
}
