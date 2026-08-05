import os
import pandas as pd
import numpy as np
from datetime import datetime, date
from faker import Faker

# Initialize Faker and seed engines for deterministic data generation
fake = Faker()
fake.seed_instance(2025)
np.random.seed(2025)

TOTAL_EMPLOYEES = 150
OUTPUT_DIR = "Data/Promotions_model1"

# Ensure target folder structure is present on your system drive
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

def score_to_grade(score):
    if score >= 90: return 'A'
    elif score >= 75: return 'B'
    elif score >= 60: return 'C'
    elif score >= 45: return 'D'
    else: return 'E'

def grade_to_score(grade):
    mapping = {'A': 95, 'B': 85, 'C': 70, 'D': 60, 'E': 45}
    return mapping.get(grade, 20)

# Initialize unique tracking streams per table definition matrix
emp_prov = TokenGenerator("e")
off_prov = TokenGenerator("o")
mng_prov = TokenGenerator("m")  # For the explicit Managers master table rows
score_prov = TokenGenerator("s") # For manager_reviews.parquet row tokens
ann_prov = TokenGenerator("a")   # For annual_reviews.parquet row tokens
prm_prov = TokenGenerator("p")

# ==========================================================================
# 1. Generate MANAGERS Master Table (6 Business + 8 Industrial = 14 records)
# ==========================================================================
print("Generating Managers registry master table...")
managers_data = []

# Generate exactly 6 separate business sector manager IDs and names
business_managers_ids = [f"m_bus_{i}" for i in range(1, 7)]
for m_id in business_managers_ids:
    # FIXED: Corrected token generator variable reference from m_prov to mng_prov
    managers_data.append({"prov": mng_prov.next(), "managerId": m_id, "name": fake.name()})

# Generate exactly 8 separate industrial sector manager IDs and names
industrial_managers_ids = [f"m_ind_{i}" for i in range(1, 9)]
for m_id in industrial_managers_ids:
    # FIXED: Corrected token generator variable reference from m_prov to mng_prov
    managers_data.append({"prov": mng_prov.next(), "managerId": m_id, "name": fake.name()})

df_managers = pd.DataFrame(managers_data)

# ==========================================================================
# 2. Generate EMPLOYEES Table (150 records) -> employees.parquet
# ==========================================================================
print("Generating Employees dataset...")
employees_data = []
departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Legal"]

for emp_id in range(1, TOTAL_EMPLOYEES + 1):
    gender = np.random.choice(["male", "female", "non-binary"], p=[0.48, 0.48, 0.04])
    employees_data.append({
        "prov": emp_prov.next(), # e1, e2, ... e150
        "empId": emp_id, 
        "name": fake.name(), 
        "gender": gender,
        "birthdate": pd.to_datetime(fake.date_of_birth(minimum_age=22, maximum_age=65)),
        "department": np.random.choice(departments),
        "hireDate": pd.to_datetime(fake.date_between(start_date='-10y', end_date='now'))
    })
df_employees = pd.DataFrame(employees_data)

# ==========================================================================
# 3. Generate OFFICIAL REVIEWS Table -> official_reviews.parquet
# ==========================================================================
print("Generating Official Reviews dataset...")
official_reviews_data = []

# 2025: Employees 1..60
for emp_id in range(1, 61):  official_reviews_data.append({"prov": off_prov.next(), "empId": emp_id, "year": 2025, "score": np.random.randint(45, 101)})
# 2024: Employees 1..55
for emp_id in range(1, 56):  official_reviews_data.append({"prov": off_prov.next(), "empId": emp_id, "year": 2024, "score": np.random.randint(35, 101)})
# 2023: Employees 1..45
for emp_id in range(1, 46):  official_reviews_data.append({"prov": off_prov.next(), "empId": emp_id, "year": 2023, "score": np.random.randint(35, 101)})
df_official_reviews = pd.DataFrame(official_reviews_data)

# ==========================================================================
# 4. Generate MANAGER REVIEWS Table -> manager_reviews.parquet
# ==========================================================================
print("Generating Manager Reviews dataset (Tokens: s1, s2...)...")
manager_reviews_data = []

# 2025: Employees 1..60 (Max 6 Business Managers IDs referenced)
for emp_id in range(1, 61):  manager_reviews_data.append({"prov": score_prov.next(), "empId": emp_id, "year": 2025, "score": np.random.randint(45, 101), "managerId": np.random.choice(business_managers_ids)})
# 2024: Employees 1..50
for emp_id in range(1, 51):  manager_reviews_data.append({"prov": score_prov.next(), "empId": emp_id, "year": 2024, "score": np.random.randint(35, 101), "managerId": np.random.choice(business_managers_ids)})
# 2023: Employees 1..40
for emp_id in range(1, 41):  manager_reviews_data.append({"prov": score_prov.next(), "empId": emp_id, "year": 2023, "score": np.random.randint(35, 101), "managerId": np.random.choice(business_managers_ids)})
df_manager_reviews = pd.DataFrame(manager_reviews_data)

# ==========================================================================
# 5. Generate ANNUAL REVIEWS Table -> annual_reviews.parquet
# ==========================================================================
print("Generating Annual Reviews dataset...")
annual_reviews_data = []

# 2025: Employees 61..150 (Max 8 Industrial Managers IDs referenced)
for emp_id in range(61, 151): 
    annual_reviews_data.append({
        "prov": ann_prov.next(), "empId": emp_id, "year": 2025,
        "officialScore": np.random.randint(45, 101), "managerScore": score_to_grade(np.random.randint(45, 101)), "managerId": np.random.choice(industrial_managers_ids)
    })
# 2024: Employees 61..140
for emp_id in range(61, 141): 
    annual_reviews_data.append({
        "prov": ann_prov.next(), "empId": emp_id, "year": 2024,
        "officialScore": np.random.randint(35, 101), "managerScore": score_to_grade(np.random.randint(35, 101)), "managerId": np.random.choice(industrial_managers_ids)
    })
df_annual_reviews = pd.DataFrame(annual_reviews_data)

# Pre-compile analytical data lookups to sync up Promotion algorithm requirements
scores_lookup = {}
for r in official_reviews_data:
    if r['year'] == 2025: scores_lookup[r['empId']] = {'off': r['score'], 'mng': 55}
for r in manager_reviews_data:
    if r['year'] == 2025 and r['empId'] in scores_lookup: scores_lookup[r['empId']]['mng'] = r['score']
for r in annual_reviews_data:
    if r['year'] == 2025: scores_lookup[r['empId']] = {'off': r['officialScore'], 'mng': grade_to_score(r['managerScore'])}

# ==========================================================================
# 6. Generate PROMOTIONS Table (Advanced XAI Logic Rules Model) -> promotions.parquet
# ==========================================================================
print("Generating Promotions dataset matrix...")
promotions_data = []
positions = ["Junior Associate", "Associate", "Senior Associate", "Lead", "Manager", "Director"]
decision_sources = ["HR committee", "Manager", "Automatic Recommendation"]

# Target exactly 50 employees to consider for evaluation checks in Jan 2025
target_promo_employees = np.random.choice(range(1, TOTAL_EMPLOYEES + 1), size=50, replace=False)
large_override_targets = np.random.choice(target_promo_employees, size=4, replace=False)
manager_large_overrides_count = 0

for emp_id in target_promo_employees:
    source = np.random.choice(decision_sources, p=[0.35, 0.35, 0.30])
    scores = scores_lookup.get(emp_id, {'off': 55, 'mng': 55})
    avg_score = (scores['off'] + scores['mng']) / 2.0
    decision = "not promoted"
    
    # 1. Deterministic Rule
    if source == "Automatic Recommendation" and avg_score >= 65: 
        decision = "promoted"
    # 2. Small Marginal HR Deviation Rule
    elif source == "HR committee" and (avg_score + np.random.randint(-4, 5)) >= 65: 
        decision = "promoted"
    # 3. Discretionary Manager Rule + Explicit Subversive Anomalies
    elif source == "Manager":
        if emp_id in large_override_targets and manager_large_overrides_count < 4:
            decision = "promoted"
            manager_large_overrides_count += 1
            comments = "Exceptional discretionary recommendation: Approved via direct manager override due to strong performance."
        elif ((0.3 * scores['off']) + (0.7 * scores['mng'])) >= 62: 
            decision = "promoted"

    old_pos = np.random.choice(positions[:4])
    new_pos = positions[positions.index(old_pos) + 1] if decision == "promoted" else old_pos
    if 'comments' not in locals(): comments = f"Review evaluation concluded by {source}. Decision: {decision.upper()}."
    
    promotions_data.append({
        "prov": prm_prov.next(), "empId": emp_id, "date": pd.to_datetime(fake.date_between_dates(date_start=date(2025, 1, 1), date_end=date(2025, 1, 31))),
        "oldPosition": old_pos, "newPosition": new_pos, "decision": decision, "decisionSource": source, "comments": comments
    })
    if 'comments' in locals(): del comments
df_v1_promotions = pd.DataFrame(promotions_data)

# ==========================================================================
# Columnar Parquet File Persistence Export System
# ==========================================================================
print(f"\nWriting files natively to output target location: '{OUTPUT_DIR}/' ...")
df_managers.to_parquet(f"{OUTPUT_DIR}/managers.parquet", index=False)
df_employees.to_parquet(f"{OUTPUT_DIR}/employees.parquet", index=False)
df_official_reviews.to_parquet(f"{OUTPUT_DIR}/official_reviews.parquet", index=False)
df_manager_reviews.to_parquet(f"{OUTPUT_DIR}/manager_reviews.parquet", index=False)
df_annual_reviews.to_parquet(f"{OUTPUT_DIR}/annual_reviews.parquet", index=False)
df_v1_promotions.to_parquet(f"{OUTPUT_DIR}/promotions.parquet", index=False)

print("Complete database dataset generated and exported error-free!")
print(f" -> Files stored in directory folder: {os.path.abspath(OUTPUT_DIR)}")
print(f" -> Confirmed unique anomalies generated: {manager_large_overrides_count}")

                            