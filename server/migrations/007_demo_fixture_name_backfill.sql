-- Some early production seed runs used generated slugs that do not exactly match
-- the later fixture slug constants. Backfill demo flags by fixture company name too.
UPDATE startups
SET is_demo = TRUE, source = 'demo'
WHERE name = ANY(ARRAY[
  'TechFlow','CloudNine','DataPulse','SecureNet','GreenEnergy','HealthSync','FinTech Pro','EduLearn','Logistics AI','RetailTech','MediaStream','DevTools Co','CryptoVault','SmartCity','AgriTech','SpaceXplore','BioGen','LegalTech','GameStudio','MusicAI','TravelTech','FoodDelivery','RealEstate AI','FashionTech','SportsTech','NewsMedia','JobMatch','EventTech','AutoDrive','DroneTech','Robotics Co','VoiceAI','ChatBot Pro','CodeAssist','DesignAI','Marketing Pro','SalesTech','SupportHub','HR Tech','Payroll Pro','Inventory AI','Quality Control','Manufacturing AI','Supply Chain Pro','Warehouse Tech','Fleet Management','Insurance Tech','Banking API','Investment AI','Credit Score','Blockchain Co',
  'NeonLabs','GreenCart','FinFlow','EduSpark','CloudNative','FoodForward','SpaceLink','MindfulApp','Grand Ventures'
]);
