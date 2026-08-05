// Supabase session storage adapter for React Native.
//
// Expo SecureStore rejects values over ~2048 bytes, and a Supabase session
// (access + refresh JWT, user object) regularly exceeds that. The documented
// workaround (Supabase's Expo quickstart) is to encrypt the session with a
// random AES-256 key, keep the encrypted blob in AsyncStorage (unbounded
// size), and keep only the small encryption key itself in SecureStore.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as aesjs from "aes-js";
import "react-native-get-random-values";

export class LargeSecureStore {
  private async encrypt(key: string, value: string) {
    try {
      const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
      const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
      const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

      await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
      return aesjs.utils.hex.fromBytes(encryptedBytes);
    } catch (e) {
      console.warn("SecureStore encrypt failed:", e);
      return null;
    }
  }

  private async decrypt(key: string, value: string) {
    try {
      const encryptionKeyHex = await SecureStore.getItemAsync(key);
      if (!encryptionKeyHex) return null;

      const cipher = new aesjs.ModeOfOperation.ctr(
        aesjs.utils.hex.toBytes(encryptionKeyHex),
        new aesjs.Counter(1),
      );
      const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch (e) {
      console.warn("SecureStore decrypt failed:", e);
      return null;
    }
  }

  async getItem(key: string) {
    try {
      const encrypted = await AsyncStorage.getItem(key);
      if (!encrypted) return null;
      return await this.decrypt(key, encrypted);
    } catch (e) {
      console.warn("SecureStore getItem failed:", e);
      return null;
    }
  }

  async removeItem(key: string) {
    try {
      await AsyncStorage.removeItem(key);
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore cleanup errors */
    }
  }

  async setItem(key: string, value: string) {
    try {
      const encrypted = await this.encrypt(key, value);
      if (encrypted) {
        await AsyncStorage.setItem(key, encrypted);
      }
    } catch (e) {
      console.warn("SecureStore setItem failed:", e);
    }
  }
}
