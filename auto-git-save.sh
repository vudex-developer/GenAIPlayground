#!/bin/bash

# 실시간 Git 자동 저장 스크립트
# 사용법: ./auto-git-save.sh

echo "🔄 실시간 Git 자동 저장 시작..."
echo "⚠️  종료하려면 Ctrl+C를 누르세요"
echo ""

REPO_DIR="/Users/lukemacbookpro/nano-banana-studio"
WATCH_DIRS="src server"
INTERVAL=300  # 5분마다 체크

cd "$REPO_DIR" || exit 1

while true; do
    # 변경사항 확인
    if [[ -n $(git status --porcelain) ]]; then
        echo "📝 변경사항 감지! 저장 중..."
        
        git add .
        
        TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
        git commit -m "Auto save: $TIMESTAMP" > /dev/null 2>&1
        
        if git push origin main > /dev/null 2>&1; then
            echo "✅ 저장 완료: $TIMESTAMP"
        else
            echo "❌ Push 실패! 인터넷 연결을 확인하세요."
        fi
    else
        echo "⏳ 변경사항 없음 ($(date +%H:%M:%S))"
    fi
    
    sleep $INTERVAL
done
