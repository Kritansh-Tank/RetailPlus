import os
import json
import sqlite3
import pandas as pd
from agent_framework import (
    DemandForecastAgent,
    InventoryMonitorAgent,
    PricingOptimizationAgent,
    SupplyChainAgent,
    CoordinatorAgent
)

# Set environment variables for LLM service with the specific URL and model
os.environ['LLM_URL'] = 'http://35.154.211.247:11434'
os.environ['LLM_MODEL'] = 'qwen2.5:0.5b'

def setup_multi_agent_system():
    """Initialize and setup the multi-agent system."""
    # Create individual agents
    demand_forecast_agent = DemandForecastAgent()
    inventory_monitor_agent = InventoryMonitorAgent()
    pricing_optimization_agent = PricingOptimizationAgent()
    supply_chain_agent = SupplyChainAgent()
    
    # Create coordinator agent
    coordinator = CoordinatorAgent()
    
    # Add specialized agents to the coordinator
    coordinator.add_agent('demand_forecast', demand_forecast_agent)
    coordinator.add_agent('inventory_monitor', inventory_monitor_agent)
    coordinator.add_agent('pricing_optimization', pricing_optimization_agent)
    coordinator.add_agent('supply_chain', supply_chain_agent)
    
    return coordinator

def get_top_products_by_sales(limit=5):
    """Get the top products by sales volume."""
    try:
        conn = sqlite3.connect('database/retail_inventory.db')
        query = """
        SELECT 
            df."Product ID",
            df."Store ID",
            SUM(df."Sales Quantity") as total_sales
        FROM 
            demand_forecasting df
        GROUP BY 
            df."Product ID", df."Store ID"
        ORDER BY 
            total_sales DESC
        LIMIT ?
        """
        df = pd.read_sql_query(query, conn, params=(limit,))
        conn.close()
        return df.to_dict('records')
    except Exception as e:
        print(f"Error getting top products: {str(e)}")
        return []

def find_critical_inventory_products(limit=5):
    """Find products with critical inventory levels."""
    try:
        conn = sqlite3.connect('database/retail_inventory.db')
        query = """
        SELECT 
            im."Product ID",
            im."Store ID",
            im."Stock Levels",
            im."Reorder Point",
            df."Sales Quantity"
        FROM 
            inventory_monitoring im
        LEFT JOIN 
            demand_forecasting df ON im."Product ID" = df."Product ID" AND im."Store ID" = df."Store ID"
        WHERE 
            im."Stock Levels" < im."Reorder Point"
        ORDER BY 
            (im."Reorder Point" - im."Stock Levels") DESC
        LIMIT ?
        """
        df = pd.read_sql_query(query, conn, params=(limit,))
        conn.close()
        return df.to_dict('records')
    except Exception as e:
        print(f"Error finding critical inventory products: {str(e)}")
        return []

def run_optimization_example():
    """Run an example of the multi-agent optimization system."""
    # Create database if it doesn't exist
    if not os.path.exists('database/retail_inventory.db'):
        # Run the create_database.py script directly
        os.system('python create_database.py')
    
    # Setup multi-agent system
    coordinator = setup_multi_agent_system()
    
    # Get products for demonstration
    print("Finding products for optimization...")
    top_products = get_top_products_by_sales(limit=3)
    critical_products = find_critical_inventory_products(limit=3)
    
    # Process top selling products
    print("\n=== Optimizing Top Selling Products ===")
    for product in top_products:
        product_id = product["Product ID"]
        store_id = product["Store ID"]
        print(f"\nOptimizing Product ID: {product_id} at Store ID: {store_id} (High Sales Volume)")
        
        optimization_plan = coordinator.process(product_id, store_id)
        
        print(f"Optimization Plan: {json.dumps(optimization_plan, indent=2)}")
    
    # Process critical inventory products
    print("\n=== Optimizing Critical Inventory Products ===")
    for product in critical_products:
        product_id = product["Product ID"]
        store_id = product["Store ID"]
        print(f"\nOptimizing Product ID: {product_id} at Store ID: {store_id} (Critical Inventory)")
        
        optimization_plan = coordinator.process(product_id, store_id)
        
        print(f"Optimization Plan: {json.dumps(optimization_plan, indent=2)}")

if __name__ == "__main__":
    run_optimization_example() 