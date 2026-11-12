import './App.css'
import Form from './form.jsx'
import Time from './time.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Form />} />
        <Route path='/time' element={<Time />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
