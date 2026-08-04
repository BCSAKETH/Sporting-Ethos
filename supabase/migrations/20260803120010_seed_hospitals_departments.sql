-- 10: seed data — hospitals + department catalog
--
-- Two demo hospitals. The primary campus gets the full OPD/IPD/SUPPORT
-- catalog from the spec; the secondary campus gets a realistic smaller
-- subset, to demonstrate the hospital -> department relationship without
-- pure duplication. Idempotent (safe to re-run).

insert into public.hospitals (id, name, code, address, city, state, postal_code, phone, email, is_active)
values
  ('11111111-1111-1111-1111-111111111111', 'Sporting Ethos Multi-Specialty Hospital', 'SEH-MUM',
   '221 Marine Drive', 'Mumbai', 'Maharashtra', '400002', '+91-22-4000-1000', 'contact@sportingethos.health', true),
  ('22222222-2222-2222-2222-222222222222', 'Sporting Ethos North Campus', 'SEH-DEL',
   '48 Rajpath Avenue', 'New Delhi', 'Delhi', '110001', '+91-11-4000-2000', 'northcampus@sportingethos.health', true)
on conflict (code) do nothing;

-- Primary campus: full OPD catalog ---------------------------------------
insert into public.departments
  (hospital_id, name, code, description, department_type, icon, color, floor, location,
   consultation_fee, operating_hours, contact_number, email)
select h.id, d.name, d.code, d.description, d.department_type::public.department_type, d.icon, d.color,
       d.floor, d.location, d.consultation_fee, d.operating_hours::jsonb, d.contact_number, d.email
from public.hospitals h
cross join (values
  ('General Medicine','GENMED','Primary care for adult illness, chronic disease management, and preventive checkups.','OPD','stethoscope','#2563EB','1','Block A',600,'{"mon_sat":"09:00-17:00","sun":"closed"}','+91-22-4000-1010','genmed@sportingethos.health'),
  ('Cardiology','CARDIO','Heart health: ECG, echocardiography, hypertension and post-cardiac-event care.','OPD','heart-pulse','#DC2626','2','Block A',1200,'{"mon_sat":"09:00-16:00","sun":"closed"}','+91-22-4000-1011','cardiology@sportingethos.health'),
  ('Neurology','NEURO','Diagnosis and treatment of brain, spine and nerve disorders including stroke and epilepsy.','OPD','brain','#7C3AED','2','Block A',1300,'{"mon_fri":"09:00-16:00","sun":"closed"}','+91-22-4000-1012','neurology@sportingethos.health'),
  ('Orthopedics','ORTHO','Bone, joint and sports-injury care, fracture management and joint replacement consults.','OPD','bone','#EA580C','1','Block B',900,'{"mon_sat":"09:00-17:00","sun":"closed"}','+91-22-4000-1013','ortho@sportingethos.health'),
  ('Pediatrics','PEDS','Comprehensive child healthcare from newborns through adolescents, including vaccinations.','OPD','baby','#0891B2','1','Block C',700,'{"mon_sat":"09:00-17:00","sun":"10:00-13:00"}','+91-22-4000-1014','pediatrics@sportingethos.health'),
  ('Gynecology','GYNEC','Women''s reproductive health, screenings and general gynecological care.','OPD','venus','#DB2777','3','Block C',800,'{"mon_sat":"09:00-16:00","sun":"closed"}','+91-22-4000-1015','gynec@sportingethos.health'),
  ('Obstetrics','OBSTET','Prenatal care, delivery planning and postnatal follow-up.','OPD','baby','#DB2777','3','Block C',900,'{"mon_sat":"09:00-16:00","sun":"closed"}','+91-22-4000-1016','obstetrics@sportingethos.health'),
  ('Dermatology','DERMA','Skin, hair and nail conditions, cosmetic dermatology and allergy testing.','OPD','sparkles','#059669','2','Block B',700,'{"mon_sat":"10:00-17:00","sun":"closed"}','+91-22-4000-1017','derma@sportingethos.health'),
  ('Ophthalmology','OPHTHAL','Eye examinations, vision correction and treatment of eye diseases.','OPD','eye','#0D9488','2','Block B',700,'{"mon_sat":"09:00-17:00","sun":"closed"}','+91-22-4000-1018','eye@sportingethos.health'),
  ('ENT','ENT','Ear, nose and throat diagnosis and treatment including hearing assessments.','OPD','ear','#4338CA','2','Block B',700,'{"mon_sat":"09:00-17:00","sun":"closed"}','+91-22-4000-1019','ent@sportingethos.health'),
  ('Dentistry','DENTAL','General dentistry, orthodontics and oral surgery consultations.','OPD','smile','#0EA5E9','1','Block D',500,'{"mon_sat":"09:00-18:00","sun":"closed"}','+91-22-4000-1020','dental@sportingethos.health'),
  ('Gastroenterology','GASTRO','Digestive system care including endoscopy referrals and liver disease management.','OPD','activity','#B45309','3','Block A',1100,'{"mon_fri":"09:00-16:00","sun":"closed"}','+91-22-4000-1021','gastro@sportingethos.health'),
  ('Nephrology','NEPHRO','Kidney disease management, dialysis coordination and hypertension-related renal care.','OPD','droplet','#1D4ED8','3','Block A',1200,'{"mon_fri":"09:00-16:00","sun":"closed"}','+91-22-4000-1022','nephro@sportingethos.health'),
  ('Urology','UROL','Urinary tract and male reproductive health diagnosis and treatment.','OPD','droplet','#0369A1','3','Block A',1000,'{"mon_fri":"09:00-16:00","sun":"closed"}','+91-22-4000-1023','urology@sportingethos.health'),
  ('Pulmonology','PULMO','Lung and respiratory disease diagnosis, asthma and COPD management.','OPD','wind','#0F766E','2','Block A',1000,'{"mon_sat":"09:00-16:00","sun":"closed"}','+91-22-4000-1024','pulmo@sportingethos.health'),
  ('Endocrinology','ENDO','Diabetes, thyroid and hormonal disorder diagnosis and long-term management.','OPD','flask-conical','#9333EA','3','Block A',1100,'{"mon_fri":"09:00-16:00","sun":"closed"}','+91-22-4000-1025','endo@sportingethos.health'),

  ('General Medicine Ward','GENMED_W','Inpatient ward for general medical admissions and observation.','IPD','bed','#2563EB','4','Block A',3000,'{"always":"24x7"}','+91-22-4000-1030',null),
  ('Cardiology Ward','CARDIO_W','Inpatient monitoring and recovery for cardiac patients.','IPD','bed','#DC2626','4','Block A',3800,'{"always":"24x7"}','+91-22-4000-1031',null),
  ('Neurology Ward','NEURO_W','Inpatient care for stroke, seizure and neurosurgical recovery patients.','IPD','bed','#7C3AED','4','Block A',3800,'{"always":"24x7"}','+91-22-4000-1032',null),
  ('Orthopedic Ward','ORTHO_W','Post-surgical and fracture-recovery inpatient care.','IPD','bed','#EA580C','3','Block B',3000,'{"always":"24x7"}','+91-22-4000-1033',null),
  ('Pediatric Ward','PEDS_W','Inpatient care for admitted children.','IPD','bed','#0891B2','3','Block C',2800,'{"always":"24x7"}','+91-22-4000-1034',null),
  ('Gynecology Ward','GYNEC_W','Inpatient gynecological surgical recovery and observation.','IPD','bed','#DB2777','4','Block C',3000,'{"always":"24x7"}','+91-22-4000-1035',null),
  ('Obstetrics (Maternity Ward)','MATERNITY','Labor, delivery and postnatal inpatient care.','IPD','baby','#DB2777','4','Block C',3500,'{"always":"24x7"}','+91-22-4000-1036',null),
  ('Oncology Ward','ONCO_W','Inpatient cancer treatment, chemotherapy recovery and palliative support.','IPD','bed','#7C2D12','5','Block A',4200,'{"always":"24x7"}','+91-22-4000-1037',null),
  ('ICU','ICU','Intensive care for critically ill patients requiring continuous monitoring.','IPD','activity','#B91C1C','5','Block A',9000,'{"always":"24x7"}','+91-22-4000-1038',null),
  ('NICU','NICU','Neonatal intensive care for premature and critically ill newborns.','IPD','baby','#B91C1C','4','Block C',9500,'{"always":"24x7"}','+91-22-4000-1039',null),
  ('PICU','PICU','Pediatric intensive care for critically ill children.','IPD','baby','#B91C1C','4','Block C',9200,'{"always":"24x7"}','+91-22-4000-1040',null),
  ('Surgical Ward','SURG_W','Pre- and post-operative inpatient surgical care.','IPD','bed','#334155','3','Block B',3600,'{"always":"24x7"}','+91-22-4000-1041',null),
  ('Burn Unit','BURN','Specialized inpatient care for burn injury treatment and recovery.','IPD','flame','#C2410C','5','Block B',5000,'{"always":"24x7"}','+91-22-4000-1042',null),
  ('Isolation Ward','ISOL','Inpatient care for patients requiring infection-control isolation.','IPD','shield','#475569','5','Block A',3400,'{"always":"24x7"}','+91-22-4000-1043',null),

  ('Laboratory','LAB','Blood work, pathology and diagnostic sample testing.','SUPPORT','flask-conical','#0284C7','G','Block D',null,'{"mon_sat":"07:00-19:00","sun":"08:00-13:00"}','+91-22-4000-1050','lab@sportingethos.health'),
  ('Radiology','RADIO','X-ray, CT, MRI and ultrasound imaging services.','SUPPORT','scan','#0284C7','G','Block D',null,'{"mon_sat":"08:00-20:00","sun":"09:00-14:00"}','+91-22-4000-1051','radiology@sportingethos.health'),
  ('Pharmacy','PHARM','In-house pharmacy for prescription dispensing.','SUPPORT','pill','#16A34A','G','Block D',null,'{"always":"24x7"}','+91-22-4000-1052','pharmacy@sportingethos.health'),
  ('Blood Bank','BLOODBANK','Blood donation, storage and transfusion services.','SUPPORT','droplet','#B91C1C','G','Block D',null,'{"always":"24x7"}','+91-22-4000-1053',null),
  ('Emergency Department','ER','24x7 emergency triage and acute care.','SUPPORT','siren','#B91C1C','G','Block A',300,'{"always":"24x7"}','+91-22-4000-1054',null),
  ('Operation Theatre','OT','Surgical operation theatres for scheduled and emergency procedures.','SUPPORT','syringe','#334155','2','Block B',null,'{"always":"24x7"}','+91-22-4000-1055',null)
) as d(name, code, description, department_type, icon, color, floor, location, consultation_fee, operating_hours, contact_number, email)
where h.code = 'SEH-MUM'
on conflict (hospital_id, code) do nothing;

-- Secondary campus: smaller realistic subset ------------------------------
insert into public.departments
  (hospital_id, name, code, description, department_type, icon, color, floor, location,
   consultation_fee, operating_hours, contact_number, email)
select h.id, d.name, d.code, d.description, d.department_type::public.department_type, d.icon, d.color,
       d.floor, d.location, d.consultation_fee, d.operating_hours::jsonb, d.contact_number, d.email
from public.hospitals h
cross join (values
  ('General Medicine','GENMED','Primary care for adult illness, chronic disease management, and preventive checkups.','OPD','stethoscope','#2563EB','1','Wing 1',550,'{"mon_sat":"09:00-17:00","sun":"closed"}','+91-11-4000-2010','genmed@sportingethos.health'),
  ('Cardiology','CARDIO','Heart health: ECG, echocardiography and hypertension care.','OPD','heart-pulse','#DC2626','2','Wing 1',1100,'{"mon_sat":"09:00-16:00","sun":"closed"}','+91-11-4000-2011','cardiology@sportingethos.health'),
  ('Orthopedics','ORTHO','Bone and joint care, fracture management.','OPD','bone','#EA580C','1','Wing 2',850,'{"mon_sat":"09:00-17:00","sun":"closed"}','+91-11-4000-2012','ortho@sportingethos.health'),
  ('Pediatrics','PEDS','Child healthcare and vaccinations.','OPD','baby','#0891B2','1','Wing 2',650,'{"mon_sat":"09:00-17:00","sun":"10:00-13:00"}','+91-11-4000-2013','pediatrics@sportingethos.health'),
  ('Gynecology','GYNEC','Women''s reproductive health and screenings.','OPD','venus','#DB2777','2','Wing 2',750,'{"mon_sat":"09:00-16:00","sun":"closed"}','+91-11-4000-2014','gynec@sportingethos.health'),
  ('ENT','ENT','Ear, nose and throat diagnosis and treatment.','OPD','ear','#4338CA','2','Wing 1',650,'{"mon_sat":"09:00-17:00","sun":"closed"}','+91-11-4000-2015','ent@sportingethos.health'),
  ('Dentistry','DENTAL','General dentistry and oral surgery consultations.','OPD','smile','#0EA5E9','1','Wing 3',450,'{"mon_sat":"09:00-18:00","sun":"closed"}','+91-11-4000-2016','dental@sportingethos.health'),
  ('Emergency Department','ER','24x7 emergency triage and acute care.','SUPPORT','siren','#B91C1C','G','Wing 1',300,'{"always":"24x7"}','+91-11-4000-2017',null),
  ('Laboratory','LAB','Blood work, pathology and diagnostic sample testing.','SUPPORT','flask-conical','#0284C7','G','Wing 3',null,'{"mon_sat":"07:00-19:00","sun":"08:00-13:00"}','+91-11-4000-2018','lab@sportingethos.health'),
  ('Pharmacy','PHARM','In-house pharmacy for prescription dispensing.','SUPPORT','pill','#16A34A','G','Wing 3',null,'{"always":"24x7"}','+91-11-4000-2019','pharmacy@sportingethos.health')
) as d(name, code, description, department_type, icon, color, floor, location, consultation_fee, operating_hours, contact_number, email)
where h.code = 'SEH-DEL'
on conflict (hospital_id, code) do nothing;
