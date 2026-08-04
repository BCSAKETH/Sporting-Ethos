import {
  Activity,
  Baby,
  Bed,
  Bone,
  Brain,
  Building2,
  Droplet,
  Ear,
  Eye,
  Flame,
  FlaskConical,
  HeartPulse,
  Pill,
  Scan,
  Shield,
  Siren,
  Smile,
  Sparkles,
  Stethoscope,
  Syringe,
  Venus,
  Wind,
  type LucideIcon,
} from "lucide-react-native";

// Maps the `departments.icon` slug seeded in the database to a Lucide
// component. Unknown slugs fall back to a generic building icon rather than
// crashing — new departments can be added without a matching code change.
const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  "heart-pulse": HeartPulse,
  brain: Brain,
  bone: Bone,
  baby: Baby,
  venus: Venus,
  sparkles: Sparkles,
  eye: Eye,
  ear: Ear,
  smile: Smile,
  activity: Activity,
  droplet: Droplet,
  wind: Wind,
  "flask-conical": FlaskConical,
  bed: Bed,
  flame: Flame,
  shield: Shield,
  scan: Scan,
  pill: Pill,
  siren: Siren,
  syringe: Syringe,
};

export function iconForSlug(slug: string | null | undefined): LucideIcon {
  return (slug && ICONS[slug]) || Building2;
}
