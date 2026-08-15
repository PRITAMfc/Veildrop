import type {
  PrivateStateProvider,
  PrivateStateId,
} from '@midnight-ntwrk/midnight-js-types';

/**
 * A private state provider backed by an in-memory Map. Privacy-safe for VeilDrop
 * because the private state only contains the reporter secret and the credential
 * secret, which the app persists separately in localStorage and re-creates on
 * every session.
 */
export function inMemoryPrivateStateProvider<
  PSI extends PrivateStateId = PrivateStateId,
  PS = unknown,
>(): PrivateStateProvider<PSI, PS> {
  let contractAddress: string | undefined;
  const states = new Map<PSI, PS>();

  return {
    setContractAddress(address: string): void {
      contractAddress = address;
    },
    async get(id: PSI): Promise<PS | null> {
      return states.get(id) ?? null;
    },
    async set(id: PSI, state: PS): Promise<void> {
      states.set(id, state);
    },
    async remove(id: PSI): Promise<void> {
      states.delete(id);
    },
    async clear(): Promise<void> {
      states.clear();
    },
    async setSigningKey(): Promise<void> {
      // VeilDrop does not rely on contract signing keys in the browser.
    },
    async getSigningKey(): Promise<null> {
      return null;
    },
    async removeSigningKey(): Promise<void> {},
    async clearSigningKeys(): Promise<void> {},
    async exportPrivateStates(): Promise<never> {
      throw new Error('VeilDrop does not support private state export.');
    },
    async importPrivateStates(): Promise<never> {
      throw new Error('VeilDrop does not support private state import.');
    },
    async exportSigningKeys(): Promise<never> {
      throw new Error('VeilDrop does not support signing key export.');
    },
    async importSigningKeys(): Promise<never> {
      throw new Error('VeilDrop does not support signing key import.');
    },
  };
}
