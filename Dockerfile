FROM node:18-alpine

WORKDIR /app

# 필요한 시스템 패키지 설치
RUN apk add --no-cache \
    python3 \
    make \
    g++

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치 (devDependencies 포함)
RUN npm install --verbose

# 소스 코드 복사
COPY . .

# 로그 디렉토리 생성
RUN mkdir -p logs

# Worker 실행
ENTRYPOINT ["npm", "run", "worker"]
