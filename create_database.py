import sqlite3
import pandas as pd
import os

def create_database():
    # Create database directory if it doesn't exist
    os.makedirs('database', exist_ok=True)
    
    # Connect to SQLite database (will be created if it doesn't exist)
    conn = sqlite3.connect('database/retail_inventory.db')
    
    # Load datasets
    demand_forecasting = pd.read_csv('Dataset/[use case 1] Inventory Optimization for Retail/demand_forecasting.csv')
    inventory_monitoring = pd.read_csv('Dataset/[use case 1] Inventory Optimization for Retail/inventory_monitoring.csv')
    pricing_optimization = pd.read_csv('Dataset/[use case 1] Inventory Optimization for Retail/pricing_optimization.csv')
    
    # Store datasets in SQLite database
    demand_forecasting.to_sql('demand_forecasting', conn, if_exists='replace', index=False)
    inventory_monitoring.to_sql('inventory_monitoring', conn, if_exists='replace', index=False)
    pricing_optimization.to_sql('pricing_optimization', conn, if_exists='replace', index=False)
    
    # Create views to make it easier to join data
    conn.execute('''
    CREATE VIEW IF NOT EXISTS product_inventory_view AS
    SELECT 
        d."Product ID", 
        d."Store ID", 
        d.Date,
        d.Price AS Sales_Price,
        d."Sales Quantity", 
        d.Promotions, 
        d.Seasonality_Factors, 
        d."External Factors", 
        d."Demand Trend", 
        d."Customer Segments",
        i."Stock Levels",
        i."Supplier Lead Time (days)",
        i."Stockout Frequency",
        i."Reorder Point",
        i."Expiry Date", 
        i."Warehouse Capacity",
        i."Order Fulfillment Time (days)",
        p.Price AS Current_Price,
        p."Competitor Prices",
        p.Discounts,
        p."Sales Volume",
        p."Customer Reviews",
        p."Return Rate (%)",
        p."Storage Cost",
        p."Elasticity Index"
    FROM 
        demand_forecasting d
    LEFT JOIN inventory_monitoring i 
        ON d."Product ID" = i."Product ID" AND d."Store ID" = i."Store ID"
    LEFT JOIN pricing_optimization p
        ON d."Product ID" = p."Product ID" AND d."Store ID" = p."Store ID"
    ''')
    
    # Close the connection
    conn.close()
    
    print("Database created successfully!")

if __name__ == "__main__":
    create_database() 