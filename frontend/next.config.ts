import type { NextConfig } from "next";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), '../.env') });

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_KEY,
  },
};

export default nextConfig;
