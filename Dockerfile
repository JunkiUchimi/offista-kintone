# ベースイメージとして公式のNode.jsイメージを使用
FROM node:16

# 作業ディレクトリを設定
WORKDIR /app

# package.json と package-lock.json をコンテナにコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# プロジェクトの全ファイルをコンテナにコピー
COPY . .

# アプリケーションをビルドする（必要な場合）
# RUN npm run build

# アプリケーションを起動
CMD ["npm", "start"]

# コンテナがリッスンするポートを指定
EXPOSE 8080
