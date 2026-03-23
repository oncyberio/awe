import type { NextConfig } from "next";

const compiler: NextConfig["compiler"] =
  process.env.NODE_ENV === "production"
    ? {
        removeConsole: {
          exclude: ["error", "warn"],
        },
      }
    : undefined;

const nextConfig: NextConfig = {
  transpilePackages: ["@oncyberio/engine", "@oncyberio/engine-edit"],
  serverExternalPackages: ["draco3dgltf", "sharp"],
  compiler,
};

export default nextConfig;
