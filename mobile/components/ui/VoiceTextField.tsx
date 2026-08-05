import { useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { Mic, MicOff, Loader } from "lucide-react-native";
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from "expo-audio";
import { transcribeAudio } from "../../services/triage.service";

interface VoiceTextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
}

export function VoiceTextField({
  label,
  error,
  value,
  onChangeText,
  multiline = false,
  placeholder,
  ...props
}: VoiceTextFieldProps) {
  const [isListening, setIsListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  async function startRec() {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsListening(true);
    } catch (e) {
      console.warn("startRec failed", e);
    }
  }

  async function stopRec() {
    setIsListening(false);
    setBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const text = await transcribeAudio(uri);
        if (text) onChangeText(value ? `${value} ${text}`.trim() : text);
      }
    } catch (e) {
      console.warn("transcribe failed", e);
    } finally {
      setBusy(false);
    }
  }

  function toggleVoice() {
    if (busy) return;
    if (isListening) stopRec();
    else startRec();
  }

  return (
    <View className="w-full">
      <View className="mb-1.5 flex-row items-center justify-between">
        {label ? <Text className="text-sm font-medium text-slate-700">{label}</Text> : <View />}
        {isListening ? (
          <Text className="text-xs font-semibold text-purple-600">🎙️ Listening… tap mic to stop</Text>
        ) : busy ? (
          <Text className="text-xs font-semibold text-purple-500">Transcribing…</Text>
        ) : null}
      </View>

      <View className="relative flex-row items-center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#a78bfa"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          editable={!busy}
          className={`w-full rounded-xl border bg-white px-4 py-3.5 pr-12 text-base text-slate-900 ${
            isListening ? "border-purple-500 bg-purple-50/50" : error ? "border-red-400" : "border-purple-200/80"
          } ${multiline ? "min-h-[80px] align-top" : ""}`}
          {...props}
        />

        <Pressable
          onPress={toggleVoice}
          className={`absolute right-2.5 ${multiline ? "top-3" : "top-2.5"} rounded-lg p-2 ${
            isListening ? "bg-purple-600" : "bg-purple-100/70"
          }`}
        >
          {busy ? <Loader size={18} color="#7c3aed" /> : isListening ? <MicOff size={18} color="#ffffff" /> : <Mic size={18} color="#7c3aed" />}
        </Pressable>
      </View>

      {error ? <Text className="mt-1 text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
