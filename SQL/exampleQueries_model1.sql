
-- Query 1 with provenance - promotions by employee
SELECT  E.empId, 
        E.name, 
        E.gender, 
        strftime(E.birthdate, '%Y-%m-%d') AS birthdate, 
        strftime(E.hireDate, '%Y-%m-%d') AS hireDate, 
        E.department, 
        R.officialScore, 
        R.managerScore,
        (0.5 * R.officialScore + 0.5 * R.managerScore)::DOUBLE AS score, 
        R.managerId, 
        P.decision,
        E.prov || '⊗' || R.prov  || '⊗' || P.prov as prov

FROM    employees.parquet E, promotions.parquet P, (
    SELECT  O.empId, 
            O.year, 
            O.score as officialScore, 
            M.score as managerScore, 
            M.managerId, 
            O.prov || '⊗' || M.prov as prov

    FROM    official_reviews.parquet O, 
            manager_reviews.parquet M
    WHERE   O.empId = M.empId
    AND     O.year = 2025
    AND     O.year = M.year

        UNION ALL
    
    SELECT  A.empId, 
            A.year, 
            A.officialScore,
            CASE A.managerScore 
                WHEN 'A' THEN 100
                WHEN 'B' THEN 85
                WHEN 'C' THEN 70
                WHEN 'D' THEN 60
                WHEN 'E' THEN 45
                ELSE 20 
            END    as managerScore, 
            A.managerId, 
            A.prov
    FROM   annual_reviews.parquet A
    WHERE  year = 2025    
    ) R
WHERE   e.empId = R.empId
AND     e.empId = P.empId
AND     R.year = 2025

