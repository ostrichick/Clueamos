import type { NextConfig } from "next";

// Content-Security-Policy-Report-Only: 실제 차단 없이 위반을 콘솔에 기록한다.
// MQTT(wss) 연결과 번들 외 외부 리소스가 없음을 확인한 뒤 강제 정책으로 전환할 것.
// 강제 전환 시 dev HMR(unsafe-eval 필요)과 prod를 구분하고 connect-src에 브로커를 명시할 것.
const reportOnlyCsp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' wss: https:",
  "img-src 'self' data: blob:",
  "media-src 'self' data:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: reportOnlyCsp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
