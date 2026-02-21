import './App.css'
import ChatPage from './components/ChatPage'
import Homepages from './components/HomePages.jsx'
import {Routes, Route } from 'react-router-dom'

function App() {
  return (
    <div className='App'>
      <Routes>
        <Route path="/" element={<Homepages />}/>
        <Route path="/chats" element={<ChatPage/>}/>
      </Routes>
    </div>
  )
}

export default App
