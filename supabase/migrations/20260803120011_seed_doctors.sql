-- 11: seed data — doctors + weekly availability
-- Idempotent: doctors are keyed by unique email; availability by (doctor_id, weekday).

insert into public.doctors
  (hospital_id, department_id, first_name, last_name, qualifications, specialization,
   years_experience, biography, languages, consultation_fee, phone, email, status)
select h.id, dept.id, v.first_name, v.last_name, v.qualifications, v.specialization,
       v.years_experience, v.biography, v.languages, v.consultation_fee, v.phone, v.email, 'active'
from (values
  ('SEH-MUM','GENMED','Aarav','Sharma','MBBS, MD (General Medicine)','General Medicine',12,
   'Dr. Sharma focuses on adult primary care, preventive checkups and chronic disease management.',
   array['English','Hindi','Marathi'], 600, '+91-98200-10001', 'aarav.sharma@sportingethos.health'),
  ('SEH-MUM','GENMED','Neha','Kulkarni','MBBS, MD (General Medicine)','General Medicine',8,
   'Dr. Kulkarni specializes in adult infectious disease and metabolic health.',
   array['English','Hindi','Marathi'], 550, '+91-98200-10002', 'neha.kulkarni@sportingethos.health'),
  ('SEH-MUM','CARDIO','Rohan','Mehta','MBBS, MD, DM (Cardiology)','Interventional Cardiology',18,
   'Dr. Mehta has 18 years of experience in coronary artery disease and heart failure management.',
   array['English','Hindi'], 1400, '+91-98200-10003', 'rohan.mehta@sportingethos.health'),
  ('SEH-MUM','NEURO','Ishaan','Verma','MBBS, MD, DM (Neurology)','Neurology',15,
   'Dr. Verma treats stroke, epilepsy and movement disorders.',
   array['English','Hindi'], 1500, '+91-98200-10004', 'ishaan.verma@sportingethos.health'),
  ('SEH-MUM','ORTHO','Vikram','Singh','MBBS, MS (Orthopedics)','Joint Replacement',20,
   'Dr. Singh specializes in knee and hip replacement surgery and sports injuries.',
   array['English','Hindi','Punjabi'], 1000, '+91-98200-10005', 'vikram.singh@sportingethos.health'),
  ('SEH-MUM','ORTHO','Ananya','Rao','MBBS, MS (Orthopedics)','Sports Medicine',9,
   'Dr. Rao focuses on sports injuries and non-surgical orthopedic care.',
   array['English','Hindi','Telugu'], 900, '+91-98200-10006', 'ananya.rao@sportingethos.health'),
  ('SEH-MUM','PEDS','Priya','Nair','MBBS, MD (Pediatrics)','Pediatrics',10,
   'Dr. Nair cares for newborns through adolescents, with a focus on vaccinations and growth monitoring.',
   array['English','Hindi','Malayalam'], 700, '+91-98200-10007', 'priya.nair@sportingethos.health'),
  ('SEH-MUM','GYNEC','Kavita','Iyer','MBBS, MD, DGO','Gynecology',14,
   'Dr. Iyer provides comprehensive women''s health and reproductive care.',
   array['English','Hindi','Tamil'], 900, '+91-98200-10008', 'kavita.iyer@sportingethos.health'),
  ('SEH-MUM','DERMA','Sanjay','Gupta','MBBS, MD (Dermatology)','Dermatology',11,
   'Dr. Gupta treats skin, hair and nail conditions, including cosmetic dermatology.',
   array['English','Hindi'], 750, '+91-98200-10009', 'sanjay.gupta@sportingethos.health'),
  ('SEH-MUM','ENT','Ritu','Chawla','MBBS, MS (ENT)','Otolaryngology',7,
   'Dr. Chawla specializes in ear, nose and throat conditions and hearing assessments.',
   array['English','Hindi'], 700, '+91-98200-10010', 'ritu.chawla@sportingethos.health'),
  ('SEH-MUM','DENTAL','Aditya','Joshi','BDS, MDS','Dentistry',6,
   'Dr. Joshi provides general dentistry, root canal and orthodontic consultations.',
   array['English','Hindi','Marathi'], 500, '+91-98200-10011', 'aditya.joshi@sportingethos.health'),
  ('SEH-MUM','GASTRO','Manoj','Pillai','MBBS, MD, DM (Gastroenterology)','Gastroenterology',16,
   'Dr. Pillai manages digestive disorders and liver disease, with endoscopy referral coordination.',
   array['English','Hindi','Malayalam'], 1200, '+91-98200-10012', 'manoj.pillai@sportingethos.health'),
  ('SEH-MUM','OPHTHAL','Devika','Menon','MBBS, MS (Ophthalmology)','Ophthalmology',10,
   'Dr. Menon provides comprehensive eye exams, cataract and vision correction consultations.',
   array['English','Hindi','Malayalam'], 700, '+91-98200-10013', 'devika.menon@sportingethos.health'),
  ('SEH-MUM','ENDO','Karan','Kapoor','MBBS, MD, DM (Endocrinology)','Endocrinology',17,
   'Dr. Kapoor specializes in diabetes, thyroid and hormonal disorder management.',
   array['English','Hindi'], 1100, '+91-98200-10014', 'karan.kapoor@sportingethos.health'),
  ('SEH-DEL','GENMED','Simran','Kaur','MBBS, MD (General Medicine)','General Medicine',9,
   'Dr. Kaur provides adult primary care with a focus on preventive health.',
   array['English','Hindi','Punjabi'], 550, '+91-98110-20001', 'simran.kaur@sportingethos.health'),
  ('SEH-DEL','CARDIO','Arjun','Malhotra','MBBS, MD, DM (Cardiology)','Cardiology',13,
   'Dr. Malhotra treats coronary artery disease, arrhythmia and hypertension.',
   array['English','Hindi'], 1300, '+91-98110-20002', 'arjun.malhotra@sportingethos.health'),
  ('SEH-DEL','PEDS','Fatima','Khan','MBBS, MD (Pediatrics)','Pediatrics',8,
   'Dr. Khan cares for infants and children, with special interest in nutrition and growth.',
   array['English','Hindi','Urdu'], 650, '+91-98110-20003', 'fatima.khan@sportingethos.health'),
  ('SEH-DEL','ORTHO','Harpreet','Sandhu','MBBS, MS (Orthopedics)','Orthopedics',12,
   'Dr. Sandhu treats fractures, joint pain and sports injuries.',
   array['English','Hindi','Punjabi'], 900, '+91-98110-20004', 'harpreet.sandhu@sportingethos.health')
) as v(hospital_code, department_code, first_name, last_name, qualifications, specialization,
       years_experience, biography, languages, consultation_fee, phone, email)
join public.hospitals h on h.code = v.hospital_code
join public.departments dept on dept.hospital_id = h.id and dept.code = v.department_code
on conflict (email) do nothing;

-- Mon-Fri 09:00-17:00 (13:00-14:00 break) + Sat 09:00-13:00 for every seeded doctor.
insert into public.doctor_availability
  (doctor_id, weekday, start_time, end_time, break_start, break_end,
   appointment_duration_minutes, max_patients, is_available)
select doc.id, w.weekday,
       '09:00'::time,
       case when w.weekday = 6 then '13:00'::time else '17:00'::time end,
       case when w.weekday = 6 then null else '13:00'::time end,
       case when w.weekday = 6 then null else '14:00'::time end,
       15, 20, true
from public.doctors doc
cross join (values (1),(2),(3),(4),(5),(6)) as w(weekday)
where doc.email is not null
on conflict (doctor_id, weekday) do nothing;
