
import React from 'react'
import { createRoot } from 'react-dom/client'
import Trakaido from './Trakaido.jsx'

// Initialize the React app
const container = document.getElementById('react-root')
const root = createRoot(container)
root.render(<Trakaido />)
