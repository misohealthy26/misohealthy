import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lock Next to this project. There is a stray package.json + middleware.ts
  // at /Users/ethanmiller/ that Next would otherwise pick up as workspace root.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
