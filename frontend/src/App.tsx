import './App.css'
import Button from './components/Button'
import NavBar from './components/Navbar'
import { BrowserRouter } from "react-router-dom";
import { getCurrentUser } from './services/authService';
import { useDispatch } from 'react-redux'
import { useEffect } from 'react';
import { login , logout , setAuthChecked} from './store/userSlice';
function App() {
  const dispatch = useDispatch();
  useEffect(() => {
    async function checkLogin() {
      try {
        const user = await getCurrentUser();
        dispatch(login(user))
      } catch {
        dispatch(logout())
      } finally {
        dispatch(setAuthChecked());
      }
    }
     checkLogin();
  },[dispatch])
  return (
    <BrowserRouter>
      <NavBar />
    </BrowserRouter>
    
  )
}

export default App
