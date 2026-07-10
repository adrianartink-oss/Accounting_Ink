import {
  Building2,
  CircleDollarSign,
  Feather,
  GraduationCap,
  Home,
  Landmark,
  Megaphone,
  Paperclip,
  Plane,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  Syringe,
  Tag,
  Ticket,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  Feather,
  Ticket,
  ShoppingBag,
  CircleDollarSign,
  Wallet,
  Syringe,
  Building2,
  ShieldCheck,
  Wrench,
  Plane,
  GraduationCap,
  Megaphone,
  Paperclip,
  Landmark,
  Receipt,
  Home,
  Tag,
}

export const ICON_NAMES = Object.keys(ICONS)

/** Rendert ein lucide-Icon anhand seines Namens (Fallback: Tag). */
export default function CategoryIcon({
  name,
  size = 20,
  color,
}: {
  name: string
  size?: number
  color?: string
}) {
  const Icon = ICONS[name] ?? Tag
  return <Icon size={size} color={color} />
}
