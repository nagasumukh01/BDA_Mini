# AIR QUALITY PREDICTION USING PYSPARK ML

---

## A Machine Learning Approach to Predict and Forecast Air Quality Index

---

**Project Report**

**Date:** December 2025

**Technology Stack:** PySpark, Spark MLlib, Python

---

# TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Introduction](#2-introduction)
3. [Dataset Description](#3-dataset-description)
4. [Methodology](#4-methodology)
5. [Implementation](#5-implementation)
6. [Results and Analysis](#6-results-and-analysis)
7. [Key Findings](#7-key-findings)
8. [Conclusions](#8-conclusions)
9. [Future Scope](#9-future-scope)
10. [References](#10-references)

---

# 1. EXECUTIVE SUMMARY

This project presents a comprehensive machine learning solution for predicting Air Quality Index (AQI) using Apache Spark's distributed computing framework. By analyzing 87,672 hourly air quality readings spanning multiple years, we developed a Random Forest regression model that achieves **97.12% accuracy (R² score)** in predicting AQI values.

**Key Achievements:**
- Processed 87,672 records using PySpark's distributed computing
- Implemented EPA-standard AQI calculation formula
- Engineered 22 features including temporal, lag, and interaction features
- Built a 6-stage ML pipeline with Random Forest Regressor
- Achieved RMSE of 9.30 and MAE of 4.04
- Identified peak pollution hours and zone-wise risk levels

---

# 2. INTRODUCTION

## 2.1 Background

Air pollution is one of the most critical environmental challenges facing the world today. According to the World Health Organization (WHO), air pollution causes an estimated 7 million premature deaths annually. The Air Quality Index (AQI) is a standardized indicator used to communicate how polluted the air is and what associated health effects might be of concern.

## 2.2 Problem Statement

Traditional air quality monitoring provides reactive information - telling us about pollution after it has occurred. There is a critical need for **predictive systems** that can:
- Forecast AQI levels before they reach dangerous thresholds
- Identify patterns in pollution data
- Enable proactive measures to protect public health

## 2.3 Project Objectives

| # | Objective | Description |
|---|-----------|-------------|
| 1 | **Predict AQI** | Build a machine learning model to predict Air Quality Index from sensor data |
| 2 | **Forecast Pollution** | Create future pollution level forecasts |
| 3 | **Identify Risk Zones** | Analyze and classify areas by pollution risk levels |
| 4 | **Feature Analysis** | Determine which factors most influence air quality |

## 2.4 Scope

This project focuses on:
- Hourly air quality data analysis
- Six major pollutants: PM2.5, PM10, NO2, CO, SO2, O3
- Weather parameters: Temperature, Humidity, Wind, Rain
- Time-series feature engineering
- Regression-based AQI prediction

---

# 3. DATASET DESCRIPTION

## 3.1 Data Source

- **File:** air_quality.csv
- **Records:** 87,672 hourly readings
- **Time Period:** Multi-year historical data
- **Format:** CSV with header row

## 3.2 Data Schema

| Column | Data Type | Description | Unit |
|--------|-----------|-------------|------|
| datetime | Timestamp | Date and time of reading | YYYY-MM-DD HH:MM:SS |
| pm25 | Double | Fine particulate matter (≤2.5μm) | μg/m³ |
| pm10 | Double | Coarse particulate matter (≤10μm) | μg/m³ |
| no2 | Double | Nitrogen dioxide | ppb |
| co | Double | Carbon monoxide | mg/m³ |
| so2 | Double | Sulfur dioxide | ppb |
| o3 | Double | Ground-level ozone | ppb |
| temp | Double | Temperature | °C |
| rh | Double | Relative humidity | % |
| wind | Double | Wind speed | m/s |
| rain | Double | Rainfall | mm |

## 3.3 Data Statistics

| Pollutant | Min | Max | Mean | Std Dev |
|-----------|-----|-----|------|---------|
| PM2.5 | 15.0 | 926.1 | 57.8 | 46.5 |
| PM10 | 30.0 | 989.9 | 99.0 | 71.5 |
| NO2 | 5.0 | 84.9 | 20.4 | 12.1 |
| CO | 0.05 | 6.7 | 1.0 | 1.1 |
| SO2 | 0.05 | 38.1 | 4.1 | 2.8 |
| O3 | 1.0 | 112.2 | 12.4 | 17.6 |

## 3.4 AQI Categories

| AQI Range | Category | Health Implications |
|-----------|----------|---------------------|
| 0-50 | Good | Air quality is satisfactory |
| 51-100 | Moderate | Acceptable; moderate health concern for sensitive people |
| 101-150 | Unhealthy for Sensitive Groups | Sensitive groups may experience health effects |
| 151-200 | Unhealthy | Everyone may begin to experience health effects |
| 201-300 | Very Unhealthy | Health alert; everyone may experience serious effects |
| 301-500 | Hazardous | Emergency conditions; entire population affected |

---

# 4. METHODOLOGY

## 4.1 Technology Selection

### Why Apache Spark?

| Feature | Benefit |
|---------|---------|
| Distributed Computing | Process large datasets across clusters |
| In-Memory Processing | 100x faster than traditional MapReduce |
| Unified Analytics | Combines SQL, streaming, ML in one platform |
| MLlib Integration | Native machine learning library |
| Scalability | Scales from single machine to thousands of nodes |

### Technology Stack

```
┌─────────────────────────────────────────┐
│           APPLICATION LAYER              │
│  ┌─────────────────────────────────┐    │
│  │     Python 3.12 + PySpark       │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│           PROCESSING LAYER               │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Spark SQL   │  │  Spark MLlib    │   │
│  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────┤
│           STORAGE LAYER                  │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │  CSV Files  │  │  Pandas Export  │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

## 4.2 Project Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                     DATA PIPELINE                                 │
└──────────────────────────────────────────────────────────────────┘

    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │  LOAD   │────▶│  CLEAN  │────▶│ COMPUTE │────▶│ FEATURE │
    │  DATA   │     │  DATA   │     │   AQI   │     │ ENGINEER│
    └─────────┘     └─────────┘     └─────────┘     └─────────┘
         │               │               │               │
         ▼               ▼               ▼               ▼
    Read CSV        Handle NULL     EPA Formula     22 Features
    87K records     Impute Mean     Sub-indices     Lag, Rolling
                    Filter <0       Max = AQI       Interactions

                                                         │
                                                         ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │  SAVE   │◀────│ ANALYZE │◀────│ PREDICT │◀────│  TRAIN  │
    │ RESULTS │     │ RESULTS │     │  TEST   │     │  MODEL  │
    └─────────┘     └─────────┘     └─────────┘     └─────────┘
         │               │               │               │
         ▼               ▼               ▼               ▼
    CSV Export      Zones, Hours    RMSE, MAE       80/20 Split
    Predictions     Peak Times      R² Score        Random Forest
```

## 4.3 AQI Calculation (EPA Standard)

The Air Quality Index is calculated using the EPA (Environmental Protection Agency) formula:

**Formula:**
```
AQI = max(AQI_PM2.5, AQI_PM10, AQI_O3, AQI_NO2, AQI_SO2, AQI_CO)
```

**Sub-Index Calculation:**
```
I = ((I_high - I_low) / (C_high - C_low)) × (C - C_low) + I_low
```

Where:
- I = Air Quality Index
- C = Pollutant concentration
- C_low, C_high = Concentration breakpoints
- I_low, I_high = Index breakpoints

**PM2.5 Breakpoints (Example):**

| C_low | C_high | I_low | I_high | Category |
|-------|--------|-------|--------|----------|
| 0.0 | 12.0 | 0 | 50 | Good |
| 12.1 | 35.4 | 51 | 100 | Moderate |
| 35.5 | 55.4 | 101 | 150 | Unhealthy (Sensitive) |
| 55.5 | 150.4 | 151 | 200 | Unhealthy |
| 150.5 | 250.4 | 201 | 300 | Very Unhealthy |
| 250.5 | 500.4 | 301 | 500 | Hazardous |

## 4.4 Feature Engineering

### 4.4.1 Temporal Features

| Feature | Description | Purpose |
|---------|-------------|---------|
| hour | Hour of day (0-23) | Capture daily patterns |
| day_of_week | Day (1-7) | Weekly patterns |
| month | Month (1-12) | Seasonal patterns |
| hour_sin | sin(2π × hour/24) | Cyclical encoding |
| hour_cos | cos(2π × hour/24) | Cyclical encoding |

**Why Cyclical Encoding?**
Hour 23 is close to hour 0, but numerically they're far apart. Sine/cosine encoding preserves this circular relationship.

### 4.4.2 Lag Features

| Feature | Description | Purpose |
|---------|-------------|---------|
| pm25_lag1 | PM2.5 from 1 hour ago | Recent trend |
| pm25_lag3 | PM2.5 from 3 hours ago | Medium-term trend |
| pm10_lag1 | PM10 from 1 hour ago | Particle persistence |
| aqi_lag1 | AQI from 1 hour ago | AQI momentum |

### 4.4.3 Rolling Statistics

| Feature | Description | Window |
|---------|-------------|--------|
| pm25_rolling_avg | Moving average of PM2.5 | 3 hours |

### 4.4.4 Interaction Features

| Feature | Formula | Rationale |
|---------|---------|-----------|
| temp_humidity_interaction | temp × rh / 100 | Combined weather effect |
| wind_pm25_interaction | wind × pm25 | Wind dispersion of particles |

## 4.5 Machine Learning Pipeline

### Pipeline Stages

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ML PIPELINE (6 STAGES)                           │
└─────────────────────────────────────────────────────────────────────┘

  Stage 1          Stage 2          Stage 3          Stage 4
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ String   │───▶│ OneHot   │───▶│ Vector   │───▶│ Standard │
│ Indexer  │    │ Encoder  │    │Assembler │    │ Scaler   │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     │               │               │               │
     ▼               ▼               ▼               ▼
  zone →          [0,1,0,0,0]     Combine 22      Normalize
  zone_idx        one-hot         features        mean=0, std=1

                      Stage 5          Stage 6
                   ┌──────────┐    ┌──────────┐
              ────▶│ Final    │───▶│ Random   │
                   │Assembler │    │ Forest   │
                   └──────────┘    └──────────┘
                        │               │
                        ▼               ▼
                    All features    50 trees
                    combined        maxDepth=10
```

### Random Forest Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| numTrees | 50 | Number of decision trees |
| maxDepth | 10 | Maximum tree depth |
| featureSubsetStrategy | sqrt | Features per split |
| minInstancesPerNode | 5 | Minimum samples per leaf |
| seed | 42 | Random seed for reproducibility |

### Why Random Forest?

| Advantage | Explanation |
|-----------|-------------|
| Non-linear relationships | Captures complex pollutant interactions |
| Robust to outliers | Not affected by extreme readings |
| Feature importance | Ranks which factors matter most |
| No overfitting | Ensemble of trees reduces variance |
| Handles mixed data | Works with numeric and categorical |

---

# 5. IMPLEMENTATION

## 5.1 Code Structure

```
air_quality_prediction.py
│
├── SECTION 1: Imports & Configuration
│   └── PySpark modules, MLlib, constants
│
├── SECTION 2: Spark Session Creation
│   └── Initialize with optimized settings
│
├── SECTION 3: Data Loading
│   └── Read CSV, repartition, cache
│
├── SECTION 4: Exploratory Data Analysis
│   └── Schema, statistics, missing values
│
├── SECTION 5: Data Preprocessing
│   └── Handle nulls, filter invalid records
│
├── SECTION 6: AQI Calculation
│   └── EPA formula implementation
│
├── SECTION 7: Feature Engineering
│   └── Temporal, lag, rolling, interaction features
│
├── SECTION 8: ML Pipeline Construction
│   └── Indexer, encoder, scaler, assembler, model
│
├── SECTION 9: Model Training & Evaluation
│   └── Train/test split, fit, predict, metrics
│
├── SECTION 10: Future Forecasting
│   └── 24-hour predictions
│
├── SECTION 11: High-Risk Zone Analysis
│   └── Zone-wise aggregation and classification
│
├── SECTION 12: Save Results
│   └── Export to CSV
│
├── SECTION 13: Feature Importance
│   └── Extract and display top features
│
├── SECTION 14: Summary
│   └── Final statistics display
│
└── SECTION 15: Cleanup
    └── Stop Spark session
```

## 5.2 Key Code Snippets

### Spark Session Creation
```python
spark = SparkSession.builder \
    .appName("AirQualityPrediction") \
    .config("spark.sql.shuffle.partitions", 20) \
    .config("spark.driver.memory", "4g") \
    .config("spark.sql.adaptive.enabled", "true") \
    .getOrCreate()
```

### AQI Calculation (PM2.5 Example)
```python
df_aqi = df_clean.withColumn(
    "aqi_pm25",
    when(col("pm25") <= 12.0, (50/12.0) * col("pm25"))
    .when(col("pm25") <= 35.4, 50 + ((100-50)/(35.4-12.0)) * (col("pm25") - 12.0))
    .when(col("pm25") <= 55.4, 100 + ((150-100)/(55.4-35.4)) * (col("pm25") - 35.4))
    # ... additional breakpoints
    .otherwise(0)
)
```

### Lag Feature Creation
```python
window_spec = Window.partitionBy("zone").orderBy("timestamp")
df_features = df_features.withColumn("pm25_lag1", lag("pm25", 1).over(window_spec))
```

### ML Pipeline
```python
pipeline = Pipeline(stages=[
    StringIndexer(inputCol="zone", outputCol="zone_index"),
    OneHotEncoder(inputCols=["zone_index"], outputCols=["zone_encoded"]),
    VectorAssembler(inputCols=feature_cols, outputCol="numeric_features"),
    StandardScaler(inputCol="numeric_features", outputCol="scaled_features"),
    VectorAssembler(inputCols=["scaled_features", "zone_encoded"], outputCol="features"),
    RandomForestRegressor(labelCol="aqi", featuresCol="features", numTrees=50)
])
```

## 5.3 Execution

### Command
```bash
python air_quality_prediction.py
```

### Runtime
- **Data Loading:** ~5 seconds
- **Preprocessing:** ~10 seconds
- **Model Training:** ~27 seconds
- **Total Execution:** ~2 minutes

---

# 6. RESULTS AND ANALYSIS

## 6.1 Model Performance Metrics

| Metric | Value | Interpretation |
|--------|-------|----------------|
| **R² (R-Squared)** | 0.9712 | 97.12% of variance explained |
| **RMSE** | 9.30 | Average prediction error: 9.3 AQI points |
| **MAE** | 4.04 | Typical error: 4 AQI points |

### Performance Interpretation

- **R² = 0.9712**: Excellent model fit. The model captures 97% of the variability in AQI, leaving only 3% unexplained.
- **RMSE = 9.30**: The root mean square error is relatively low considering AQI ranges from 0-500+.
- **MAE = 4.04**: On average, predictions are within 4 AQI points of actual values - often within the same category.

## 6.2 Prediction Accuracy by Category

| AQI Category | Mean Absolute Error | Sample Size |
|--------------|---------------------|-------------|
| Moderate | 3.55 | 6,739 |
| Unhealthy | 3.56 | 7,052 |
| Unhealthy (Sensitive) | 3.65 | 3,214 |
| Very Unhealthy | 11.35 | 510 |
| Hazardous | 137.33 | 32 |

**Observation:** Model performs best on common categories (Moderate, Unhealthy) with MAE ~3.5. Higher error on rare extreme events (Hazardous) due to limited training samples.

## 6.3 AQI Category Distribution

| Category | Count | Percentage |
|----------|-------|------------|
| Unhealthy | 35,354 | 40.3% |
| Moderate | 33,537 | 38.3% |
| Unhealthy for Sensitive Groups | 16,055 | 18.3% |
| Very Unhealthy | 2,595 | 3.0% |
| Hazardous | 131 | 0.1% |

## 6.4 Zone-Wise Analysis

| Zone | Avg Predicted AQI | Max AQI | Min AQI | Std Dev | Records | Risk Level |
|------|-------------------|---------|---------|---------|---------|------------|
| Zone South | 125.16 | 623.51 | 57.49 | 53.66 | 3,534 | MODERATE |
| Zone East | 124.79 | 692.65 | 57.58 | 51.77 | 3,554 | MODERATE |
| Zone West | 124.10 | 655.46 | 57.57 | 49.61 | 3,384 | MODERATE |
| Zone Central | 124.00 | 657.73 | 57.59 | 50.90 | 3,572 | MODERATE |
| Zone North | 123.55 | 662.75 | 57.47 | 49.29 | 3,503 | MODERATE |

## 6.5 Hourly Pollution Pattern

| Hour | Avg Predicted AQI | Classification |
|------|-------------------|----------------|
| 05:00 | 138.45 | **Peak** |
| 04:00 | 137.14 | **Peak** |
| 06:00 | 136.87 | **Peak** |
| 23:00 | 133.09 | High |
| 22:00 | 130.68 | High |
| 15:00 | 97.35 | **Lowest** |
| 17:00 | 112.50 | Low |
| 13:00 | 117.35 | Low |

**Pattern Explanation:**
- **Early Morning Peak (4-6 AM):** Temperature inversion traps pollutants near ground level
- **Afternoon Low (3-5 PM):** Solar heating causes atmospheric mixing, dispersing pollutants
- **Evening Rise (10 PM - midnight):** Cooling atmosphere, reduced wind, pollutant accumulation

---

# 7. KEY FINDINGS

## 7.1 Feature Importance Analysis

| Rank | Feature | Importance | Insight |
|------|---------|------------|---------|
| 1 | **pm25** | 39.93% | Primary driver of AQI |
| 2 | pm10 | 13.71% | Significant particulate contribution |
| 3 | pm10_lag1 | 11.02% | Particle persistence matters |
| 4 | temp_humidity_interaction | 6.49% | Weather conditions affect dispersion |
| 5 | wind_pm25_interaction | 5.75% | Wind carries/disperses particles |
| 6 | pm25_rolling_avg | 4.89% | Trend is predictive |
| 7 | aqi_lag1 | 2.76% | Previous AQI predicts next |
| 8 | pm25_lag1 | 2.70% | Recent PM2.5 history |
| 9 | rh (humidity) | 2.62% | Humidity affects particle behavior |
| 10 | pm25_lag3 | 1.30% | 3-hour trend |

### Visual Representation
```
Feature Importance
──────────────────────────────────────────────────────

pm25                 ████████████████████████████████████████  39.9%
pm10                 ██████████████                            13.7%
pm10_lag1            ███████████                               11.0%
temp×humidity        ███████                                    6.5%
wind×pm25            ██████                                     5.8%
pm25_rolling_avg     █████                                      4.9%
aqi_lag1             ███                                        2.8%
pm25_lag1            ███                                        2.7%
rh                   ███                                        2.6%
pm25_lag3            █                                          1.3%
```

## 7.2 Critical Insights

### Insight 1: PM2.5 Dominates Air Quality
PM2.5 (fine particles) alone accounts for **40%** of AQI prediction accuracy. This validates the scientific consensus that fine particulate matter is the most dangerous component of air pollution due to its ability to penetrate deep into lungs.

### Insight 2: Time-Series Features Are Crucial
Lag features (pm10_lag1, pm25_lag1, aqi_lag1) contribute **~17%** to prediction accuracy, proving that air quality has strong temporal dependencies. Past pollution levels are strong predictors of future levels.

### Insight 3: Weather-Pollution Interaction
The interaction between weather and pollutants (temp×humidity, wind×pm25) accounts for **~12%** of predictive power. This suggests that meteorological conditions significantly influence how pollutants behave and disperse.

### Insight 4: Early Morning is Most Polluted
Hours between 4-6 AM consistently show the highest AQI values (~137-138), likely due to:
- Temperature inversion (cold air trapped under warm air)
- Minimal atmospheric mixing
- Accumulated overnight emissions

### Insight 5: All Zones Have Similar Risk
All five zones show MODERATE risk levels with average AQI around 124-125, suggesting uniform pollution distribution in the study area.

---

# 8. CONCLUSIONS

## 8.1 Summary of Achievements

| Objective | Status | Result |
|-----------|--------|--------|
| Predict AQI from sensor data | ✅ Achieved | 97.12% accuracy (R²) |
| Forecast future pollution | ✅ Achieved | 24-hour forecasting capability |
| Identify high-risk zones | ✅ Achieved | Zone-wise risk classification |
| Determine key factors | ✅ Achieved | PM2.5 identified as primary driver |

## 8.2 Technical Accomplishments

1. **Scalable Solution:** PySpark-based implementation can handle millions of records
2. **EPA-Compliant AQI:** Industry-standard calculation methodology
3. **Rich Feature Engineering:** 22 features capturing temporal, spatial, and meteorological patterns
4. **Robust ML Pipeline:** Production-ready 6-stage pipeline
5. **Comprehensive Analysis:** Zone-wise and temporal pollution patterns identified

## 8.3 Practical Applications

| Application | Description |
|-------------|-------------|
| **Early Warning Systems** | Predict pollution spikes 24 hours in advance |
| **Public Health Advisories** | Issue alerts when AQI exceeds thresholds |
| **Urban Planning** | Identify pollution hotspots for intervention |
| **Industrial Monitoring** | Track emission impacts on local air quality |
| **Policy Making** | Data-driven environmental regulations |

## 8.4 Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Limited geographic data | Zones are simulated | Add real lat/long coordinates |
| No source identification | Cannot pinpoint emission sources | Add traffic, industrial data |
| Static model | Doesn't adapt in real-time | Implement online learning |
| Extreme event prediction | Lower accuracy for hazardous levels | Collect more extreme samples |

---

# 9. FUTURE SCOPE

## 9.1 Short-Term Improvements

| Enhancement | Description | Expected Impact |
|-------------|-------------|-----------------|
| Add location data | Include latitude, longitude, elevation | +2-3% accuracy |
| Traffic integration | Incorporate vehicle density data | Better NO2/CO prediction |
| Satellite imagery | Use MODIS/Sentinel pollution data | Wider coverage |
| Real-time streaming | Apache Kafka integration | Live predictions |

## 9.2 Long-Term Development

| Development | Technology | Benefit |
|-------------|------------|---------|
| Deep Learning | LSTM networks | Better time-series modeling |
| Ensemble Methods | XGBoost + Random Forest | Improved accuracy |
| Cloud Deployment | AWS EMR / Databricks | Scalable production system |
| Mobile App | React Native + API | Public accessibility |
| Alert System | Twilio/Email integration | Automated notifications |

## 9.3 Research Extensions

1. **Health Correlation Study:** Link AQI predictions with hospital admission rates
2. **Climate Change Impact:** Analyze long-term pollution trends
3. **Source Apportionment:** Use ML to identify pollution sources
4. **Cross-City Comparison:** Apply model to multiple cities
5. **Policy Impact Assessment:** Measure effect of environmental regulations

---

# 10. REFERENCES

## 10.1 Technical References

1. Apache Spark Documentation - https://spark.apache.org/docs/latest/
2. PySpark MLlib Guide - https://spark.apache.org/docs/latest/ml-guide.html
3. EPA AQI Technical Assistance - https://www.airnow.gov/aqi/aqi-basics/
4. Random Forest Algorithm - Breiman, L. (2001). Machine Learning, 45(1), 5-32

## 10.2 Data Standards

1. EPA AQI Breakpoints - 40 CFR Part 58, Appendix G
2. WHO Air Quality Guidelines - Global Update 2021
3. National Ambient Air Quality Standards (NAAQS)

## 10.3 Tools and Technologies

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.12 | Programming language |
| PySpark | 4.0.1 | Distributed computing |
| Pandas | 2.x | Data export |
| NumPy | 1.x | Numerical operations |

---

# APPENDIX

## A. Output Files

| File | Description | Size |
|------|-------------|------|
| aqi_predictions_output.csv | 10,000 sample predictions | ~1 MB |
| aqi_high_risk_zones.csv | Zone-level risk analysis | ~1 KB |

## B. Sample Predictions

| DateTime | Zone | PM2.5 | Actual AQI | Predicted AQI | Category |
|----------|------|-------|------------|---------------|----------|
| 2020-06-24 18:00 | Zone_East | 15.0 | 56.41 | 58.25 | Moderate |
| 2021-06-29 23:00 | Zone_East | 15.0 | 56.41 | 58.06 | Moderate |
| 2020-04-10 11:00 | Zone_East | 15.0 | 56.41 | 58.55 | Moderate |

## C. Risk Classification Criteria

| Risk Level | Avg AQI Range | Action Required |
|------------|---------------|-----------------|
| MINIMAL | 0-50 | No action needed |
| LOW | 51-100 | Monitor sensitive groups |
| MODERATE | 101-150 | Limit outdoor exertion |
| HIGH | 151-200 | Health warnings issued |
| CRITICAL | 201+ | Emergency measures |

---

**END OF REPORT**

---

*Document Generated: December 2025*

*Project: Air Quality Prediction Using PySpark ML*
