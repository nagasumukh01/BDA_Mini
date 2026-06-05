"""
Air Quality Prediction - Flask Backend Server
Executes PySpark analysis and returns dynamic results to the web interface
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import numpy as np
import os
import json
from datetime import datetime, timedelta
import threading
import time
import sys

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Global variables to store analysis results
analysis_results = {
    "status": "idle",
    "progress": 0,
    "message": "Click 'Run Analysis' to start",
    "data": None,
    "predictions": None,
    "zones": None,
    "feature_importance": None,
    "metrics": None,
    "hourly_pattern": None,
    "category_distribution": None,
    "pollutant_stats": None
}

# Lock for thread safety
results_lock = threading.Lock()

def update_status(status, progress, message):
    """Update the analysis status"""
    with results_lock:
        analysis_results["status"] = status
        analysis_results["progress"] = progress
        analysis_results["message"] = message

def run_pyspark_analysis():
    """Run the PySpark analysis in a separate thread"""
    global analysis_results
    
    try:
        update_status("running", 5, "Initializing Spark Session...")
        
        # Set environment variable for Python
        os.environ['PYSPARK_PYTHON'] = sys.executable
        os.environ['PYSPARK_DRIVER_PYTHON'] = sys.executable
        
        from pyspark.sql import SparkSession
        from pyspark.sql.functions import (
            col, when, hour, dayofweek, month, avg, max as spark_max, 
            min as spark_min, stddev, count, lit, sin, cos, lag, abs as spark_abs,
            round as spark_round, greatest
        )
        from pyspark.sql.window import Window
        from pyspark.sql.types import DoubleType
        from pyspark.ml.feature import VectorAssembler, StandardScaler, StringIndexer, OneHotEncoder
        from pyspark.ml.regression import RandomForestRegressor
        from pyspark.ml.evaluation import RegressionEvaluator
        from pyspark.ml import Pipeline
        import math
        
        update_status("running", 10, "Creating Spark Session...")
        
        # Create Spark Session
        spark = SparkSession.builder \
            .appName("AQI_WebAnalysis") \
            .config("spark.sql.shuffle.partitions", "10") \
            .config("spark.driver.memory", "2g") \
            .config("spark.sql.adaptive.enabled", "true") \
            .config("spark.ui.showConsoleProgress", "false") \
            .getOrCreate()
        
        spark.sparkContext.setLogLevel("ERROR")
        
        update_status("running", 15, "Loading dataset...")
        
        # Load data
        csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "air_quality.csv")
        df = spark.read.csv(csv_path, header=True, inferSchema=True)
        
        total_records = df.count()
        update_status("running", 20, f"Loaded {total_records:,} records...")
        
        # Get pollutant statistics
        pollutant_stats = {}
        for pollutant in ["pm25", "pm10", "no2", "co", "so2", "o3"]:
            stats = df.agg(
                avg(col(pollutant)).alias("mean"),
                spark_min(col(pollutant)).alias("min"),
                spark_max(col(pollutant)).alias("max")
            ).collect()[0]
            pollutant_stats[pollutant] = {
                "mean": round(float(stats["mean"]) if stats["mean"] else 0, 2),
                "min": round(float(stats["min"]) if stats["min"] else 0, 2),
                "max": round(float(stats["max"]) if stats["max"] else 0, 2)
            }
        
        update_status("running", 25, "Preprocessing data...")
        
        # Convert datetime and add timestamp
        df = df.withColumn("timestamp", col("datetime").cast("timestamp"))
        
        # Add zone column (simulate zones based on data)
        df = df.withColumn(
            "zone",
            when(col("pm25") % 5 == 0, "Zone_North")
            .when(col("pm25") % 5 == 1, "Zone_South")
            .when(col("pm25") % 5 == 2, "Zone_East")
            .when(col("pm25") % 5 == 3, "Zone_West")
            .otherwise("Zone_Central")
        )
        
        # Handle missing values
        numeric_cols = ["pm25", "pm10", "no2", "co", "so2", "o3", "temp", "rh", "wind", "rain"]
        for col_name in numeric_cols:
            mean_val = df.agg(avg(col(col_name))).collect()[0][0]
            if mean_val is not None:
                df = df.fillna({col_name: mean_val})
        
        update_status("running", 35, "Calculating AQI using EPA formula...")
        
        # Calculate AQI sub-indices
        df = df.withColumn("aqi_pm25",
            when(col("pm25") <= 12.0, (50/12.0) * col("pm25"))
            .when(col("pm25") <= 35.4, 50 + ((100-50)/(35.4-12.0)) * (col("pm25") - 12.0))
            .when(col("pm25") <= 55.4, 100 + ((150-100)/(55.4-35.4)) * (col("pm25") - 35.4))
            .when(col("pm25") <= 150.4, 150 + ((200-150)/(150.4-55.4)) * (col("pm25") - 55.4))
            .when(col("pm25") <= 250.4, 200 + ((300-200)/(250.4-150.4)) * (col("pm25") - 150.4))
            .when(col("pm25") <= 500.4, 300 + ((500-300)/(500.4-250.4)) * (col("pm25") - 250.4))
            .otherwise(500))
        
        df = df.withColumn("aqi_pm10",
            when(col("pm10") <= 54, (50/54) * col("pm10"))
            .when(col("pm10") <= 154, 50 + ((100-50)/(154-54)) * (col("pm10") - 54))
            .when(col("pm10") <= 254, 100 + ((150-100)/(254-154)) * (col("pm10") - 154))
            .when(col("pm10") <= 354, 150 + ((200-150)/(354-254)) * (col("pm10") - 254))
            .when(col("pm10") <= 424, 200 + ((300-200)/(424-354)) * (col("pm10") - 354))
            .otherwise(300 + ((500-300)/(604-424)) * (col("pm10") - 424)))
        
        df = df.withColumn("aqi_o3",
            when(col("o3") <= 54, (50/54) * col("o3"))
            .when(col("o3") <= 70, 50 + ((100-50)/(70-54)) * (col("o3") - 54))
            .when(col("o3") <= 85, 100 + ((150-100)/(85-70)) * (col("o3") - 70))
            .when(col("o3") <= 105, 150 + ((200-150)/(105-85)) * (col("o3") - 85))
            .otherwise(200 + ((300-200)/(200-105)) * (col("o3") - 105)))
        
        df = df.withColumn("aqi_no2",
            when(col("no2") <= 53, (50/53) * col("no2"))
            .when(col("no2") <= 100, 50 + ((100-50)/(100-53)) * (col("no2") - 53))
            .otherwise(100 + ((150-100)/(360-100)) * (col("no2") - 100)))
        
        df = df.withColumn("aqi_so2",
            when(col("so2") <= 35, (50/35) * col("so2"))
            .when(col("so2") <= 75, 50 + ((100-50)/(75-35)) * (col("so2") - 35))
            .otherwise(100 + ((150-100)/(185-75)) * (col("so2") - 75)))
        
        df = df.withColumn("aqi_co",
            when(col("co") <= 4.4, (50/4.4) * col("co"))
            .when(col("co") <= 9.4, 50 + ((100-50)/(9.4-4.4)) * (col("co") - 4.4))
            .otherwise(100 + ((150-100)/(12.4-9.4)) * (col("co") - 9.4)))
        
        # Overall AQI
        df = df.withColumn("aqi", greatest("aqi_pm25", "aqi_pm10", "aqi_o3", "aqi_no2", "aqi_so2", "aqi_co"))
        
        df = df.withColumn("aqi_category",
            when(col("aqi") <= 50, "Good")
            .when(col("aqi") <= 100, "Moderate")
            .when(col("aqi") <= 150, "Unhealthy for Sensitive Groups")
            .when(col("aqi") <= 200, "Unhealthy")
            .when(col("aqi") <= 300, "Very Unhealthy")
            .otherwise("Hazardous"))
        
        update_status("running", 45, "Engineering features...")
        
        pi = math.pi
        df = df.withColumn("hour", hour("timestamp"))
        df = df.withColumn("day_of_week", dayofweek("timestamp"))
        df = df.withColumn("month", month("timestamp"))
        df = df.withColumn("hour_sin", sin(2 * pi * col("hour") / 24))
        df = df.withColumn("hour_cos", cos(2 * pi * col("hour") / 24))
        
        window_spec = Window.partitionBy("zone").orderBy("timestamp")
        df = df.withColumn("pm25_lag1", lag("pm25", 1).over(window_spec))
        df = df.withColumn("pm25_lag3", lag("pm25", 3).over(window_spec))
        df = df.withColumn("pm10_lag1", lag("pm10", 1).over(window_spec))
        df = df.withColumn("aqi_lag1", lag("aqi", 1).over(window_spec))
        
        window_rolling = Window.partitionBy("zone").orderBy("timestamp").rowsBetween(-2, 0)
        df = df.withColumn("pm25_rolling_avg", avg("pm25").over(window_rolling))
        
        df = df.withColumn("temp_humidity_interaction", col("temp") * col("rh") / 100)
        df = df.withColumn("wind_pm25_interaction", col("wind") * col("pm25"))
        
        for col_name in ["pm25_lag1", "pm25_lag3", "pm10_lag1", "aqi_lag1", "pm25_rolling_avg"]:
            df = df.fillna({col_name: 0})
        
        df = df.filter(col("aqi").isNotNull())
        
        update_status("running", 55, "Building ML Pipeline...")
        
        feature_cols = [
            "pm25", "pm10", "no2", "co", "so2", "o3", "temp", "rh", "wind",
            "hour", "day_of_week", "month", "hour_sin", "hour_cos",
            "pm25_lag1", "pm25_lag3", "pm10_lag1", "aqi_lag1", "pm25_rolling_avg",
            "temp_humidity_interaction", "wind_pm25_interaction"
        ]
        
        zone_indexer = StringIndexer(inputCol="zone", outputCol="zone_index", handleInvalid="keep")
        zone_encoder = OneHotEncoder(inputCols=["zone_index"], outputCols=["zone_encoded"])
        numeric_assembler = VectorAssembler(inputCols=feature_cols, outputCol="numeric_features", handleInvalid="skip")
        scaler = StandardScaler(inputCol="numeric_features", outputCol="scaled_features", withStd=True, withMean=True)
        final_assembler = VectorAssembler(inputCols=["scaled_features", "zone_encoded"], outputCol="features", handleInvalid="skip")
        rf = RandomForestRegressor(labelCol="aqi", featuresCol="features", numTrees=50, maxDepth=10, seed=42)
        
        pipeline = Pipeline(stages=[zone_indexer, zone_encoder, numeric_assembler, scaler, final_assembler, rf])
        
        update_status("running", 65, "Splitting data (80/20)...")
        train_data, test_data = df.randomSplit([0.8, 0.2], seed=42)
        
        update_status("running", 70, "Training Random Forest (50 trees)...")
        model = pipeline.fit(train_data)
        
        update_status("running", 85, "Evaluating model performance...")
        predictions = model.transform(test_data)
        
        evaluator_rmse = RegressionEvaluator(labelCol="aqi", predictionCol="prediction", metricName="rmse")
        evaluator_mae = RegressionEvaluator(labelCol="aqi", predictionCol="prediction", metricName="mae")
        evaluator_r2 = RegressionEvaluator(labelCol="aqi", predictionCol="prediction", metricName="r2")
        
        rmse = evaluator_rmse.evaluate(predictions)
        mae = evaluator_mae.evaluate(predictions)
        r2 = evaluator_r2.evaluate(predictions)
        
        update_status("running", 90, "Extracting insights...")
        
        # Feature importance
        rf_model = model.stages[-1]
        feature_importance = rf_model.featureImportances.toArray()
        importance_list = []
        for i, imp in enumerate(feature_importance[:len(feature_cols)]):
            if i < len(feature_cols):
                importance_list.append({"feature": feature_cols[i], "importance": round(float(imp) * 100, 2)})
        importance_list.sort(key=lambda x: x["importance"], reverse=True)
        
        # Zone analysis
        zone_analysis = predictions.groupBy("zone").agg(
            spark_round(avg("prediction"), 2).alias("avg_aqi"),
            spark_round(spark_max("prediction"), 2).alias("max_aqi"),
            spark_round(spark_min("prediction"), 2).alias("min_aqi"),
            spark_round(stddev("prediction"), 2).alias("std_aqi"),
            count("*").alias("count")
        ).toPandas().to_dict('records')
        
        for zone in zone_analysis:
            avg_aqi = zone["avg_aqi"] or 0
            if avg_aqi <= 50: zone["risk_level"] = "MINIMAL"
            elif avg_aqi <= 100: zone["risk_level"] = "LOW"
            elif avg_aqi <= 150: zone["risk_level"] = "MODERATE"
            elif avg_aqi <= 200: zone["risk_level"] = "HIGH"
            else: zone["risk_level"] = "CRITICAL"
        
        # Hourly pattern
        hourly_pattern = predictions.groupBy("hour").agg(
            spark_round(avg("prediction"), 2).alias("avg_aqi")
        ).orderBy("hour").toPandas().to_dict('records')
        
        # Category distribution
        category_dist = predictions.groupBy("aqi_category").agg(
            count("*").alias("count")
        ).toPandas().to_dict('records')
        
        # Sample predictions
        sample_predictions = predictions.select(
            "datetime", "zone", 
            spark_round("pm25", 1).alias("pm25"),
            spark_round("pm10", 1).alias("pm10"),
            spark_round("no2", 1).alias("no2"),
            spark_round("co", 2).alias("co"),
            spark_round("so2", 1).alias("so2"),
            spark_round("o3", 1).alias("o3"),
            spark_round("aqi", 2).alias("actual_aqi"),
            spark_round("prediction", 2).alias("predicted_aqi"),
            spark_round(spark_abs(col("aqi") - col("prediction")), 2).alias("error"),
            "aqi_category"
        ).limit(500).toPandas()
        
        # Convert datetime to string
        sample_predictions['datetime'] = sample_predictions['datetime'].astype(str)
        sample_list = sample_predictions.to_dict('records')
        
        # Calculate average AQI
        avg_aqi = predictions.agg(avg("prediction")).collect()[0][0]
        
        data_summary = {
            "total_records": total_records,
            "train_records": train_data.count(),
            "test_records": test_data.count(),
            "features_count": len(feature_cols),
            "zones_count": 5,
            "avg_aqi": round(avg_aqi, 2) if avg_aqi else 0
        }
        
        update_status("running", 95, "Finalizing results...")
        
        with results_lock:
            analysis_results["metrics"] = {
                "r2": round(r2, 4),
                "rmse": round(rmse, 2),
                "mae": round(mae, 2),
                "accuracy_percent": round(r2 * 100, 2)
            }
            analysis_results["feature_importance"] = importance_list[:10]
            analysis_results["zones"] = zone_analysis
            analysis_results["hourly_pattern"] = hourly_pattern
            analysis_results["category_distribution"] = category_dist
            analysis_results["predictions"] = sample_list
            analysis_results["data"] = data_summary
            analysis_results["pollutant_stats"] = pollutant_stats
        
        spark.stop()
        update_status("completed", 100, "Analysis completed successfully!")
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(traceback.format_exc())
        update_status("error", 0, f"Error: {error_msg}")


# Routes
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/status')
def get_status():
    with results_lock:
        return jsonify({
            "status": analysis_results["status"],
            "progress": analysis_results["progress"],
            "message": analysis_results["message"]
        })

@app.route('/api/run-analysis', methods=['POST'])
def run_analysis():
    global analysis_results
    
    with results_lock:
        if analysis_results["status"] == "running":
            return jsonify({"status": "already_running", "message": "Analysis already in progress"})
    
    # Reset results
    with results_lock:
        analysis_results = {
            "status": "starting",
            "progress": 0,
            "message": "Starting analysis...",
            "data": None, "predictions": None, "zones": None,
            "feature_importance": None, "metrics": None,
            "hourly_pattern": None, "category_distribution": None,
            "pollutant_stats": None
        }
    
    thread = threading.Thread(target=run_pyspark_analysis)
    thread.daemon = True
    thread.start()
    
    return jsonify({"status": "started", "message": "Analysis started"})

@app.route('/api/results')
def get_results():
    with results_lock:
        return jsonify(analysis_results)

@app.route('/api/predictions')
def get_predictions():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    zone = request.args.get('zone', 'all')
    category = request.args.get('category', 'all')
    
    with results_lock:
        predictions = analysis_results.get("predictions", []) or []
        
        if not predictions:
            return jsonify({"data": [], "total": 0, "page": page, "pages": 0})
        
        if zone != 'all':
            predictions = [p for p in predictions if zone.lower().replace('_', ' ') in p.get("zone", "").lower().replace('_', ' ')]
        
        if category != 'all':
            category_map = {
                'good': 'Good', 'moderate': 'Moderate',
                'sensitive': 'Unhealthy for Sensitive Groups',
                'unhealthy': 'Unhealthy', 'very-unhealthy': 'Very Unhealthy',
                'hazardous': 'Hazardous'
            }
            target = category_map.get(category, category)
            predictions = [p for p in predictions if p.get("aqi_category") == target]
        
        total = len(predictions)
        pages = max(1, (total + per_page - 1) // per_page)
        start = (page - 1) * per_page
        end = start + per_page
        
        return jsonify({"data": predictions[start:end], "total": total, "page": page, "pages": pages})

@app.route('/api/zones')
def get_zones():
    with results_lock:
        return jsonify(analysis_results.get("zones", []) or [])

@app.route('/api/metrics')
def get_metrics():
    with results_lock:
        return jsonify(analysis_results.get("metrics", {}))

@app.route('/api/feature-importance')
def get_feature_importance():
    with results_lock:
        return jsonify(analysis_results.get("feature_importance", []) or [])

@app.route('/api/hourly-pattern')
def get_hourly_pattern():
    with results_lock:
        return jsonify(analysis_results.get("hourly_pattern", []) or [])

@app.route('/api/category-distribution')
def get_category_distribution():
    with results_lock:
        return jsonify(analysis_results.get("category_distribution", []) or [])

@app.route('/api/data-summary')
def get_data_summary():
    with results_lock:
        return jsonify(analysis_results.get("data", {}))

@app.route('/api/pollutant-stats')
def get_pollutant_stats():
    with results_lock:
        return jsonify(analysis_results.get("pollutant_stats", {}))


if __name__ == '__main__':
    print("\n" + "="*60)
    print("   AIR QUALITY PREDICTION - WEB SERVER")
    print("="*60)
    print("\n   Open your browser and go to: http://localhost:5000")
    print("\n   Press Ctrl+C to stop the server")
    print("="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
