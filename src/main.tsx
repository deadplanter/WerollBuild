import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { testFirestoreConnection } from './firebase/config';

// Verificar conexión a Firestore en el arranque
testFirestoreConnection();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
