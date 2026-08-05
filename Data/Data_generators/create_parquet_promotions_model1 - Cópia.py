import pandas as pd
import numpy as np
from datetime import datetime, date
from faker import Faker

# Initialize Faker for realistic mock name generation
fake = Faker()
fake.seed_instance(101)
np.random.seed(101)

# Global configuration metrics
TOTAL_EMPLOYEES = 150

class TokenGenerator:
    def __init__(self, prefix):
        self.prefix = prefix
        self.counter = 1
        
    def next(self):
        token = f"{self.prefix}{self.counter}"
        self.counter += 1
        return token

emp_prov = TokenGenerator("e")
off_prov = TokenGenerator("o")
mng_prov = TokenGenerator("m")
ann_prov = TokenGenerator("a")
prm_prov = TokenGenerator("p")

# Generate closed pools of Manager Names
BUSINESS_MANAGERS = [fake.name() for _ in range(6)]
INDUSTRIAL_MANAGERS = [fake.name() for _ in range(8)]

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
# 1. Generate EMPLOYEES Table (150 records)
# ==========================================================================
print("Generating Employees data...")
employees_data = []
departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Operations", "Legal"]

for emp_id in range(1, TOTAL_EMPLOYEES + 1):
    gender = np.random.choice(["male", "female", "non-binary"], p=[0.48, 0.48, 0.04])
    birth_date = fake.date_of_birth(minimum_age=22, maximum_age=65)
    hire_date = fake.date_between(start_date='-10y', end_date='now')
    
    employees_data.append({
        "prov": emp_prov.next(),
        "empId": emp_id,
        "name": fake.name(),
        "gender": gender,
        "birthdate": pd.to_datetime(birth_date),
        "department": np.random.choice(departments),
        "hireDate": pd.to_datetime(hire_date)
    })

df_employees = pd.DataFrame(employees_data)

# ==========================================================================
# 2. Generate OFFICIAL REVIEWS Table
# ==========================================================================
print("Generating Official Reviews data...")
official_reviews_data = []

for emp_id in range(1, 61):
    official_reviews_data.append({"prov": off_prov.next(), "empId": emp_id, "year": 2025, "score": np.random.randint(40, 101)})
for emp_id in range(1, 55):
    official_reviews_data.append({"prov": off_prov.next(), "empId": emp_id, "year": 2024, "score": np.random.randint(30, 101)})
for emp_id in range(1, 45):
    official_reviews_data.append({"prov": off_prov.next(), "empId": emp_id, "year": 2023, "score": np.random.randint(30, 101)})

df_official_reviews = pd.DataFrame(official_reviews_data)

# ==========================================================================
# 3. Generate MANAGER REVIEWS Table (Business Sector - Max 6 Named Managers)
# ==========================================================================
print("Generating Manager Reviews data...")
manager_reviews_data = []

for emp_id in range(1, 61):
    manager_reviews_data.append({"prov": mng_prov.next(), "empId": emp_id, "year": 2025, "score": np.random.randint(40, 101), "managerId": np.random.choice(BUSINESS_MANAGERS)})
for emp_id in range(1, 51):
    manager_reviews_data.append({"prov": mng_prov.next(), "empId": emp_id, "year": 2024, "score": np.random.randint(30, 101), "managerId": np.random.choice(BUSINESS_MANAGERS)})
for emp_id in range(1, 41):
    manager_reviews_data.append({"prov": mng_prov.next(), "empId": emp_id, "year": 2023, "score": np.random.randint(30, 101), "managerId": np.random.choice(BUSINESS_MANAGERS)})

df_manager_reviews = pd.DataFrame(manager_reviews_data)

# ==========================================================================
# 4. Generate ANNUAL REVIEWS Table (Industrial Sector - Max 8 Named Managers)
# ==========================================================================
print("Generating Annual Reviews data...")
annual_reviews_data = []

for emp_id in range(61, 151):
    annual_reviews_data.append({
        "prov": ann_prov.next(), "empId": emp_id, "year": 2025,
        "officialScore": np.random.randint(40, 101), "managerScore": score_to_grade(np.random.randint(40, 101)), "managerId": np.random.choice(INDUSTRIAL_MANAGERS)
    })
for emp_id in range(61, 141):
    annual_reviews_data.append({
        "prov": ann_prov.next(), "empId": emp_id, "year": 2024,
        "officialScore": np.random.randint(30, 101), "managerScore": score_to_grade(np.random.randint(30, 101)), "managerId": np.random.choice(INDUSTRIAL_MANAGERS)
    })

df_annual_reviews = pd.DataFrame(annual_reviews_data)

# Helper dictionaries to look up scores efficiently during promotion logic mapping
scores_lookup = {}
for r in official_reviews_data:
    if r['year'] == 2025:
        scores_lookup[r['empId']] = {'off': r['score'], 'mng': 50}
for r in manager_reviews_data:
    if r['year'] == 2025 and r['empId'] in scores_lookup:
        scores_lookup[r['empId']]['mng'] = r['score']
for r in annual_reviews_data:
    if r['year'] == 2025:
        scores_lookup[r['empId']] = {'off': r['officialScore'], 'mng': grade_to_score(r['managerScore'])}

# ==========================================================================
# 5. Generate PROMOTIONS Table (Advanced XAI Decision Rules Matrix)
# ==========================================================================
print("Generating Promotions data with XAI decision rules...")
promotions_data = []
positions = ["Junior Associate", "Associate", "Senior Associate", "Lead", "Manager", "Director"]
decision_sources = ["HR committee", "Manager", "Automatic Recommendation"]

# Sample exactly 50 target candidates to review for promotion streams in January 2025
target_promo_employees = np.random.choice(range(1, TOTAL_EMPLOYEES + 1), size=50, replace=False)

# Track intentional manager anomaly count overrides globally to hit exactly 4 instances
manager_large_overrides_count = 0
large_override_targets = np.random.choice(target_promo_employees, size=4, replace=False)

for emp_id in target_promo_employees:
    source = np.random.choice(decision_sources, p=[0.35, 0.35, 0.30])
    
    # Extract historical composite context layer (default mid-level score if no 2025 data available)
    emp_scores = scores_lookup.get(emp_id, {'off': 55, 'mng': 55})
    avg_score = (emp_scores['off'] + emp_scores['mng']) / 2.0
    
    decision = "not promoted"
    
    # Condition A: Absolute Mathematical Rules
    if source == "Automatic Recommendation":
        if avg_score >= 65:
            decision = "promoted"
            
    # Condition B: HR Committee Rules (Small marginal variations)
    elif source == "HR committee":
        # Slight randomized fuzzing factor (-4 to +4) around the critical 65 cutoff marker
        fuzzed_score = avg_score + np.random.randint(-4, 5)
        if fuzzed_score >= 65:
            decision = "promoted"
            
    # Condition C: Manager Discretionary Bias Rules (Strongly tied to M.score + explicit outlier anomalies)
    elif source == "Manager":
        # Strategy: Standard bias relies more heavily on subjective manager satisfaction metrics
        manager_bias_baseline = (0.3 * emp_scores['off']) + (0.7 * emp_scores['mng'])
        
        # Inject EXACTLY 3-5 massive human sentiment override variations
        if emp_id in large_override_targets and manager_large_overrides_count < 4:
            decision = "promoted"
            manager_large_overrides_count += 1
            comments = "Exceptional discretionary recommendation: Approved via direct manager override due to strong performance."
        else:
            if manager_bias_baseline >= 62:
                decision = "promoted"

    # Set up matching titles changes
    old_pos_idx = np.random.randint(0, len(positions) - 1)
    old_pos = positions[old_pos_idx]
    new_pos = positions[old_pos_idx + 1] if decision == "promoted" else old_pos
    
    if 'comments' not in locals() or not comments.startswith("Exceptional"):
        comments = f"Review evaluation concluded by {source}. Decision: {decision.upper()}."

    promo_date = fake.date_between_dates(date_start=date(2025, 1, 1), date_end=date(2025, 1, 31))
    
    promotions_data.append({
        "prov": prm_prov.next(),
        "empId": emp_id,
        "date": pd.to_datetime(promo_date),
        "oldPosition": old_pos,
        "newPosition": new_pos,
        "decision": decision,
        "decisionSource": source,
        "comments": comments
    })
    
    # Clean workspace scope reference trackers
    if "comments" in locals(): del comments

df_promotions = pd.DataFrame(promotions_data)

# Export DataFrames to Parquet Format Files
print("\nExporting columnar Parquet assets...")
df_employees.to_parquet("Data/Promotions_v3/employees.parquet", index=False)
df_official_reviews.to_parquet("Data/Promotions_v3/official_reviews.parquet", index=False)
df_manager_reviews.to_parquet("Data/Promotions_v3/manager_reviews.parquet", index=False)
df_annual_reviews.to_parquet("Data/Promotions_v3/annual_reviews.parquet", index=False)
df_promotions.to_parquet("Data/Promotions_v3/promotions.parquet", index=False)

print(f"Completed file execution successfully. Generated exactly {manager_large_overrides_count} large manager anomalies.")
