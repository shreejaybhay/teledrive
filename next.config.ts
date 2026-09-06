import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // gramjs requires some Node built-ins that are not available in the browser.
    // We tell webpack to ignore them on the client side.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        child_process: false,
      };
    }
    return config;
  },
};

export default nextConfig;
