# CloudWalk Token

[![Compile](https://github.com/shhmeks/cloudwalk-token-sol/workflows/Compile/badge.svg)](https://github.com/shhmeks/cloudwalk-token-sol/actions)
[![Test](https://github.com/shhmeks/cloudwalk-token-sol/workflows/Test/badge.svg)](https://github.com/shhmeks/cloudwalk-token-sol/actions)
[![Coverage Status](https://codecov.io/gh/shhmeks/cloudwalk-token-sol/branch/main/graph/badge.svg)](https://codecov.io/gh/shhmeks/cloudwalk-token-sol)

A mintable and burnable upgradeable ERC20 token implementation with role-based access control.

## Overview

This project implements an upgradeable ERC20 token with restricted mint and burn functionality as part of a Solidity developer position application.

### Task Requirements

**Mintable ERC20 Token**

- ✅ Upgradeable ERC20 token implementation
- ✅ Mint and burn functionality with access control
- ✅ 100% test coverage
- ✅ Well-structured and documented code

## Design Choices

### Upgradeability

- **OpenZeppelin Upgradeable Contracts**: Used `ERC20Upgradeable` and `AccessControlUpgradeable` for proven security and gas efficiency
- **Transparent Proxy Pattern**: Chosen for its simplicity and wide adoption in the ecosystem
- **Initializer Pattern**: Used `initializer` and `reinitializer` modifiers for safe upgrades

### Access Control

- **Role-Based Access Control (RBAC)**: Implemented using OpenZeppelin's `AccessControlUpgradeable`
- **MINTER_ROLE**: Controls access to mint functionality
- **BURNER_ROLE**: Controls access to burn functionality
- **DEFAULT_ADMIN_ROLE**: Manages role assignments (granted to deployer)

### Security Features

- **Zero Value Protection**: Custom `nonZero` modifier prevents minting/burning zero tokens
- **Custom Errors**: Gas-efficient error handling with `ZeroValue()` error
- **Role Separation**: Minting and burning require separate roles for better security

## Architecture

```
CWToken (Upgradeable)
├── ERC20Upgradeable (OpenZeppelin)
├── AccessControlUpgradeable (OpenZeppelin)
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
- **Roles**: Role-based access control tests
- **Upgrade**: Proxy upgrade functionality tests

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

### Access Control

```solidity
bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
```

## Deployment

The project includes Hardhat Ignition modules for deployment:

```bash
npx hardhat ignition deploy ignition/modules/CWToken.ts --parameters '{"name": "CloudWalk Token", "symbol": "CWT"}'
```

## Upgrade Example

The `CWTokenV2` contract demonstrates upgrade functionality:

```solidity
contract CWTokenV2 is CWToken {
    string public version;

    function initializeV2() external reinitializer(2) {
        version = "v2";
    }
}
```

## Technology Stack

- **Solidity**: 0.8.30
- **Hardhat**: Development environment
- **OpenZeppelin**: Upgradeable contracts and access control
- **TypeScript**: Type-safe testing
- **Ethers.js**: Ethereum library
- **Chai**: Assertion library
- **Solidity Coverage**: Test coverage analysis

## CI/CD

Automated workflows for:

- **Compile**: Contract compilation verification
- **Test**: Automated test execution
- **Coverage**: Test coverage reporting and artifact generation

## License

MIT License - see [LICENSE](LICENSE) file for details.
