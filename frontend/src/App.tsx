import "./App.css";
import { BrowserRouter } from "react-router-dom";
import AppContent from "./AppContent";
import { FavoritesProvider } from "./context/FavoritesContext";

function App() {

  return (
    <BrowserRouter>
      <FavoritesProvider>
        <AppContent />
      </FavoritesProvider>
    </BrowserRouter>
  );
}

export default App;
