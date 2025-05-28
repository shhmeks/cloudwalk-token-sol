# CloudWalk Token

[![Compile](https://github.com/shhmeks/cloudwalk-token-sol/workflows/Compile/badge.svg)](https://github.com/shhmeks/cloudwalk-token-sol/actions)
[![Test](https://github.com/shhmeks/cloudwalk-token-sol/workflows/Test/badge.svg)](https://github.com/shhmeks/cloudwalk-token-sol/actions)
[![Coverage Status](https://codecov.io/gh/shhmeks/cloudwalk-token-sol/branch/main/graph/badge.svg)](https://codecov.io/gh/shhmeks/cloudwalk-token-sol)

A mintable, burnable, and freezable upgradeable ERC20 token implementation with role-based access control and EIP-7201 compliance.

## Overview

This project implements an upgradeable ERC20 token with restricted mint/burn functionality and advanced balance freezing capabilities as part of a Solidity developer position application.

### Task Requirements

**Enhanced Mintable ERC20 Token**

- ✅ Upgradeable ERC20 token implementation
- ✅ Mint and burn functionality with access control
- ✅ **Balance freezing and unfreezing capabilities**
- ✅ **Special withdrawal accounts for frozen balances**
- ✅ **EIP-7201 compliant storage layout**
- ✅ 100% test coverage
- ✅ Well-structured and documented code

## Design Choices

### Upgradeability

- **OpenZeppelin Upgradeable Contracts**: Used `ERC20Upgradeable` and `AccessControlUpgradeable` for proven security and gas efficiency
- **Transparent Proxy Pattern**: Chosen for its simplicity and wide adoption in the ecosystem
- **Initializer Pattern**: Used `initializer` and `reinitializer` modifiers for safe upgrades
- **EIP-7201 Storage**: Implements namespaced storage layout for upgrade safety and collision prevention

### Access Control

- **Role-Based Access Control (RBAC)**: Implemented using OpenZeppelin's `AccessControlUpgradeable`
- **MINTER_ROLE**: Controls access to mint functionality
- **BURNER_ROLE**: Controls access to burn functionality
- **FREEZER_ROLE**: Controls access to freeze/unfreeze user balances
- **WITHDRAWER_ROLE**: Controls access to withdraw frozen balances from users
- **DEFAULT_ADMIN_ROLE**: Manages role assignments (granted to deployer)

### Security Features

- **Zero Value Protection**: Custom `nonZero` modifier prevents minting/burning/freezing zero tokens
- **Custom Errors**: Gas-efficient error handling with specific error types
- **Role Separation**: Each functionality requires separate roles for better security
- **Transfer Restrictions**: Frozen balances cannot be transferred by users
- **EIP-7201 Compliance**: Prevents storage collisions in upgrades

### Freezing Architecture

- **Modular Design**: `FreezableUpgradeable` abstract contract provides reusable freezing functionality
- **Partial Freezing**: Allows freezing part or all of user's balance
- **Authorized Withdrawals**: Special accounts can withdraw frozen balances
- **Transfer Protection**: Prevents users from transferring frozen portions

## Architecture

```
CWToken (Upgradeable)
├── ERC20Upgradeable (OpenZeppelin)
├── FreezableUpgradeable (Custom)
│   ├── AccessControlUpgradeable (OpenZeppelin)
│   └── IFreezable (Interface)
└── ICWToken (Custom interface)
```

## SETUP

### Prerequisites

- Node.js 22+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/shhmeks/cloudwalk-token-sol.git
cd cloudwalk-token-sol
```

2. Install dependencies:

```bash
npm install
```

3. Compile contracts:

```bash
npm run compile
```

## TEST

Run the complete test suite:

```bash
npm run test
```

### Test Structure

- **Deployment & Initialization**: Contract setup and initialization tests
- **Minting**: Mint functionality and access control tests
- **Burning**: Burn functionality and access control tests
- **Freezing**: Balance freeze/unfreeze functionality tests
- **Frozen Withdrawals**: Special withdrawal account tests
- **Transfer Restrictions**: Frozen balance transfer prevention tests
- **Roles**: Role-based access control tests
- **Upgrade**: Proxy upgrade functionality tests
- **EIP-7201**: Storage location calculation and collision prevention tests

## COVERAGE

Generate and view test coverage:

```bash
npm run test:coverage
```

### View Coverage Reports

- **Local HTML Report**: Open `coverage/lcov-report/index.html` in your browser
- **Codecov Dashboard**: [View detailed coverage on Codecov](https://codecov.io/gh/shhmeks/cloudwalk-token-sol)
- **CI/CD Integration**: Coverage automatically uploaded to Codecov on each push

### Target Coverage

- **Lines**: 100%
- **Functions**: 100%
- **Branches**: 100%
- **Statements**: 100%

**Current Coverage**: [![codecov](https://codecov.io/gh/shhmeks/cloudwalk-token-sol/branch/main/graph/badge.svg)](https://codecov.io/gh/shhmeks/cloudwalk-token-sol)

## Contract Features

### Core Functions

#### `initialize(string memory name_, string memory symbol_)`

- Initializes the upgradeable contract
- Sets token name and symbol
- Grants `DEFAULT_ADMIN_ROLE` to deployer

#### `mint(address to_, uint256 amount_)`

- Mints tokens to specified address
- Requires `MINTER_ROLE`
- Reverts on zero amount

#### `burn(address from_, uint256 amount_)`

- Burns tokens from specified address
- Requires `BURNER_ROLE`
- Reverts on zero amount or insufficient balance

### Freezing Functions

#### `freezeUserBalance(address user_, uint256 amount_)`

- Freezes part or all of user's balance
- Requires `FREEZER_ROLE`
- Reverts if trying to freeze more than available unfrozen balance
- Emits `BalanceFrozen` event

#### `unfreezeUserBalance(address user_, uint256 amount_)`

- Unfreezes part or all of user's frozen balance
- Requires `FREEZER_ROLE`
- Reverts if trying to unfreeze more than frozen balance
- Emits `BalanceUnfrozen` event

#### `withdrawFrozenBalance(address from_, address to_, uint256 amount_)`

- Withdraws frozen balance from user to specified address
- Requires `WITHDRAWER_ROLE`
- Bypasses normal transfer restrictions for frozen balances
- Emits `FrozenBalanceWithdrawn` event

#### `frozenBalanceOf(address user_) → uint256`

- Returns the amount of frozen balance for a user
- View function, no gas cost

#### `unfrozenBalanceOf(address user_) → uint256`

- Returns the amount of unfrozen balance for a user
- View function, no gas cost

### Access Control

```solidity
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
bytes32 public constant FREEZER_ROLE = keccak256("FREEZER_ROLE");
bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");
```

### Transfer Restrictions

- **Normal Transfers**: Users can only transfer their unfrozen balance
- **Frozen Balance Protection**: Transfers that would exceed unfrozen balance are reverted
- **Special Withdrawals**: Only `WITHDRAWER_ROLE` accounts can move frozen balances

## EIP-7201 Implementation

The contract implements [EIP-7201](https://eips.ethereum.org/EIPS/eip-7201) for namespaced storage:

```solidity
// Freezable storage namespace
bytes32 private constant FreezableStorageLocation =
    keccak256(abi.encode(uint256(keccak256("freezable.storage.main")) - 1)) & ~bytes32(uint256(0xff));
```

**Benefits:**

- ✅ **Collision Prevention**: Isolated storage for different features
- ✅ **Upgrade Safety**: New versions can add storage without conflicts
- ✅ **Standardization**: Follows latest Ethereum storage standards

## Deployment

The project includes Hardhat Ignition modules for deployment:

```bash
npx hardhat ignition deploy ignition/modules/CWToken.ts --parameters '{"name": "CloudWalk Token", "symbol": "CWT"}'
```

## Upgrade Example

The `CWTokenV2` contract demonstrates upgrade functionality while maintaining freezing capabilities:

```solidity
contract CWTokenV2 is CWToken {
    string public version;

    function initializeV2() external reinitializer(2) {
        version = "v2";
    }
}
```

## Use Cases

### Balance Freezing Scenarios

1. **Regulatory Compliance**: Freeze suspicious account balances
2. **Dispute Resolution**: Temporarily freeze balances during investigations
3. **Security Measures**: Freeze compromised accounts
4. **Legal Requirements**: Comply with court orders or sanctions

### Special Withdrawal Scenarios

1. **Law Enforcement**: Authorized seizure of frozen assets
2. **Regulatory Actions**: Government-mandated asset recovery
3. **Dispute Resolution**: Transfer disputed funds to escrow
4. **Emergency Response**: Recover funds from compromised accounts

## Technology Stack

- **Solidity**: 0.8.30
- **Hardhat**: Development environment
- **OpenZeppelin**: Upgradeable contracts and access control
- **TypeScript**: Type-safe testing
- **Ethers.js**: Ethereum library
- **Chai**: Assertion library
- **Solidity Coverage**: Test coverage analysis
- **EIP-7201**: Namespaced storage layout standard

## CI/CD

Automated workflows for:

- **Compile**: Contract compilation verification
- **Test**: Automated test execution including freezing functionality
- **Coverage**: Test coverage reporting and artifact generation

## Security Considerations

1. **Role Management**: Carefully manage who has `FREEZER_ROLE` and `WITHDRAWER_ROLE`
2. **Upgrade Safety**: EIP-7201 storage prevents storage collisions during upgrades
3. **Access Control**: Multi-role system prevents single point of failure
4. **Event Monitoring**: All freezing operations emit events for transparency
5. **Transfer Validation**: Automatic prevention of frozen balance transfers

## License

MIT License - see [LICENSE](LICENSE) file for details.
