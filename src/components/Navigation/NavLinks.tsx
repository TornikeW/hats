import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import { toggleMenu } from "../../actions";
import { RoutePaths, ScreenSize } from "../../constants/constants";
import { RootState } from "../../reducers";
import "./NavLinks.scss";

export default function NavLinks() {
  const dispatch = useDispatch();
  const screenSize = useSelector((state: RootState) => state.layoutReducer.screenSize);

  const handleClick = () => {
    if (screenSize === ScreenSize.Mobile) {
      dispatch(toggleMenu(false));
    }
  }

  const activeableClass = ({ isActive }) => (isActive ? "nav-link selected" : "nav-link")

  return (
    <>
      <NavLink to={RoutePaths.vaults} className={activeableClass} onClick={() => handleClick()}>Vaults</NavLink>
      <NavLink to={RoutePaths.gov} className={activeableClass} onClick={() => handleClick()}>Gov</NavLink>
      <NavLink to={RoutePaths.airdrop_machine} className={activeableClass} onClick={() => handleClick()}>Airdrop Machine</NavLink>
      <NavLink to={RoutePaths.vulnerability} className={({ isActive }) =>
        (isActive ? "nav-link vurnability selected" : "nav-link vulnerability")}
        onClick={() => handleClick()}>Submit Vulnerability</NavLink>
      <NavLink to={RoutePaths.committee_tools} className={({ isActive }) =>
        (isActive ? "nav-link selected" : "nav-link hidden")}
        onClick={() => handleClick()}>Committee Tools</NavLink>
      <NavLink to={RoutePaths.vault_editor} className={({ isActive }) =>
        (isActive ? "nav-link selected" : "nav-link hidden")}
        onClick={() => handleClick()}>Vault Editor</NavLink>
    </>
  )
}
