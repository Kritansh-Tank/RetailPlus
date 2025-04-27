import os
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime
from json_formatter import fix_json_response

class RetailDataProcessor:
    """
    A class to process retail datasets, validate their structure,
    and perform basic analysis for the RetailPulse AI platform.
    """
    
    def __init__(self, dataset_path=None):
        """
        Initialize the data processor with optional dataset path.
        
        Args:
            dataset_path (str, optional): Path to the dataset directory or file
        """
        self.dataset_path = dataset_path
        self.data = None
        self.json_data = None
        self.summary_stats = {}
    
    def set_dataset_path(self, path):
        """Set the dataset path."""
        self.dataset_path = path
        print(f"Dataset path set to: {self.dataset_path}")
    
    def load_data(self, file_path=None):
        """
        Load data from a file (CSV, JSON, Excel) and validate its structure.
        
        Args:
            file_path (str, optional): Path to the specific file to load
        
        Returns:
            bool: True if data loaded successfully, False otherwise
        """
        path = file_path or self.dataset_path
        
        if not path or not os.path.exists(path):
            print(f"Error: Path '{path}' does not exist")
            return False
            
        file_ext = os.path.splitext(path)[1].lower()
        
        try:
            print(f"Loading data from {path}...")
            
            if file_ext == '.csv':
                self.data = pd.read_csv(path)
                print(f"Loaded CSV with {len(self.data)} rows and {len(self.data.columns)} columns")
                
            elif file_ext == '.json':
                # Read the file as text first to validate JSON structure
                with open(path, 'r', encoding='utf-8') as f:
                    json_text = f.read()
                    
                # Try to fix any JSON issues
                fixed_json = fix_json_response(json_text)
                
                # Now parse as JSON
                if fixed_json:
                    self.json_data = json.loads(fixed_json)
                    print(f"Successfully parsed JSON with {len(self.json_data)} top-level elements")
                    
                    # If it's a list of records, convert to dataframe
                    if isinstance(self.json_data, list):
                        self.data = pd.DataFrame(self.json_data)
                        print(f"Converted JSON to dataframe with {len(self.data)} rows")
                    elif isinstance(self.json_data, dict) and any(isinstance(v, list) for v in self.json_data.values()):
                        # Find the first list in the dict values and convert it
                        for key, value in self.json_data.items():
                            if isinstance(value, list):
                                self.data = pd.DataFrame(value)
                                print(f"Converted nested JSON array '{key}' to dataframe with {len(self.data)} rows")
                                break
                else:
                    print("Failed to parse JSON properly")
                    return False
                
            elif file_ext in ['.xlsx', '.xls']:
                self.data = pd.read_excel(path)
                print(f"Loaded Excel with {len(self.data)} rows and {len(self.data.columns)} columns")
                
            else:
                print(f"Unsupported file extension: {file_ext}")
                return False
                
            self._validate_data()
            return True
            
        except Exception as e:
            print(f"Error loading data: {str(e)}")
            return False
    
    def _validate_data(self):
        """Validate the data structure for retail inventory analysis."""
        if self.data is None:
            print("No data to validate")
            return False
            
        # Check for essential retail inventory columns
        essential_columns = ['product_id', 'store_id']
        recommended_columns = ['date', 'quantity', 'price', 'sales']
        
        # Check for essential columns
        missing_essential = [col for col in essential_columns if col not in self.data.columns]
        if missing_essential:
            print(f"Warning: Missing essential columns: {missing_essential}")
        
        # Check for recommended columns
        missing_recommended = [col for col in recommended_columns if col not in self.data.columns]
        if missing_recommended:
            print(f"Info: Missing recommended columns: {missing_recommended}")
        
        # Check data types
        if 'product_id' in self.data.columns:
            if not pd.api.types.is_numeric_dtype(self.data['product_id']):
                print("Warning: product_id should be numeric")
                
        if 'store_id' in self.data.columns:
            if not pd.api.types.is_numeric_dtype(self.data['store_id']):
                print("Warning: store_id should be numeric")
        
        # Check for duplicate records
        if 'product_id' in self.data.columns and 'store_id' in self.data.columns and 'date' in self.data.columns:
            dup_count = self.data.duplicated(subset=['product_id', 'store_id', 'date']).sum()
            if dup_count > 0:
                print(f"Warning: Found {dup_count} duplicate records (same product, store, and date)")
        
        # Check for missing values
        missing_values = self.data.isnull().sum()
        if missing_values.sum() > 0:
            print(f"Warning: Found columns with missing values:")
            for col, count in missing_values.items():
                if count > 0:
                    print(f"  - {col}: {count} missing values ({count/len(self.data):.1%})")
        
        return True
    
    def generate_summary_stats(self):
        """Generate summary statistics for the dataset."""
        if self.data is None:
            print("No data available for summary statistics")
            return
        
        print("\nGenerating summary statistics...")
        
        # Basic dataset info
        self.summary_stats['row_count'] = len(self.data)
        self.summary_stats['column_count'] = len(self.data.columns)
        self.summary_stats['columns'] = list(self.data.columns)
        
        # Numeric columns stats
        numeric_cols = self.data.select_dtypes(include=[np.number]).columns
        self.summary_stats['numeric_columns'] = {}
        
        for col in numeric_cols:
            self.summary_stats['numeric_columns'][col] = {
                'min': float(self.data[col].min()),
                'max': float(self.data[col].max()),
                'mean': float(self.data[col].mean()),
                'median': float(self.data[col].median()),
                'std': float(self.data[col].std()),
                'missing': int(self.data[col].isnull().sum())
            }
        
        # Categorical columns stats
        cat_cols = self.data.select_dtypes(exclude=[np.number]).columns
        self.summary_stats['categorical_columns'] = {}
        
        for col in cat_cols:
            value_counts = self.data[col].value_counts().head(10).to_dict()
            # Convert keys to strings if they're not already
            value_counts = {str(k): v for k, v in value_counts.items()}
            
            self.summary_stats['categorical_columns'][col] = {
                'unique_values': int(self.data[col].nunique()),
                'most_common': value_counts,
                'missing': int(self.data[col].isnull().sum())
            }
        
        # Store/product stats if available
        if 'store_id' in self.data.columns:
            self.summary_stats['store_count'] = int(self.data['store_id'].nunique())
            
        if 'product_id' in self.data.columns:
            self.summary_stats['product_count'] = int(self.data['product_id'].nunique())
        
        # Time range if date column exists
        if 'date' in self.data.columns:
            # Convert to datetime if it's not already
            if not pd.api.types.is_datetime64_dtype(self.data['date']):
                try:
                    date_series = pd.to_datetime(self.data['date'])
                    self.summary_stats['date_range'] = {
                        'start': date_series.min().strftime('%Y-%m-%d'),
                        'end': date_series.max().strftime('%Y-%m-%d'),
                        'days': (date_series.max() - date_series.min()).days
                    }
                except:
                    print("Warning: Could not convert 'date' column to datetime")
            else:
                self.summary_stats['date_range'] = {
                    'start': self.data['date'].min().strftime('%Y-%m-%d'),
                    'end': self.data['date'].max().strftime('%Y-%m-%d'),
                    'days': (self.data['date'].max() - self.data['date'].min()).days
                }
        
        print("Summary statistics generated successfully")
        return self.summary_stats
    
    def plot_basic_insights(self, output_dir='./static/images/analysis'):
        """
        Generate basic plots for insights and save them to the specified directory.
        
        Args:
            output_dir (str): Directory to save the plot images
        """
        if self.data is None:
            print("No data available for generating plots")
            return
        
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Plot 1: Distribution of numeric values
        numeric_cols = self.data.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            for col in numeric_cols[:5]:  # Limit to first 5 numeric columns
                plt.figure(figsize=(10, 6))
                plt.hist(self.data[col].dropna(), bins=20, alpha=0.7)
                plt.title(f'Distribution of {col}')
                plt.xlabel(col)
                plt.ylabel('Frequency')
                plt.grid(True, alpha=0.3)
                
                filename = f"{output_dir}/hist_{col}_{timestamp}.png"
                plt.savefig(filename)
                plt.close()
                print(f"Saved histogram for {col} to {filename}")
        
        # Plot 2: Time series if date column exists
        if 'date' in self.data.columns and any(col in self.data.columns for col in ['quantity', 'sales']):
            # Convert to datetime if needed
            if not pd.api.types.is_datetime64_dtype(self.data['date']):
                try:
                    self.data['date'] = pd.to_datetime(self.data['date'])
                except:
                    print("Warning: Could not convert 'date' column to datetime for time series plot")
                    return
            
            # Choose which metric to plot
            metric = 'quantity' if 'quantity' in self.data.columns else 'sales'
            
            # Group by date and sum the metric
            time_series = self.data.groupby('date')[metric].sum().reset_index()
            
            plt.figure(figsize=(12, 6))
            plt.plot(time_series['date'], time_series[metric], marker='o', linestyle='-', alpha=0.7)
            plt.title(f'Time Series of {metric.capitalize()} Over Time')
            plt.xlabel('Date')
            plt.ylabel(metric.capitalize())
            plt.grid(True, alpha=0.3)
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            filename = f"{output_dir}/timeseries_{metric}_{timestamp}.png"
            plt.savefig(filename)
            plt.close()
            print(f"Saved time series plot for {metric} to {filename}")
        
        # Plot 3: Top products/stores
        for col, metric in [('product_id', 'quantity'), ('store_id', 'quantity')]:
            if col in self.data.columns and metric in self.data.columns:
                top_items = self.data.groupby(col)[metric].sum().sort_values(ascending=False).head(10)
                
                plt.figure(figsize=(12, 6))
                top_items.plot(kind='bar', color='skyblue')
                plt.title(f'Top 10 {col.split("_")[0].title()}s by {metric.capitalize()}')
                plt.xlabel(col.replace('_', ' ').title())
                plt.ylabel(metric.capitalize())
                plt.grid(True, alpha=0.3, axis='y')
                plt.tight_layout()
                
                filename = f"{output_dir}/top_{col}_{timestamp}.png"
                plt.savefig(filename)
                plt.close()
                print(f"Saved top {col} plot to {filename}")
    
    def export_summary_to_json(self, output_file='dataset_summary.json'):
        """Export the summary statistics to a JSON file."""
        if not self.summary_stats:
            print("No summary statistics available to export")
            return False
        
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(self.summary_stats, f, indent=2)
            print(f"Summary statistics exported to {output_file}")
            return True
        except Exception as e:
            print(f"Error exporting summary statistics: {str(e)}")
            return False

def scan_dataset_directory(directory_path):
    """
    Scan a directory for potential dataset files and return a list of file paths.
    
    Args:
        directory_path (str): Path to the directory to scan
        
    Returns:
        list: List of file paths found in the directory
    """
    valid_extensions = ['.csv', '.json', '.xlsx', '.xls']
    dataset_files = []
    
    if not os.path.exists(directory_path):
        print(f"Error: Directory '{directory_path}' does not exist")
        return dataset_files
    
    print(f"Scanning directory: {directory_path}")
    
    for root, dirs, files in os.walk(directory_path):
        for file in files:
            file_path = os.path.join(root, file)
            file_ext = os.path.splitext(file)[1].lower()
            
            if file_ext in valid_extensions:
                rel_path = os.path.relpath(file_path, directory_path)
                dataset_files.append({
                    'path': file_path,
                    'relative_path': rel_path,
                    'type': file_ext[1:],  # Remove the dot
                    'size': os.path.getsize(file_path) / (1024 * 1024),  # Size in MB
                    'modified': datetime.fromtimestamp(os.path.getmtime(file_path)).strftime('%Y-%m-%d %H:%M:%S')
                })
    
    print(f"Found {len(dataset_files)} potential dataset files")
    return dataset_files

if __name__ == "__main__":
    # Example usage
    print("\n" + "="*80)
    print(" RETAIL DATASET PROCESSOR ".center(80, "="))
    print("="*80 + "\n")
    
    # Scan for datasets
    default_dataset_dir = "./Dataset"
    dataset_files = scan_dataset_directory(default_dataset_dir)
    
    if dataset_files:
        print("\nAvailable dataset files:")
        for i, file_info in enumerate(dataset_files, 1):
            print(f"{i}. {file_info['relative_path']} ({file_info['type']}, {file_info['size']:.2f} MB)")
        
        # Process the first dataset found
        processor = RetailDataProcessor()
        processor.set_dataset_path(dataset_files[0]['path'])
        
        if processor.load_data():
            processor.generate_summary_stats()
            processor.export_summary_to_json()
            processor.plot_basic_insights()
    else:
        print("No dataset files found. Please specify a dataset directory.") 