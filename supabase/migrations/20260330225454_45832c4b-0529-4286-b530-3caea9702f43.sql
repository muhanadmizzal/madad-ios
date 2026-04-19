
-- Clean ALL remaining FK-dependent tables for old Tamkeen employees
DELETE FROM employee_warnings WHERE employee_id IN (
  SELECT id FROM employees WHERE company_id = 'a1b2c3d4-0001-4000-8000-000000000001' 
  AND (email NOT LIKE '%@rafidain-demo.local' OR email IS NULL)
);

DELETE FROM employees WHERE company_id = 'a1b2c3d4-0001-4000-8000-000000000001' 
AND (email NOT LIKE '%@rafidain-demo.local' OR email IS NULL);

-- Clean orphan positions
DELETE FROM positions WHERE company_id = 'a1b2c3d4-0001-4000-8000-000000000001'
AND id NOT IN (SELECT position_id FROM employees WHERE company_id = 'a1b2c3d4-0001-4000-8000-000000000001' AND position_id IS NOT NULL);
