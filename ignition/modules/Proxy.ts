import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export const ProxyModule = buildModule("ProxyModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  const implementation = m.contract("CWToken", [], {
    id: "Implementation",
  });
  const proxy = m.contract("TransparentUpgradeableProxy", [implementation, proxyAdminOwner, "0x"]);

  const proxyAdminAddress = m.readEventArgument(proxy, "AdminChanged", "newAdmin");
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress);

  return { proxyAdmin, proxy };
});
