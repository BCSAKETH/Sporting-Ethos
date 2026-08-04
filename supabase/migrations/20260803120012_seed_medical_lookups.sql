-- 12: seed data — common disease and allergy master lists
-- Idempotent (unique on name). Patients attach to these via patient_diseases /
-- patient_allergies rather than free-typing conditions, keeping the data 3NF.

insert into public.diseases (name, icd_code, category)
values
  ('Type 2 Diabetes Mellitus', 'E11', 'Endocrine'),
  ('Hypertension', 'I10', 'Cardiovascular'),
  ('Asthma', 'J45', 'Respiratory'),
  ('Coronary Artery Disease', 'I25', 'Cardiovascular'),
  ('Hypothyroidism', 'E03', 'Endocrine'),
  ('Hyperthyroidism', 'E05', 'Endocrine'),
  ('Chronic Kidney Disease', 'N18', 'Renal'),
  ('Migraine', 'G43', 'Neurological'),
  ('Epilepsy', 'G40', 'Neurological'),
  ('Osteoarthritis', 'M19', 'Musculoskeletal'),
  ('Rheumatoid Arthritis', 'M06', 'Musculoskeletal'),
  ('COPD', 'J44', 'Respiratory'),
  ('Depression', 'F32', 'Mental Health'),
  ('Anxiety Disorder', 'F41', 'Mental Health'),
  ('GERD', 'K21', 'Gastrointestinal'),
  ('Anemia', 'D64', 'Hematological')
on conflict (name) do nothing;

insert into public.allergies (name, category)
values
  ('Penicillin', 'Drug'),
  ('Sulfa Drugs', 'Drug'),
  ('Aspirin / NSAIDs', 'Drug'),
  ('Peanuts', 'Food'),
  ('Tree Nuts', 'Food'),
  ('Shellfish', 'Food'),
  ('Eggs', 'Food'),
  ('Milk / Lactose', 'Food'),
  ('Dust Mites', 'Environmental'),
  ('Pollen', 'Environmental'),
  ('Latex', 'Environmental'),
  ('Bee / Insect Sting', 'Environmental')
on conflict (name) do nothing;
