-- Clear existing incomplete data
DELETE FROM plan_features;

-- ===== FREE PLAN =====
INSERT INTO plan_features (plan_id, feature_key, included) VALUES
('8d599f15-5f3b-40f0-8b32-357de4c418b8', 'hr_core', true),
('8d599f15-5f3b-40f0-8b32-357de4c418b8', 'attendance', true),
('8d599f15-5f3b-40f0-8b32-357de4c418b8', 'documents', false),
('8d599f15-5f3b-40f0-8b32-357de4c418b8', 'payroll', false),
('8d599f15-5f3b-40f0-8b32-357de4c418b8', 'recruitment', false),
('8d599f15-5f3b-40f0-8b32-357de4c418b8', 'performance', false),
('8d599f15-5f3b-40f0-8b32-357de4c418b8', 'training', false),
('8d599f15-5f3b-40f0-8b32-357de4c418b8', 'advanced_analytics', false),
('8d599f15-5f3b-40f0-8b32-357de4c418b8', 'multi_branch', false);

-- ===== STARTER PLAN =====
INSERT INTO plan_features (plan_id, feature_key, included) VALUES
('be48a928-814c-4458-b790-2e8e72d18129', 'hr_core', true),
('be48a928-814c-4458-b790-2e8e72d18129', 'attendance', true),
('be48a928-814c-4458-b790-2e8e72d18129', 'documents', true),
('be48a928-814c-4458-b790-2e8e72d18129', 'payroll', true),
('be48a928-814c-4458-b790-2e8e72d18129', 'recruitment', false),
('be48a928-814c-4458-b790-2e8e72d18129', 'performance', false),
('be48a928-814c-4458-b790-2e8e72d18129', 'training', false),
('be48a928-814c-4458-b790-2e8e72d18129', 'advanced_analytics', false),
('be48a928-814c-4458-b790-2e8e72d18129', 'multi_branch', false);

-- ===== PRO PLAN =====
INSERT INTO plan_features (plan_id, feature_key, included) VALUES
('ca3bf206-bd78-4892-9007-40b781315b78', 'hr_core', true),
('ca3bf206-bd78-4892-9007-40b781315b78', 'attendance', true),
('ca3bf206-bd78-4892-9007-40b781315b78', 'documents', true),
('ca3bf206-bd78-4892-9007-40b781315b78', 'payroll', true),
('ca3bf206-bd78-4892-9007-40b781315b78', 'recruitment', true),
('ca3bf206-bd78-4892-9007-40b781315b78', 'performance', true),
('ca3bf206-bd78-4892-9007-40b781315b78', 'training', true),
('ca3bf206-bd78-4892-9007-40b781315b78', 'advanced_analytics', false),
('ca3bf206-bd78-4892-9007-40b781315b78', 'multi_branch', false);

-- ===== ENTERPRISE PLAN =====
INSERT INTO plan_features (plan_id, feature_key, included) VALUES
('9d7b74a2-c21a-4695-824d-bf74fc72adc4', 'hr_core', true),
('9d7b74a2-c21a-4695-824d-bf74fc72adc4', 'attendance', true),
('9d7b74a2-c21a-4695-824d-bf74fc72adc4', 'documents', true),
('9d7b74a2-c21a-4695-824d-bf74fc72adc4', 'payroll', true),
('9d7b74a2-c21a-4695-824d-bf74fc72adc4', 'recruitment', true),
('9d7b74a2-c21a-4695-824d-bf74fc72adc4', 'performance', true),
('9d7b74a2-c21a-4695-824d-bf74fc72adc4', 'training', true),
('9d7b74a2-c21a-4695-824d-bf74fc72adc4', 'advanced_analytics', true),
('9d7b74a2-c21a-4695-824d-bf74fc72adc4', 'multi_branch', true);