#!/usr/bin/env python3
"""
React Compilation Script for Trakaido

This script compiles the React JSX components into a single HTML file
that can be served from a Flask static content service.

Requirements:
- Node.js and npm installed
- Babel CLI and presets for JSX transformation
"""

import os
import sys
import subprocess
import json
import shutil
from pathlib import Path

# Configuration
REACT_DIR = Path(__file__).parent / "react"
BUILD_DIR = Path(__file__).parent / "build"
OUTPUT_FILE = BUILD_DIR / "index.html"
JS_OUTPUT_FILE = BUILD_DIR / "app.js"
STATIC_DIR = BUILD_DIR / "static"

# React CDN URLs
REACT_CDN = "https://unpkg.com/react@18/umd/react.production.min.js"
REACT_DOM_CDN = "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"

def check_node_installed():
    """Check if Node.js and npm are installed"""
    try:
        subprocess.run(["node", "--version"], check=True, capture_output=True)
        subprocess.run(["npm", "--version"], check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def install_babel_dependencies():
    """Install Babel and required presets"""
    print("Installing Babel dependencies...")
    
    # Create package.json if it doesn't exist
    package_json = {
        "name": "trakaido-react-compiler",
        "version": "1.0.0",
        "description": "Compilation tools for Trakaido React app",
        "devDependencies": {
            "@babel/cli": "^7.23.0",
            "@babel/core": "^7.23.0",
            "@babel/preset-react": "^7.22.0",
            "@babel/preset-env": "^7.23.0"
        },
        "babel": {
            "presets": [
                ["@babel/preset-env", {"targets": {"browsers": ["last 2 versions"]}}],
                ["@babel/preset-react", {"runtime": "classic"}]
            ]
        }
    }
    
    with open("package.json", "w") as f:
        json.dump(package_json, f, indent=2)
    
    try:
        subprocess.run(["npm", "install"], check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Failed to install dependencies: {e}")
        return False

def get_component_dependencies():
    """Get the correct order of components based on their dependencies"""
    # Define the dependency order (components that don't depend on others first)
    component_order = [
        "useGlobalSettings.jsx",
        "useFullscreen.js", 
        "WordListManager.js",
        "AudioButton.jsx",
        "StatsDisplay.jsx",
        "MultipleChoiceOptions.jsx",
        "ConjugationTable.jsx",
        "DeclensionTable.jsx",
        "VocabularyList.jsx",
        "TypingMode.jsx",
        "FlashCardMode.jsx",
        "ListeningMode.jsx",
        "MultipleChoiceMode.jsx",
        "StudyMaterialsSelector.jsx",
        "StudyModeSelector.jsx",
        "ConjugationsMode.jsx",
        "DeclensionsMode.jsx",
        "Trakaido.jsx"  # Main component last
    ]
    
    return component_order

def compile_jsx_components():
    """Compile all JSX components using Babel"""
    print("Compiling JSX components...")
    
    # Create build directory
    BUILD_DIR.mkdir(exist_ok=True)
    
    # Get component files in dependency order
    component_order = get_component_dependencies()
    compiled_components = []
    
    for component_file in component_order:
        component_path = REACT_DIR / component_file
        if not component_path.exists():
            print(f"Warning: Component {component_file} not found, skipping...")
            continue
            
        print(f"Compiling {component_file}...")
        
        # Read the component file
        with open(component_path, 'r', encoding='utf-8') as f:
            jsx_content = f.read()
        
        # Transform imports to work in browser environment
        jsx_content = transform_imports(jsx_content, component_file)
        
        # Write temporary file for Babel
        temp_file = BUILD_DIR / f"temp_{component_file}"
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(jsx_content)
        
        # Compile with Babel
        try:
            result = subprocess.run([
                "npx", "babel", str(temp_file),
                "--presets", "@babel/preset-react,@babel/preset-env"
            ], capture_output=True, text=True, check=True)
            
            compiled_js = result.stdout
            compiled_components.append(compiled_js)
            
            # Clean up temp file
            temp_file.unlink()
            
        except subprocess.CalledProcessError as e:
            print(f"Failed to compile {component_file}: {e}")
            print(f"Error output: {e.stderr}")
            return None
    
    return compiled_components

def transform_imports(jsx_content, filename):
    """Transform ES6 imports to work in browser environment"""
    lines = jsx_content.split('\n')
    transformed_lines = []
    
    for line in lines:
        # Skip import statements - we'll handle dependencies differently
        if line.strip().startswith('import ') and 'from' in line:
            # Convert to comment for reference
            transformed_lines.append(f"// {line}")
        else:
            transformed_lines.append(line)
    
    # For the main Trakaido component, we need to handle the export
    if filename == "Trakaido.jsx":
        # Replace the default export with a global assignment
        transformed_content = '\n'.join(transformed_lines)
        if 'export default FlashCardApp' in transformed_content:
            transformed_content = transformed_content.replace(
                'export default FlashCardApp',
                'window.FlashCardApp = FlashCardApp'
            )
        return transformed_content
    
    return '\n'.join(transformed_lines)

def create_html_template(compiled_js_components):
    """Create the final HTML file with all components"""
    print("Creating HTML template...")
    
    # Copy lithuanianApi.js to build directory
    api_js_source = REACT_DIR / "js" / "lithuanianApi.js"
    api_js_dest = BUILD_DIR / "lithuanianApi.js"
    if api_js_source.exists():
        shutil.copy2(api_js_source, api_js_dest)
    
    # Combine all compiled components
    all_js = '\n\n'.join(compiled_js_components)
    
    # Add initialization code
    init_js = """
// Initialize the React app
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('react-root');
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(FlashCardApp));
});
"""
    
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🇱🇹 Lithuanian Vocabulary Flash Cards</title>
    
    <!-- React CDN -->
    <script crossorigin src="{REACT_CDN}"></script>
    <script crossorigin src="{REACT_DOM_CDN}"></script> 
</head>
<body>
    <div id="react-root"></div>
    
    <!-- Lithuanian API -->
    <script src="lithuanianApi.js"></script>
    
    <!-- Compiled React Components -->
    <script>
{all_js}

{init_js}
    </script>
</body>
</html>"""
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(html_template)
    
    print(f"HTML file created: {OUTPUT_FILE}")

def main():
    """Main compilation process"""
    print("🇱🇹 Trakaido React Compilation Script")
    print("=" * 40)
    
    # Check if Node.js is installed
    if not check_node_installed():
        print("❌ Node.js and npm are required but not found.")
        print("Please install Node.js from https://nodejs.org/")
        sys.exit(1)
    
    print("✅ Node.js and npm found")
    
    # Install Babel dependencies
    if not install_babel_dependencies():
        print("❌ Failed to install Babel dependencies")
        sys.exit(1)
    
    print("✅ Babel dependencies installed")
    
    # Compile JSX components
    compiled_components = compile_jsx_components()
    if compiled_components is None:
        print("❌ Failed to compile JSX components")
        sys.exit(1)
    
    print("✅ JSX components compiled")
    
    # Create HTML template
    create_html_template(compiled_components)
    print("✅ HTML template created")
    
    print("\n🎉 Compilation complete!")
    print(f"📁 Output files:")
    print(f"   - {OUTPUT_FILE}")
    print(f"\n📝 Note: You'll need to implement the actual API endpoints")
    print(f"   in flask_server.py based on your data structure.")

if __name__ == "__main__":
    main()