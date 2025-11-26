// Expo config centraliza variáveis de ambiente para uso no app (nativo e web).
const dotenv = require("dotenv");
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://ahqgbwatbdqqqjoikdkt.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocWdid2F0YmRxcXFqb2lrZGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5OTYwOTUsImV4cCI6MjA3NTU3MjA5NX0.A4UjAQ2hr4-YJS9_5Iy1lEUWnPPcL-m73I1GgWAfV3g";

module.exports = {
  expo: {
    name: "spacelearn",
    slug: "spacelearn",
    scheme: "spacelearn",
    extra: {
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      eas: {
        projectId: "local",
      },
    },
  },
};
