# Midnight App Monorepo

This project is a monorepo containing several packages and applications related to the Midnight blockchain ecosystem. It is organized to support both development and usage of Midnight-based tools and applications.

## Structure

- **UI** (`apps/web`):
  - A modern web user interface for interacting with the Midnight blockchain and related services.
- **CLI** (`packages/counter-cli`):
  - A command-line interface for advanced users and developers to interact with the Midnight blockchain, run scripts, and manage nodes or contracts.
- **Counter API** (`packages/counter-api`):
  - Provides core API logic and utilities for the project.
- **Counter Contract** (`packages/counter-contract`):
  - Contains smart contract code and related logic.
- **Other Packages**:
  - Additional shared utilities, configuration, and libraries to support the above applications.

## Getting Started

1. **Install dependencies:**
   ```bash
   yarn install
   ```
2. **Build the project:**
   ```bash
   yarn build
   ```
3. **Build the contract:**
   ```bash
   yarn compact
   ```
4. **Start the project (UI):**
   ```bash
   yarn start
   ```
5. **Run the CLI (remote testnet):**
   ```bash
   yarn counter-cli-remote
   ```
6. **Run the CLI with proof server:**
   ```bash
   yarn counter-cli-remote-ps
   ```

## Contributing

Contributions are welcome! Please open issues or pull requests as needed.

---

For more details, see the README files in each package or app directory.
