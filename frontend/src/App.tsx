import "./App.css";
import { BrowserRouter } from "react-router-dom";
import AppContent from "./AppContent";
import { useDispatch } from "react-redux";
import { logout as logoutAction} from "./store/userSlice";
import { logout as logoutAPI } from "./services/authService";


function App() {
  const dispatch = useDispatch();

  const handleLogout = async () => {
  try {
    await logoutAPI();
    dispatch(logoutAction());
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
  return (
    <BrowserRouter>
      <AppContent />
      <button onClick={handleLogout}>Logout</button>
    </BrowserRouter>
  );
}

export default App;
