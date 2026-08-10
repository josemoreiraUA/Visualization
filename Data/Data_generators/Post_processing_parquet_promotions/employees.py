import pandas as pd

input_file = "Data/Promotions_model1/employees_old.parquet"
output_file = "Data/Promotions_model1/employees.parquet"

name_updates = {
    'emp-201': "Carla Gomez",
    'emp-202': "David Miller",
    'emp-101': "Alice Smith",
    'emp-102': "Michael Tatum",
    'emp-103': "John Ewing",
    'emp-104': "Nancy Davis",
}

# Read the Parquet file
df = pd.read_parquet(input_file)

# Make sure there are at least 150 rows
if len(df) < 150:
    raise ValueError(f"Expected at least 150 rows, but found {len(df)}")

# First 60 rows: emp-201 ... emp-260
df.loc[df.index[:60], "empId"] = [
    f"emp-{i}" for i in range(201, 261)
]

# Rows 61–150: emp-101 ... emp-190
df.loc[df.index[60:150], "empId"] = [
    f"emp-{i}" for i in range(101, 191)
]

# Update names according to empId
df["name"] = df["empId"].map(name_updates).fillna(df["name"])

# Save the modified data
df.to_parquet(output_file, index=False)

print(f"Saved updated file to: {output_file}")