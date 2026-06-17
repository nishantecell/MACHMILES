
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  document.body.innerHTML = '<h1 style="color:red;padding:2rem">ERROR: No root element found</h1>'
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  } catch(e) {
    rootElement.innerHTML = '<h1 style="color:red;padding:2rem">ERROR: ' + e.message + '</h1>'
  }
}
