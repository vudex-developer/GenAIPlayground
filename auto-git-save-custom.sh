#!/bin/bash

# 사용자 정의 자동 저장 스크립트

REPO_DIR="/Users/lukemacbookpro/gen-ai-playground"
INTERVAL=60  # 👈 여기 숫자 변경! (초 단위: 60=1분, 300=5분, 600=10분)

echo "🔄 자동 저장 시작 (${INTERVAL}초마다)"
echo "⚠️  종료: Ctrl+C"
echo ""

cd "$REPO_DIR" || exit 1

while true; do
    if [[ -n $(git status --porcelain) ]]; then
        echo "📝 저장 중... $(date +%H:%M:%S)"
        git add . && \
        git commit -m "Auto: $(date +%Y-%m-%d\ %H:%M:%S)" && \
        git push && \
        echo "✅ 완료" || \
        echo "❌ 실패"
    fi
    sleep $INTERVAL
done
