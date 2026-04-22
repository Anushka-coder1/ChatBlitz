import './App.css'
import { Routes, Route } from 'react-router-dom'
import Login from './pages/user-login/login'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="App">
        <Routes>
          <Route path="/user-login" element={<Login />} />
        </Routes>
      </div>
    </>
  );
}

export default App
