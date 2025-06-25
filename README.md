# Midnight Counter App Monorepo

Welcome to the Midnight Counter App Monorepo! This project brings together several packages and applications designed for seamless interaction with the Midnight blockchain ecosystem.

## About the App

This application interacts with a simple counter smart contract deployed on the Midnight blockchain. The contract maintains a single value that can be read or incremented. You can view the current counter value and increment it directly through the web UI. Additionally, all contract interactions can be signed securely using the Midnight Lace wallet, providing a smooth and user-friendly experience.

## Structure

- **UI** (`apps/web`):
  - A web application that allows users to interact with the counter smart contract on the Midnight blockchain. Users can view and increment the counter value through an interface. The UI also integrates with the Midnight Lace wallet, enabling secure signing and management of blockchain transactions directly from the browser.
- **CLI** (`packages/counter-cli`):
  - A command-line tool for developers and advanced users. It provides direct access to contract functions, testing utilities, and blockchain operations. The CLI is ideal for scripting, automation, and debugging contract interactions without a graphical interface.
- **Counter API** (`packages/counter-api`):
  - The core backend logic and utility layer for the project. It exposes functions for interacting with the counter contract, handles business logic, and provides reusable modules for both the UI and CLI. This package ensures consistency and code reuse across the monorepo.
- **Counter Contract** (`packages/counter-contract`):
  - Contains the smart contract source code written for the Midnight blockchain. This package also includes unit tests and simulation scripts to verify contract behavior and correctness before deployment.
- **Other Packages**:
  - Shared utilities, configuration files, and libraries that support the main applications. These may include linting rules, TypeScript configurations, and reusable UI or backend components to streamline development across the monorepo.

## Getting Started

**Install dependencies:**

```bash
yarn install
```

**Build the project:**

```bash
yarn build
```

**Start the project (UI):**

```bash
yarn start
```

**Run the CLI without starting proof server:**

```bash
yarn counter-cli-remote
```

**Run the CLI with proof server:**

```bash
yarn counter-cli-remote-ps
```

## The Counter Contract

The [counter-contract](packages/counter-contract) subdirectory contains:

- the [smart contract](packages/counter-contract/src/counter.compact)
- some [unit tests](packages/counter-contract/src/test/counter.test.ts) to test the smart contract

### The Source Code

The contract contains a declaration of state stored publicly on the blockchain:

```compact
export ledger round: Counter;
```

and a single transition function to change the state:

```compact
export circuit increment(): [] {
  round.increment(1);
}
```

To verify that the smart contract operates as expected,
we've provided some unit tests in `packages/counter-contract/src/test/counter.test.ts`.

We've also provided tests that use a simple simulator, which illustrates
how to initialize and call the smart contract code locally without running a node in `packages/counter-contract/src/test/counter-simulator.ts`

### Building the Smart Contract

Compile the contract:

```bash
yarn compact
```

You should see the following output from npm and the Compact compiler:

```bash
> compact
> compactc --skip-zk packages/counter-contract/src/counter.compact packages/counter-contract/src/managed/counter

Compactc version: 0.24.0
```

The compiler will complete very quickly because we've instructed it to skip ZK key generation with the option `--skip-zk`. The compiler's output files will be placed in the directory `packages/counter-contract/src/managed/counter`.

**Run contract's tests:**

```bash
yarn test-contract
```

Test Files 1 passed (1) - Tests 3 passed (3)

## Contributing

Contributions are welcome! Please open issues or pull requests as needed.

---

For more details, see the README files in each package or app directory.
