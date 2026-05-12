import type { NextConfig } from "next";
import { assertLocalOnlyEnvironment } from "./lib/env-safety";

assertLocalOnlyEnvironment();

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
