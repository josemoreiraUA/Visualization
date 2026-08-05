import os
import pandas as pd
import numpy as np
from datetime import datetime, date
from faker import Faker

# Initialize Faker for realistic mock generation
fake = Faker()
fake.seed_instance(2026)
np.random.seed(2026)

# Global Configuration Parameters
TOTAL_EMPLOYEES = 150
OUTPUT_DIR = "Data/promotions"

# Ensure the output directory exists in the project structure
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Entity-specific incremental token generator class
class TokenGenerator:
    def __init__(self, prefix):
        self.prefix = prefix
        self.counter = 1
        
    def next(self):
        token = f"{self.prefix}{self.counter}"
        self.counter += 1
        return token

# Initialize isolated sequence managers for each provenance mapping
emp_prov = TokenGenerator("e")
off_prov = TokenGenerator("o")
mng_prov = TokenGenerator("m")  # For Managers master table
score_prov = TokenGenerator("s") # For ManagerReviews_scores
grade_prov = TokenGenerator("g") # For ManagerReviews_grades
prm_prov = TokenGenerator("p")   # For Promotions

# Helper translation mappings
def score_to_grade(score):
    if score >= 90: return 'A'
    elif score >= 75: return 'B'
    elif score >= 60: return 'C'
    elif score >= 45: return 'D'
    else: return 'E'

def grade_to_score(grade):
    mapping = {'A': 95, 'B': 82, 'C': 68, 'D': 52, 'E': 30}
    return mapping.get(grade, 50)

# ==========================================================================
# 1. Generate MANAGERS Master Table (6 Business + 8 Industrial = 14 records)
# ==========================================================================
print("Generating Managers registry...")
managers_data = []

# Generate exactly 6 separate business sector managers
business_managers_ids = [mng_prov.next() for _ in range(6)]
for m_id in business_managers_ids:
    managers_data.append({"prov": m_id, "managerId": m_id, "name": fake.name()})

# Generate exactly 8 separate industrial sector managers
industrial_managers_ids = [mng_prov.next() for _ in range(8)]
for m_id in industrial_managers_ids:
    managers_data.append({"prov": m_id, "managerId": m_id, "name": fake.name()})

df_managers = pd.DataFrame(managers_data)

# ==========================================================================
# 2. Generate OFFICIAL REVIEWS Table
# ==========================================================================
print("Generating Official Reviews dataset...")
official_reviews_data = []

# 2025: Employees 1..150
for emp_id in range(1, 151):
    official_reviews_data.append({"prov": off_prov.next(), "empId": emp_id, "year": 2025, "score": np.random.randint(45, 101)})

# 2024: Employees 1..140
for emp_id in range(1, 141):
    official_reviews_data.append({"prov": off_prov.next(), "empId": emp_id, "year": 2024, "score": np.random.randint(35, 101)})

# 2023: Employees 1..125
for emp_id in range(1, 126):
    official_reviews_data.append({"prov": off_prov.next(), "empId": emp_id, "year": 2023, "score": np.random.randint(35, 101)})

df_official_reviews = pd.DataFrame(official_reviews_data)

# ==========================================================================
# 3. Generate MANAGER REVIEWS (SCORES) Table (Business Sector: 1..60)
# ==========================================================================
print("Generating Manager Reviews Scores...")
manager_scores_data = []

# 2025: Employees 1..60
for emp_id in range(1, 61):
    manager_scores_data.append({"prov": score_prov.next(), "empId": emp_id, "year": 2025, "score": np.random.randint(45, 101), "managerId": np.random.choice(business_managers_ids)})

# 2024: Employees 1..50
for emp_id in range(1, 51):
    manager_scores_data.append({"prov": score_prov.next(), "empId": emp_id, "year": 2024, "score": np.random.randint(35, 101), "managerId": np.random.choice(business_managers_ids)})

# 2023: Employees 1..40
for emp_id in range(1, 41):
    manager_scores_data.append({"prov": score_prov.next(), "empId": emp_id, "year": 2023, "score": np.random.randint(35, 101), "managerId": np.random.choice(business_managers_ids)})

df_manager_scores = pd.DataFrame(manager_scores_data)

# ==========================================================================
# 4. Generate MANAGER REVIEWS (GRADES) Table (Industrial Sector: 61..150)
# ==========================================================================
print("Generating Manager Reviews Grades...")
manager_grades_data = []

# 2025: Employees 61..150
for emp_id in range(61, 151):
    grade = score_to_grade(np.random.randint(40, 101))
    manager_grades_data.append({"prov": grade_prov.next(), "empId": emp_id, "year": 2025, "grade": grade, "managerId": np.random.choice(industrial_managers_ids)})

# 2024: Employees 61..140
for emp_id in range(61, 141):
    grade = score_to_grade(np.random.randint(35, 101))
    manager_grades_data.append({"prov": grade_prov.next(), "empId": emp_id, "year": 2024, "grade": grade, "managerId": np.random.choice(industrial_managers_ids)})

df_manager_grades = pd.DataFrame(manager_grades_data)

# Pre-compile 2025 analytical metrics lookups to inject data into Promotion algorithms
scores_lookup = {}
for r in official_reviews_data:
    if r['year'] == 2025:
        scores_lookup[r['empId']] = {'off': r['score'], 'mng': 55}
for r in manager_scores_data:
    if r['year'] == 2025 and r['empId'] in scores_lookup:
        scores_lookup[r['empId']]['mng'] = r['score']
for r in manager_grades_data:
    if r['year'] == 2025 and r['empId'] in scores_lookup:
        scores_lookup[r['empId']]['mng'] = grade_to_score(r['grade'])

# ==========================================================================
# 5. Generate PROMOTIONS Table (Isolating decisions within Jan 2026)
# ==========================================================================
print("Generating Promotions matrix profiles...")
promotions_data = []
positions_pool = ["Junior Associate", "Associate", "Senior Associate", "Lead", "Manager", "Director"]
decision_sources = ["HR committee", "Manager", "Automatic Recommendation"]

# Review a pool of 65 random candidates for promotion consideration
target_promo_employees = np.random.choice(range(1, TOTAL_EMPLOYEES + 1), size=65, replace=False)

# Track precise human overrides count limit boundaries
manager_large_overrides_count = 0
large_override_targets = np.random.choice(target_promo_employees, size=4, replace=False)

# Keep track of the final confirmed choices to update the base employee master matrix
final_position_map = {}

for emp_id in range(1, TOTAL_EMPLOYEES + 1):
    # Establish a default starter role configuration
    old_pos = np.random.choice(positions_pool[:4])
    
    if emp_id in target_promo_employees:
        source = np.random.choice(decision_sources, p=[0.35, 0.35, 0.30])
        emp_scores = scores_lookup.get(emp_id, {'off': 55, 'mng': 55})
        avg_score = (emp_scores['off'] + emp_scores['mng']) / 2.0
        
        decision = "not promoted"
        
        # Rule set 1: Pure mathematical bounds
        if source == "Automatic Recommendation":
            if avg_score >= 65:
                decision = "promoted"
                
        # Rule set 2: Slight variations around borderlines
        elif source == "HR committee":
            if (avg_score + np.random.randint(-4, 5)) >= 65:
                decision = "promoted"
                
        # Rule set 3: Manager discretionary loops with strict outlier injections
        elif source == "Manager":
            manager_bias_baseline = (0.3 * emp_scores['off']) + (0.7 * emp_scores['mng'])
            
            if emp_id in large_override_targets and manager_large_overrides_count < 4:
                decision = "promoted"
                manager_large_overrides_count += 1
                comments = "Exceptional discretionary recommendation: Approved via direct manager override due to strong performance."
            else:
                if manager_bias_baseline >= 62:
                    decision = "promoted"

        # Apply position updates based on evaluation output
        if decision == "promoted":
            current_idx = positions_pool.index(old_pos)
            new_position = positions_pool[current_idx + 1]
        else:
            new_position = old_pos
            
        if 'comments' not in locals() or not comments.startswith("Exceptional"):
            comments = f"Review evaluation concluded by {source}. Decision: {decision.upper()}."

        promo_date = fake.date_between_dates(date_start=date(2026, 1, 1), date_end=date(2026, 1, 31))
        
        promotions_data.append({
            "prov": prm_prov.next(),
            "empId": emp_id,
            "date": pd.to_datetime(promo_date),
            "oldPosition": old_pos,
            "newPosition": new_position,
            "decision": decision,
            "decisionSource": source,
            "comments": comments
        })
        final_position_map[emp_id] = new_position
        if "comments" in locals(): del comments
    else:
        # Fallback tracking if employee was not selected for validation cycles
        final_position_map[emp_id] = old_pos

df_promotions = pd.DataFrame(promotions_data)

# ==========================================================================
# 6. Generate EMPLOYEES Table (150 records)
# ==========================================================================
print("Generating final Employees data configuration...")
employees_data = []
departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Legal"]

for emp_id in range(1, TOTAL_EMPLOYEES + 1):
    gender = np.random.choice(["male", "female", "non-binary"], p=[0.48, 0.48, 0.04])
    birth_date = fake.date_of_birth(minimum_age=22, maximum_age=65)
    hire_date = fake.date_between(start_date='-10y', end_date='now')
    
    # Backport constraint mapping rule: Force matching current position value
    current_assigned_position = final_position_map.get(emp_id, "Associate")
    
# ==========================================================================
# 6. Generate EMPLOYEES Table (150 records)
# ==========================================================================
print("Generating final Employees data configuration...")
employees_data = []
departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Legal"]

for emp_id in range(1, TOTAL_EMPLOYEES + 1):
    gender = np.random.choice(["male", "female", "non-binary"], p=[0.48, 0.48, 0.04])
    birth_date = fake.date_of_birth(minimum_age=22, maximum_age=65)
    hire_date = fake.date_between(start_date='-10y', end_date='now')
    
    # Backport constraint mapping rule: Force matching current position value
    current_assigned_position = final_position_map.get(emp_id, "Associate")
    
    employees_data.append({
        "prov": emp_prov.next(), # Generates e1, e2, ... e150 cleanly
        "empId": emp_id,
        "name": fake.name(),
        "gender": gender,
        "birthdate": pd.to_datetime(birth_date),
        "department": np.random.choice(departments),
        "hireDate": pd.to_datetime(hire_date),
        "position": current_assigned_position # Aligns perfectly with last promotion values
    })

df_employees = pd.DataFrame(employees_data)

# ==========================================================================
# Export DataFrames directly to your directory path destination in Parquet Format
# ==========================================================================
print(f"\nWriting files directly into the repository folder space: '{OUTPUT_DIR}/' ...")

df_employees.to_parquet(f"{OUTPUT_DIR}/employees.parquet", index=False)
df_official_reviews.to_parquet(f"{OUTPUT_DIR}/official_reviews.parquet", index=False)
df_managers.to_parquet(f"{OUTPUT_DIR}/managers.parquet", index=False)
df_manager_scores.to_parquet(f"{OUTPUT_DIR}/manager_reviews_scores.parquet", index=False)
df_manager_grades.to_parquet(f"{OUTPUT_DIR}/manager_reviews_grades.parquet", index=False)
df_promotions.to_parquet(f"{OUTPUT_DIR}/promotions.parquet", index=False)

print("Parquet database generation pipeline completed successfully!")
print(f" -> Output destination path: {os.path.abspath(OUTPUT_DIR)}")
print(f" -> Injected a total of {manager_large_overrides_count} explicit manager anomalies.")
