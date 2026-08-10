import pandas as pd

input_file = "Data/Promotions_model1/Employees_training.parquet"
output_file = "Data/Promotions_model1/Employees_training_updated.parquet"

# Read the Parquet file
df = pd.read_parquet(input_file)

# Rename the column
df = df.rename(columns={
    "training program": "training_program"
})

# Save the modified file
df.to_parquet(output_file, index=False)

print(f"Saved updated file to: {output_file}")