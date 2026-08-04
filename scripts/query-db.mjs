import { createClient } from "@supabase/supabase-js";

const url = "https://ieurjkuvrdmmnwursvdk.supabase.co";
const key = "sb_publishable_Hv7J2hAl7BFXbDwqgZOzqg_3qlHZCfc";

const supabase = createClient(url, key);

async function main() {
  console.log("=== SUPABASE DATABASE SAMPLES ===\n");

  // 1. Doctors
  const { data: doctors, error: docErr } = await supabase
    .from("doctors")
    .select("id, first_name, last_name, specialization, email, phone, years_experience")
    .limit(5);

  if (docErr) console.log("Doctors Error:", docErr.message);
  else console.log("🩺 DOCTORS (Sample 5):\n", JSON.stringify(doctors, null, 2));

  // 2. Checkins
  const { data: checkins, error: checkErr } = await supabase
    .from("checkins")
    .select("id, name, appointment_id, status, priority, check_in_time")
    .limit(5);

  if (checkErr) console.log("\nCheckins Error:", checkErr.message);
  else console.log("\n📋 CHECK-INS (Sample 5):\n", JSON.stringify(checkins, null, 2));

  // 3. Medicines
  const { data: medicines, error: medErr } = await supabase
    .from("medicines")
    .select("id, name, price, stock, category")
    .limit(5);

  if (medErr) console.log("\nMedicines Error:", medErr.message);
  else console.log("\n💊 MEDICINES (Sample 5):\n", JSON.stringify(medicines, null, 2));

  // 4. Profiles
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, full_name, gender, blood_group, height_cm, weight_kg")
    .limit(5);

  if (profErr) console.log("\nProfiles Error:", profErr.message);
  else console.log("\n👤 PROFILES (Sample 5):\n", JSON.stringify(profiles, null, 2));
}

main();
