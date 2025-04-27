import json
import re

def format_json_output(json_obj):
    """
    Takes a JSON object and formats it with proper syntax highlighting
    for the terminal output.
    """
    if isinstance(json_obj, dict):
        formatted = json.dumps(json_obj, indent=2)
        # Add color syntax highlighting for terminal
        # Keys in blue
        formatted = re.sub(r'"([^"]+)":', r'\033[34m"\1"\033[0m:', formatted)
        # Strings in green
        formatted = re.sub(r': "([^"]+)"', r': \033[32m"\1"\033[0m', formatted)
        # Numbers in yellow
        formatted = re.sub(r': (\d+)', r': \033[33m\1\033[0m', formatted)
        # Booleans in purple
        formatted = re.sub(r': (true|false)', r': \033[35m\1\033[0m', formatted)
        return formatted
    elif json_obj is None:
        return "\033[31mNone\033[0m"
    else:
        return str(json_obj)

def fix_json_response(text):
    """
    Attempts to fix common JSON formatting issues in LLM responses.
    Returns the fixed JSON object if successful, None otherwise.
    """
    print(f"Original response length: {len(text)}")
    
    # 1. Try to extract JSON from markdown code blocks
    code_block_pattern = r'```(?:json)?\s*([\s\S]*?)\s*```'
    code_blocks = re.findall(code_block_pattern, text, re.DOTALL)
    
    if code_blocks:
        print(f"Found {len(code_blocks)} markdown code blocks")
        for i, block in enumerate(code_blocks):
            print(f"\nTrying code block {i+1}:")
            clean_block = block.strip()
            try:
                json_obj = json.loads(clean_block)
                print(f"Successfully parsed JSON from code block {i+1}")
                return json_obj
            except json.JSONDecodeError as e:
                print(f"JSON decode error in block {i+1}: {str(e)}")
                print(f"Block preview: {clean_block[:100]}...")
    
    # 2. Look for patterns like {...} (longest match)
    json_pattern = r'(\{(?:[^{}]|(?:\{[^{}]*\}))*\})'
    json_matches = re.finditer(json_pattern, text, re.DOTALL)
    
    best_match = None
    best_match_len = 0
    
    for match in json_matches:
        potential_json = match.group(1)
        if len(potential_json) > best_match_len:
            best_match = potential_json
            best_match_len = len(potential_json)
    
    if best_match:
        print(f"\nFound JSON-like pattern with length {best_match_len}")
        print(f"Pattern preview: {best_match[:100]}...")
        try:
            json_obj = json.loads(best_match)
            print("Successfully parsed JSON from regex pattern.")
            return json_obj
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {str(e)}")
    
    # 3. Try parsing the raw text first (sometimes LLMs return valid JSON directly)
    try:
        json_obj = json.loads(text)
        print("Entire response is valid JSON!")
        return json_obj
    except json.JSONDecodeError:
        pass
    
    # 4. Try some common fixes
    print("\nAttempting to fix common JSON issues...")
    fixed_text = text
    
    # Fix unquoted keys
    fixed_text = re.sub(r'([{,])\s*(\w+):', r'\1"\2":', fixed_text)
    
    # Fix single quotes
    fixed_text = fixed_text.replace("'", '"')
    
    # Fix trailing commas in arrays and objects
    fixed_text = re.sub(r',\s*}', '}', fixed_text)
    fixed_text = re.sub(r',\s*]', ']', fixed_text)
    
    try:
        json_obj = json.loads(fixed_text)
        print("Successfully fixed JSON issues!")
        return json_obj
    except json.JSONDecodeError as e:
        print(f"Still couldn't parse JSON after fixes: {str(e)}")
    
    # 5. If we've reached here, attempt to build a valid JSON object from scratch
    print("\nAttempting to construct JSON from scratch...")
    
    # Define expected keys based on errors in the UI
    expected_keys = [
        "demand_forecast", 
        "optimal_inventory_level", 
        "pricing_strategy", 
        "order_recommendations", 
        "key_actions", 
        "projected_impact"
    ]
    
    # Try to extract values for each expected key
    constructed_json = {}
    
    for key in expected_keys:
        key_pattern = fr'"{key}"\s*:\s*(.+?)(?:,\s*"|\s*\}})'
        key_match = re.search(key_pattern, text, re.DOTALL | re.IGNORECASE)
        
        if key_match:
            value = key_match.group(1).strip()
            
            # Try to determine value type and parse it appropriately
            if value.startswith('"') and value.endswith('"'):
                # String value
                constructed_json[key] = value[1:-1]
            elif value.startswith('{') and value.endswith('}'):
                # Nested object
                try:
                    constructed_json[key] = json.loads(value)
                except json.JSONDecodeError:
                    # If parsing fails, use as string
                    constructed_json[key] = {"value": value}
            elif value.startswith('[') and value.endswith(']'):
                # Array
                try:
                    constructed_json[key] = json.loads(value)
                except json.JSONDecodeError:
                    # If parsing fails, use as string
                    constructed_json[key] = {"items": value}
            else:
                # Default to string if type is unclear
                constructed_json[key] = {"value": value}
    
    # Add fallback for missing keys
    for key in expected_keys:
        if key not in constructed_json:
            # Create default placeholder for missing data
            constructed_json[key] = {"error": "No data found for the specified product and store"}
    
    if constructed_json:
        print(f"Created constructed JSON with {len(constructed_json)} keys")
        return constructed_json
    
    # 6. More aggressive approach: Try to extract the longest valid JSON substring
    print("\nTrying aggressive JSON extraction...")
    
    best_json = None
    for i in range(len(text)):
        for j in range(i + 1, len(text) + 1):
            substr = text[i:j]
            if substr.startswith('{') and substr.endswith('}'):
                try:
                    json_obj = json.loads(substr)
                    if best_json is None or len(substr) > len(best_json):
                        best_json = substr
                except json.JSONDecodeError:
                    continue
    
    if best_json:
        print(f"Found valid JSON substring of length {len(best_json)}")
        return json.loads(best_json)
    
    print("Failed to extract any valid JSON. Returning None.")
    return None

def process_llm_response(response_text):
    """
    Process an LLM response to extract and format valid JSON.
    Prints detailed diagnostic information.
    """
    print("=" * 60)
    print("PROCESSING LLM RESPONSE")
    print("=" * 60)
    
    print(f"\nResponse preview (first 300 chars):")
    print("-" * 60)
    print(response_text[:300] + "..." if len(response_text) > 300 else response_text)
    print("-" * 60)
    
    # Try to extract and fix JSON
    json_obj = fix_json_response(response_text)
    
    print("\nEXTRACTED JSON RESULT:")
    print("-" * 60)
    if json_obj:
        print(format_json_output(json_obj))
    else:
        print("No valid JSON found in the response")
    print("-" * 60)
    
    return json_obj

# Example usage
if __name__ == "__main__":
    print("JSON Formatter Utility")
    print("This script can be imported by llm_test.py to help format and fix JSON responses")
    
    # Example test with problematic JSON
    test_json = """
    Sure, here's a JSON object with the requested fields:
    
    ```json
    {
      "greeting": "Hello there",
      "message": "Welcome to the JSON formatter!"
    }
    ```
    
    Hope this helps!
    """
    
    result = process_llm_response(test_json)
    print("\nFinal result as Python object:", result) 