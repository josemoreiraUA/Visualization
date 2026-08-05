# VERSION 1: Create promotions model in parquet.

I want to create the following files in parquet using python:
1. Employees(empId, name, gender, birthdate, department, hireDate)
   The gender can be male, female or non-binary
2. OfficialReviews(empId, year, score)
   empId is like a FK to Employees(empId). The score is an integer in 0...100.
3. Managers(managerId, name) 
3. ManagerReviews(empId, year, score, managerId)
   empId is like a FK to Employees(empId). The score is an integer in 0...100.
4. AnnualReviews(empId, offocialScore, managerScore, managerId)
   empId is like a FK to Employees(empId). The officialScore is an integer in 0...100. The managerScore is a letter in A, B, ..., E.
5. Promotions(empId, date, oldPosition, newPosition, decision, decisionSource, comments).
   All dates are in january 2025. The values of decision are 'promoted' or 'not promoted'. The values of decisionSource are like: HR committee, Manager, Automatic Recommendation. 

+ Employees hold the data from all employees in a company.
+ OfficialReviews and ManagerReviews are the tables with the reviews of the employees in the business sector. 
+ AnnualReviews holds the reviews of the employees in the industrial sector.
+ I just want to have 6 managers at most in ManagerReviews and 8 managers in AnnualReviews. Thus, 14 manager in total.
+ The promoted / not promoted values depend mostly but not exactly on the combination of scores. Higher scores are promoted, lower scores are not promoted. When the DecisionSource is 'Automatic recommendation', the promoted / not promoted values depend exactly on the scores; the variations occur for HR commitee decisions (small variations) and Manager decisions (medium in most cases, 3-5 large variations). The latter should be correlated with the manager scores.

1. The table Employees has 150 records.
2. The table OfficialReviews has the official reviews (scores) of employees 1..60 in 2025, the reviews of employees 1..55 in 2024, and the reviews of employees 1..45 in 2023.
3. The table ManagerReviews has the manager reviews (scores) of employees 1..60 in 2025, the reviews of employees 1..50 in 2024, and the reviews of employees 1..40 in 2023.
4. The table ManagerReviews has the manager reviews (scores) of employees 61..150 in 2025 and the reviews of employees 61..140 in 2024No reviews in 2023.

Each table must have a column named 'prov'. Each record holds a unique token identifier in the format: t1, t2, ..., t150, for the employees; o1, o2, ... for the official reviews, and so on.
 
Give the Python script to create files in Parquet. The files are to by stored in the folder Data/promotions in the project structure. 
Give the Python script to create the previwes files in Parquet. The files are to by stored in the folder Data/promotions_v2 in the project structure.



# VERSION 2: Create promotions model in parquet.

I want to create a revised version of the database in parquet that will replace the previous data model, as follows:
1. Employees(empId, name, gender, birthdate, department, hireDate, position)
   The gender can be male, female or non-binary
2. OfficialReviews(empId, year, score)
   empId is like a FK to Employees(empId). The score is an integer in 0...100.
3. Managers(managerId, name)
3. ManagerReviews_scores(empId, year, score, managerId)
   empId is like a FK to Employees(empId). The score is an integer in 0...100.
4. ManagerReviews_grades(empId, grade, managerId)
   empId is like a FK to Employees(empId). The grade is a letter in A, B, ..., E.
5. Promotions(empId, date, oldPosition, newPosition, decision, decisionSource, comments).
   All dates are in january 2026. The values of decision are 'promoted' or 'not promoted'. The values of decisionSource are like: HR committee, Manager, Automatic Recommendation. 

+ Employees hold the data from all employees in a company.
+ OfficialReviews holds the scores of annual reviews for each employee.
+ ManagerReviews_scores holds the annual reviews of the employees in the business sector. 
+ ManagerReviews_grades holds the reviews of the employees in the industrial sector.
+ I just want to have 6 managers at most in ManagerReviews_scores and 8 managers in ManagerReviews_grades.
+ The promoted / not promoted values depend mostly but not exactly on the combination of scores. Higher scores are promoted, lower scores are not promoted. When the DecisionSource is 'Automatic recommendation', the promoted / not promoted values depend exactly on the scores; the variations occur for HR commitee decisions (small variations) and Manager decisions (medium in most cases, 3-5 large variations). The latter should be correlated with the manager scores.
+ The position values in employees table should be equal to the last newPosition of the corresponding umpId in the promotions table, when applicable.

1. The table Employees has 150 records.
2. The table OfficialReviews has the official reviews (scores) of employees 1..150 in 2025, the reviews of employees 1..140 in 2024, and the reviews of employees 1..125 in 2023.
3. The table ManagerReviews_scores has the manager reviews (scores) of employees 1..60 in 2025, the reviews of employees 1..50 in 2024, and the reviews of employees 1..40 in 2023.
4. The table ManagerReviews_grades has the manager reviews (scores) of employees 61..150 in 2025 and the reviews of employees 61..140 in 2024. No reviews in 2023.

Each table must have a column named 'prov'. Each record holds a unique token identifier in the format: t1, t2, ..., t150, for the employees; o1, o2, ... for the official reviews, s1, s2, ... for manager scores, g1, g2, ... for manager grades, and so on.
 
Give the Python script to create files in Parquet. The files are to by stored in the folder Data/promotions in the project structure.