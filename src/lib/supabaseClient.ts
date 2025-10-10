import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = "https://ahqgbwatbdqqqjoikdkt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocWdid2F0YmRxcXFqb2lrZGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5OTYwOTUsImV4cCI6MjA3NTU3MjA5NX0.A4UjAQ2hr4-YJS9_5Iy1lEUWnPPcL-m73I1GgWAfV3g";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});