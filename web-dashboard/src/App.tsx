import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import TasksPage from './pages/TasksPage'
import MapPage from './pages/MapPage'
import LoginPage from './pages/LoginPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="map" element={<MapPage />} />
      </Route>
    </Routes>
  )
}

export default App

