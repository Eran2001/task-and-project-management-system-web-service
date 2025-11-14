import { useSelector, useDispatch } from "react-redux";
import { handleMobileMenu } from "@/store/layout";
import { useLocation } from "react-router-dom";

const useMobileMenu = () => {
  const dispatch = useDispatch();
  const mobileMenu = useSelector((state) => state.layout.mobileMenu);
  const location = useLocation();
  console.log(location);

  // ** Toggles Mobile Menu
  const setMobileMenu = (val) => dispatch(handleMobileMenu(val));

  return [mobileMenu, setMobileMenu];
};

export default useMobileMenu;
