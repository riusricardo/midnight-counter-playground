// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import {
  Contract as ContractType,
  Ledger,
  CredentialSubject,
  Witnesses
} from "./managed/counter/contract/index.cjs";

import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

// Declare console and TextDecoder for browser environment
declare const console: {
  log: (..._data: any[]) => void;
};
declare const TextDecoder: {
  new (encoding?: string): {
    decode(_input?: Uint8Array): string;
  };
};

export type Contract<T, W extends Witnesses<T> = Witnesses<T>> = ContractType<
  T,
  W
>;

// This is how we type an empty object.
export type CounterPrivateState = {
  value: number;
  readonly CredentialSubject?: CredentialSubject;
};

export function createCounterPrivateState(): CounterPrivateState {
  return {
    value: 0,
    CredentialSubject: {
      id: new Uint8Array(32).fill(0),
      first_name: new Uint8Array(32).fill(0),
      last_name: new Uint8Array(32).fill(0),
      birth_timestamp: 0n
    }
  };
}

export const witnesses = {
  get_identity: ({
    privateState
  }: WitnessContext<Ledger, CounterPrivateState>): [
    CounterPrivateState,
    CredentialSubject
  ] => {
    // Log private state for debugging
    console.log("=== get_identity witness called ===");
    console.log("Private state:", privateState);

    if (privateState.CredentialSubject) {
      const credential = privateState.CredentialSubject;
      console.log("CredentialSubject found:");
      console.log("  ID (as array):", Array.from(credential.id));
      console.log(
        "  ID (as hex):",
        Array.from(credential.id)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      );
      console.log(
        "  ID (non-zero bytes):",
        Array.from(credential.id).filter((b) => b !== 0)
      );

      console.log(
        "  First name (as array):",
        Array.from(credential.first_name)
      );
      const firstNameString = new TextDecoder()
        .decode(credential.first_name)
        .replace(/\0/g, "");
      console.log("  First name (as string):", `"${firstNameString}"`);
      console.log(
        "  First name (non-zero bytes):",
        Array.from(credential.first_name).filter((b) => b !== 0)
      );

      console.log("  Last name (as array):", Array.from(credential.last_name));
      const lastNameString = new TextDecoder()
        .decode(credential.last_name)
        .replace(/\0/g, "");
      console.log("  Last name (as string):", `"${lastNameString}"`);
      console.log(
        "  Last name (non-zero bytes):",
        Array.from(credential.last_name).filter((b) => b !== 0)
      );

      console.log("  Birth timestamp:", credential.birth_timestamp.toString());
      console.log(
        "  Birth timestamp (as number):",
        Number(credential.birth_timestamp)
      );
      console.log(
        "  Birth timestamp (as date):",
        new Date(Number(credential.birth_timestamp)).toISOString()
      );

      // Check if any field is empty/default
      const isIdEmpty = Array.from(credential.id).every((b) => b === 0);
      const isFirstNameEmpty = Array.from(credential.first_name).every(
        (b) => b === 0
      );
      const isLastNameEmpty = Array.from(credential.last_name).every(
        (b) => b === 0
      );
      const isBirthTimestampEmpty = credential.birth_timestamp === 0n;

      console.log("  Validation checks:");
      console.log("    ID is empty (all zeros):", isIdEmpty);
      console.log("    First name is empty (all zeros):", isFirstNameEmpty);
      console.log("    Last name is empty (all zeros):", isLastNameEmpty);
      console.log("    Birth timestamp is zero:", isBirthTimestampEmpty);

      return [privateState, privateState.CredentialSubject];
    } else {
      console.log("No CredentialSubject found in private state");
      throw new Error("No identity found");
    }
  },
  get_current_time: ({
    privateState
  }: WitnessContext<any, CounterPrivateState>): [
    CounterPrivateState,
    bigint
  ] => {
    const currentTime = BigInt(Date.now());
    console.log("=== get_current_time witness called ===");
    console.log("Current time (ms):", currentTime.toString());
    console.log(
      "Current time (date):",
      new Date(Number(currentTime)).toISOString()
    );

    return [privateState, currentTime];
  }
};
