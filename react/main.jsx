
import React from 'react'
import { createRoot } from 'react-dom/client'
import Ankaido from './Ankaido.jsx'

// Import CSS files so Vite can process them
import '../css/common.css'
import '../css/trakaido.css'
import '../css/trakaido_welcome.css'

// Initialize the React app
const container = document.getElementById('react-root')
const root = createRoot(container)
root.render(<Ankaido />)
