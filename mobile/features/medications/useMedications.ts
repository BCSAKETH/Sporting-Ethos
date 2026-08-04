import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ActiveMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
}

const STORAGE_KEY = "@ethos_active_medications";

const DEFAULT_MEDICATIONS: ActiveMedication[] = [
  {
    id: "med-1",
    name: "Multivitamin",
    dosage: "1 Tablet",
    frequency: "Daily in the morning",
    startDate: "2026-01-01",
  },
  {
    id: "med-2",
    name: "Omega 3 Fish Oil",
    dosage: "1000 mg",
    frequency: "Daily after dinner",
    startDate: "2026-02-15",
  },
];

export function useActiveMedications() {
  const [medications, setMedications] = useState<ActiveMedication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedications();
  }, []);

  async function loadMedications() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setMedications(JSON.parse(stored));
      } else {
        setMedications(DEFAULT_MEDICATIONS);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MEDICATIONS));
      }
    } catch {
      setMedications(DEFAULT_MEDICATIONS);
    } finally {
      setLoading(false);
    }
  }

  async function addMedication(name: string, dosage: string, frequency: string) {
    const newMed: ActiveMedication = {
      id: `med-${Date.now()}`,
      name: name.trim(),
      dosage: dosage.trim() || "As prescribed",
      frequency: frequency.trim() || "Daily",
      startDate: new Date().toISOString().slice(0, 10),
    };
    const updated = [newMed, ...medications];
    setMedications(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  async function removeMedication(id: string) {
    const updated = medications.filter((m) => m.id !== id);
    setMedications(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return { medications, loading, addMedication, removeMedication, refresh: loadMedications };
}
