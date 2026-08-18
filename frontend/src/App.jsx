import { Navigate, Route, Routes } from 'react-router-dom'

import CurrentPractice from './pages/CurrentPractice'
import LccTool from './pages/LccTool'
import Onboarding from './pages/Onboarding'
import Results from './pages/Results'
import SoilInput from './pages/SoilInput'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Onboarding />} />
      <Route path="/soil" element={<SoilInput />} />
      <Route path="/practice" element={<CurrentPractice />} />
      <Route path="/results" element={<Results />} />
      <Route path="/lcc" element={<LccTool />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
