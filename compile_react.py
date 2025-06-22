
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
CSS_DIR = Path(__file__).parent / "css"
BUILD_DIR = Path(__file__).parent / "build"
OUTPUT_FILE = BUILD_DIR / "index.html"
JS_OUTPUT_FILE = BUILD_DIR / "app.js"
STATIC_DIR = BUILD_DIR / "static"
CSS_BUILD_DIR = BUILD_DIR / "css"

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

def ensure_babel_dependencies():
    """Ensure Babel dependencies are available"""
    print("Checking Babel dependencies...")
    
    # Check if node_modules exists and has required packages
    node_modules = Path("node_modules")
    babel_cli = node_modules / "@babel" / "cli"
    babel_core = node_modules / "@babel" / "core"
    
    if not (babel_cli.exists() and babel_core.exists()):
        print("Installing missing Babel dependencies...")
        try:
            subprocess.run(["npm", "install"], check=True)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Failed to install dependencies: {e}")
            return False
    
    print("✅ Babel dependencies found")
    return True

def copy_css_files():
    """Copy CSS files to the build directory"""
    print("Copying CSS files...")
    
    # Create CSS build directory
    CSS_BUILD_DIR.mkdir(exist_ok=True)
    
    # Check if CSS directory exists
    if not CSS_DIR.exists():
        print(f"Warning: CSS directory {CSS_DIR} not found, skipping CSS files...")
        return []
    
    copied_files = []
    
    # Copy all CSS files from the css directory
    for css_file in CSS_DIR.glob("*.css"):
        dest_file = CSS_BUILD_DIR / css_file.name
        shutil.copy2(css_file, dest_file)
        copied_files.append(css_file.name)
        print(f"Copied {css_file.name}")
    
    # Also copy CSS from react/styles if it exists
    react_styles = REACT_DIR / "styles"
    if react_styles.exists():
        for css_file in react_styles.glob("*.css"):
            dest_file = CSS_BUILD_DIR / css_file.name
            shutil.copy2(css_file, dest_file)
            copied_files.append(css_file.name)
            print(f"Copied {css_file.name} from react/styles")
    
    return copied_files

def get_component_dependencies():
    """Get the correct order of components based on their dependencies"""
    # Define the dependency order (components that don't depend on others first)
    component_order = [
        # Utilities and hooks first
        "DataStorage/safeStorage.js",
        "DataStorage/indexedDBManager.js", 
        "Managers/journeyStatsManager.jsx",
        "Managers/corpusChoicesManager.js",
        "Managers/storageConfigManager.js",
        "Managers/WordListManager.js",
        "useGlobalSettings.jsx",
        "useFullscreen.js",
        
        # Basic components
        "AudioButton.jsx",
        "StatsDisplay.jsx",
        "MultipleChoiceOptions.jsx",
        "ConjugationTable.jsx",
        "DeclensionTable.jsx",
        "SplashScreen.jsx",
        "WelcomeScreen.jsx",
        "VocabularyList.jsx",
        "StudyMaterialsModal.jsx",
        "StudyModeSelector.jsx",
        "ExposureStatsModal.jsx",
        
        # Study modes
        "TypingMode.jsx",
        "FlashCardMode.jsx",
        "ListeningMode.jsx",
        "MultipleChoiceMode.jsx",
        "ConjugationsMode.jsx",
        "DeclensionsMode.jsx",
        "JourneyMode.jsx",
        
        # Main component last
        "Trakaido.jsx"
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
        # Check in root react directory first
        component_path = REACT_DIR / component_file
        
        # If not in root, check in Components directory
        if not component_path.exists():
            component_path = REACT_DIR / "Components" / component_file
        
        # If not in Components, check in Modes directory
        if not component_path.exists():
            component_path = REACT_DIR / "Modes" / component_file
        
        # If still not found, skip
        if not component_path.exists():
            print(f"Warning: Component {component_file} not found, skipping...")
            continue
            
        print(f"Compiling {component_path.relative_to(REACT_DIR.parent)}...")
        
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
    """Transform ES6 imports and require() calls to work in browser environment"""
    import re
    
    lines = jsx_content.split('\n')
    transformed_lines = []
    
    for line in lines:
        # Remove import statements and replace with comments
        if line.strip().startswith('import ') and ('from' in line or line.strip().endswith("';") or line.strip().endswith('";')):
            # Transform relative imports to window object references
            if 'from \'./\'' in line or 'from "./\'' in line or 'from \'../\'' in line or 'from "../\'' in line:
                # Handle named imports like: import { name1, name2 } from './module'
                named_import_match = re.search(r'import\s+{([^}]+)}\s+from\s+[\'"]\.\.?\/(\w+)[\'"]', line)
                if named_import_match:
                    imported_names = [name.strip() for name in named_import_match.group(1).split(',')]
                    source_file = named_import_match.group(2)
                    for name in imported_names:
                        transformed_lines.append(f'const {name} = window.{name} || window.{source_file};')
                else:
                    # Handle default imports like: import moduleName from './module' or import moduleName from '../module'
                    default_match = re.search(r'import\s+(\w+)\s+from\s+[\'"]\.\.?\/(\w+)[\'"]', line)
                    if default_match:
                        imported_name = default_match.group(1)
                        source_file = default_match.group(2)
                        transformed_lines.append(f'const {imported_name} = window.{source_file};')
                    else:
                        # Handle mixed imports like: import defaultName, { namedExport } from './module'
                        mixed_match = re.search(r'import\s+(\w+),\s*{([^}]+)}\s+from\s+[\'"]\.\.?\/(\w+)[\'"]', line)
                        if mixed_match:
                            default_name = mixed_match.group(1)
                            named_exports = [name.strip() for name in mixed_match.group(2).split(',')]
                            source_file = mixed_match.group(3)
                            transformed_lines.append(f'const {default_name} = window.{source_file};')
                            for name in named_exports:
                                transformed_lines.append(f'const {name} = window.{name} || window.{source_file};')
                        else:
                            transformed_lines.append(f"// {line}")
            else:
                transformed_lines.append(f"// {line}")
        else:
            transformed_lines.append(line)
    
    transformed_content = '\n'.join(transformed_lines)
    
    # Transform require() calls to window object references
    transformed_content = re.sub(
        r'require\([\'"]\.\.?\/([^\'\"]+)[\'"]\)',
        r'window.\1',
        transformed_content
    )
    
    # Handle exports and make components globally available
    component_name = filename.replace('.jsx', '').replace('.js', '')
    
    # Handle default exports
    if 'export default' in transformed_content:
        # Extract the exported component name
        export_match = re.search(r'export default (\w+)', transformed_content)
        if export_match:
            exported_name = export_match.group(1)
            transformed_content = transformed_content.replace(
                f'export default {exported_name}',
                f'window.{component_name} = {exported_name};'
            )
        else:
            # Handle anonymous default exports
            transformed_content = re.sub(
                r'export default\s+',
                f'window.{component_name} = ',
                transformed_content
            )
    
    # Handle named exports for hooks and utilities
    named_exports = re.findall(r'export\s+(?:const|function|class)\s+(\w+)', transformed_content)
    for export_name in named_exports:
        transformed_content = re.sub(
            rf'export\s+(const|function|class)\s+{export_name}',
            rf'\1 {export_name}',
            transformed_content
        )
        transformed_content += f'\nwindow.{export_name} = {export_name};'
    
    # Handle export { ... } syntax
    export_block_match = re.search(r'export\s+{([^}]+)}', transformed_content)
    if export_block_match:
        exports = [name.strip() for name in export_block_match.group(1).split(',')]
        for export_name in exports:
            transformed_content += f'\nwindow.{export_name} = {export_name};'
        transformed_content = re.sub(r'export\s+{[^}]+}', '', transformed_content)
    
    return transformed_content

def create_html_template(compiled_js_components, css_files):
    """Create the final HTML file with all components"""
    print("Creating HTML template...")
    
    # Process and copy lithuanianApi.js to build directory
    api_js_source = REACT_DIR / "js" / "lithuanianApi.js"
    api_js_dest = BUILD_DIR / "lithuanianApi.js"
    if api_js_source.exists():
        # Read and transform the API file to remove require() calls
        with open(api_js_source, 'r', encoding='utf-8') as f:
            api_content = f.read()
        
        # Transform require() calls and module.exports
        import re
        api_content = re.sub(
            r'const\s+(\w+)\s+=\s+require\([\'"]([^\'\"]+)[\'"]\);?',
            r'// const \1 = require("\2"); // Browser global used instead',
            api_content
        )
        api_content = re.sub(
            r'module\.exports\s*=\s*{([^}]+)}',
            r'// Make API functions globally available\nwindow.lithuanianApi = {\1};',
            api_content
        )
        
        with open(api_js_dest, 'w', encoding='utf-8') as f:
            f.write(api_content)
    
    # Combine all compiled components
    all_js = '\n\n'.join(compiled_js_components)
    
    # Add initialization code with React 19 compatibility
    init_js = """
// Initialize the React app with React 19 compatibility
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('react-root');
    
    // Check if we have React 18+ createRoot or fall back to React 17 render
    if (ReactDOM.createRoot) {
        // React 18+
        const root = ReactDOM.createRoot(container);
        root.render(React.createElement(window.Trakaido || window.FlashCardApp));
    } else {
        // React 17 fallback
        ReactDOM.render(React.createElement(window.Trakaido || window.FlashCardApp), container);
    }
});
"""
    
    # Generate CSS link tags for copied CSS files
    css_links = ""
    for css_file in css_files:
        css_links += f'    <link rel="stylesheet" href="css/{css_file}">\n'
    
    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🇱🇹 Lithuanian Vocabulary Flash Cards</title>
    
    <!-- React CDN -->
    <script crossorigin src="{REACT_CDN}"></script>
    <script crossorigin src="{REACT_DOM_CDN}"></script> 
    
    <!-- CSS Files -->
{css_links}
    
    <style>
        body {{
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background-color: #f5f5f5;
        }}
        #react-root {{
            min-height: 100vh;
        }}
    </style>
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
    
    # Ensure Babel dependencies
    if not ensure_babel_dependencies():
        print("❌ Failed to install Babel dependencies")
        sys.exit(1)
    
    print("✅ Babel dependencies ready")
    
    # Copy CSS files
    css_files = copy_css_files()
    print("✅ CSS files staged")
    
    # Compile JSX components
    compiled_components = compile_jsx_components()
    if compiled_components is None:
        print("❌ Failed to compile JSX components")
        sys.exit(1)
    
    print("✅ JSX components compiled")
    
    # Create HTML template
    create_html_template(compiled_components, css_files)
    print("✅ HTML template created")
    
    print("\n🎉 Compilation complete!")
    print(f"📁 Output files:")
    print(f"   - {OUTPUT_FILE}")
    if css_files:
        print(f"   - CSS files in {CSS_BUILD_DIR}:")
        for css_file in css_files:
            print(f"     • {css_file}")
    print(f"\n📝 Note: You can now serve the build/index.html file")
    print(f"   with any static web server.")

if __name__ == "__main__":
    main()
