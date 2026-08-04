// Mobile port of the brand mark — Minimal Ivory & Lavender theme.
import { Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
}

export default function Logo({ size = 34, showWordmark = true }: LogoProps) {
  return (
    <View className="flex-row items-center gap-2">
      <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <Rect width={40} height={40} rx={10} fill="#5B21B6" />
        <Path
          d="M11 24c3.5 3.2 14.5 3.2 18 0M13 16c2.5-2.4 11.5-2.4 14 0"
          stroke="#A78BFA"
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <Circle cx={20} cy={20} r={3.4} fill="#FAF8F5" />
      </Svg>
      {showWordmark ? (
        <View>
          <Text className="font-bold tracking-tight text-purple-950">Sporting Ethos</Text>
          <Text className="text-[10px] font-semibold uppercase tracking-widest text-purple-600">
            Performance · Health
          </Text>
        </View>
      ) : null}
    </View>
  );
}
