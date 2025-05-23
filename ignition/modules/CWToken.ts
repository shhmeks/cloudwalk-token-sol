import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ProxyModule } from "./Proxy";
import { ethers } from "hardhat";

const MINTER_ROLE = ethers.id("MINTER_ROLE");
const BURNER_ROLE = ethers.id("BURNER_ROLE");

const CWTokenModule = buildModule("CWTokenModule", (m) => {
  const minter = m.getAccount(1);
  const burner = m.getAccount(2);

  const name = m.getParameter("name");
  const symbol = m.getParameter("symbol");

  const { proxy, proxyAdmin } = m.useModule(ProxyModule);
  const token = m.contractAt("CWToken", proxy);

  const initialize = m.call(token, "initialize", [name, symbol]);

  if (minter) {
    m.call(token, "grantRole", [minter, MINTER_ROLE], {
      after: [initialize],
    });
  }

  if (burner) {
    m.call(token, "grantRole", [burner, BURNER_ROLE], { after: [initialize] });
  }

  return { token, proxyAdmin };
});

export default CWTokenModule;
