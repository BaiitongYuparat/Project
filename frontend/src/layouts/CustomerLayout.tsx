import { Outlet } from "react-router-dom";
import NavBar from "../components/Navbar";

function CustomerLayout() {
  return (
    <>
      <NavBar />
      <main>
        <Outlet />
      </main>
    </>
  );
}

export default CustomerLayout;