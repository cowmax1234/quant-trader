/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  // 로컬(localhost:3003)에서 EC2 API 직접 호출할 수 있도록 CORS 허용 (배포된 서버에만 적용)
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "http://localhost:3003" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
