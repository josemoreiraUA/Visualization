-- Query 1: promotions by employee
SELECT  E.empId, 
        E.name, 
        E.gender, 
        strftime(E.birthdate, '%Y-%m-%d') AS birthdate, 
        strftime(E.hireDate, '%Y-%m-%d') AS hireDate, 
        E.department,
        O.score AS officialScore, 
        M.managerScore, 
        M.managerId,
        (0.5 * O.score + 0.5 * M.managerScore)::DOUBLE AS 'global score',
        P.decision,
        strftime(P.date, '%Y-%m-%d') AS promotionDate

FROM    employees.parquet E, 
        official_reviews.parquet O, 
        (
            SELECT  S.empId, 
                    S.year, 
                    S.score as managerScore, 
                    S.managerId, 
                    S.prov
            FROM   manager_reviews_scores.parquet S
            WHERE  S.year = 2025    

                UNION ALL

            SELECT  G.empId, 
                    G.year, 
                    CASE G.grade 
                        WHEN 'A' THEN 100
                        WHEN 'B' THEN 85
                        WHEN 'C' THEN 70
                        WHEN 'D' THEN 60
                        WHEN 'E' THEN 45
                        ELSE 20 
                    END    as managerScore, 
                    G.managerId, 
                    G.prov
            FROM   manager_reviews_grades.parquet G
            WHERE  G.year = 2025    
        ) M,                
        promotions.parquet P

WHERE   E.empId = O.empId
AND     E.empId = M.empId
AND     E.empId = P.empId
AND     O.year = 2025
AND     M.year = 2025
AND     P.date >= '2026-01-01' 



-- Query 1p: promotions by employee with provenance
SELECT  E.empId, 
        E.name, 
        E.gender, 
        strftime(E.birthdate, '%Y-%m-%d') AS birthdate, 
        strftime(E.hireDate, '%Y-%m-%d') AS hireDate, 
        E.department,
        O.score AS officialScore, 
        M.managerScore, 
        M.managerId,
        (0.5 * O.score + 0.5 * M.managerScore)::DOUBLE AS 'global score',
        P.decision,
        strftime(P.date, '%Y-%m-%d') AS promotionDate,
        E.prov || '⊗' || O.prov || '⊗' || M.prov || '⊗' || P.prov as prov

FROM    employees.parquet E, 
        official_reviews.parquet O, 
        (
            SELECT  S.empId, 
                    S.year, 
                    S.score as managerScore, 
                    S.managerId, 
                    S.prov
            FROM   manager_reviews_scores.parquet S
            WHERE  S.year = 2025    

                UNION ALL

            SELECT  G.empId, 
                    G.year, 
                    CASE G.grade 
                        WHEN 'A' THEN 100
                        WHEN 'B' THEN 85
                        WHEN 'C' THEN 70
                        WHEN 'D' THEN 60
                        WHEN 'E' THEN 45
                        ELSE 20 
                    END    as managerScore, 
                    G.managerId, 
                    G.prov
            FROM   manager_reviews_grades.parquet G
            WHERE  G.year = 2025    
        ) M,                
        promotions.parquet P

WHERE   E.empId = O.empId
AND     E.empId = M.empId
AND     E.empId = P.empId
AND     O.year = 2025
AND     M.year = 2025
AND     P.date >= '2026-01-01' 




