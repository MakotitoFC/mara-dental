import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, CalendarDays, CalendarCheck, Calendar,
  User, UserPlus, UserX, UserSearch, UserCircle,
  Images, CreditCard, FileText, Settings,
  Stethoscope, Pill, FileHeart, Droplets,
  Search, Plus, PlusCircle, X, XCircle,
  Trash2, Save, Pencil, Download, Upload,
  CloudUpload, Paperclip, Link,
  ChevronLeft, ChevronRight, ArrowLeft, ArrowRight,
  CheckCircle, AlertTriangle, AlertCircle, Check, Minus,
  Bell, Clock, RotateCcw,
  IdCard, MessageSquare, MessageCircle, Mail, Phone,
  Folder, FolderOpen, File, StickyNote,
  ImageIcon, Camera, Activity, Microscope,
  Cake, ClipboardList, Info, Lock, Eye, EyeOff,
  Printer, Share2, MoreVertical, GripVertical,
  MapPin, ZoomIn, ZoomOut, RadioTower,
  PauseCircle, Hospital, BadgeCheck,
  Heart, Dna, FlaskConical,
  LogOut, PenTool, Bandage, Lightbulb
} from "lucide-react";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

const ICONS: Record<string, LucideIcon> = {
  // Navegación
  space_dashboard:      LayoutDashboard,
  calendar_month:       CalendarDays,
  person:               User,
  photo_library:        Images,
  payments:             CreditCard,
  article:              FileText,
  settings:             Settings,

  // Médico / clínico
  medical_services:     Hospital,
  stethoscope:          Stethoscope,
  medication:           Pill,
  medical_information:  FileHeart,
  bloodtype:            Droplets,
  biotech:              FlaskConical,
  sensors:              Activity,
  microscope:           Microscope,
  dna:                  Dna,
  healing:              Bandage,

  // Acciones
  search:               Search,
  add:                  Plus,
  add_circle:           PlusCircle,
  close:                X,
  delete:               Trash2,
  save:                 Save,
  edit:                 Pencil,
  draw:                 PenTool,
  download:             Download,
  upload:               Upload,
  cloud_upload:         CloudUpload,
  upload_file:          CloudUpload,
  attach_file:          Paperclip,
  link:                 Link,
  share:                Share2,
  print:                Printer,
  more_vert:            MoreVertical,
  drag_indicator:       GripVertical,

  // Navegación de flechas
  chevron_left:         ChevronLeft,
  chevron_right:        ChevronRight,
  arrow_back:           ArrowLeft,
  arrow_forward:        ArrowRight,

  // Estado / alertas
  check_circle:         CheckCircle,
  check:                Check,
  remove:               Minus,
  cancel:               XCircle,
  warning:              AlertTriangle,
  warning_amber:        AlertTriangle,
  priority_high:        AlertCircle,
  notifications:        Bell,
  notification:         Bell,
  radio_button_checked: RadioTower,
  pause_circle:         PauseCircle,
  badge:                BadgeCheck,

  // Tiempo
  schedule:             Clock,
  today:                CalendarCheck,
  calendar_today:       CalendarDays,
  event:                Calendar,
  event_available:      CalendarCheck,
  event_upcoming:       CalendarDays,
  history:              RotateCcw,

  // Personas
  person_add:           UserPlus,
  person_off:           UserX,
  person_search:        UserSearch,
  portrait:             UserCircle,

  // Comunicación
  chat:                 MessageSquare,
  chat_bubble_outline:  MessageCircle,
  email:                Mail,
  phone:                Phone,

  // Archivos / carpetas
  folder:               Folder,
  folder_open:          FolderOpen,
  description:          File,
  sticky_note_2:        StickyNote,
  notes:                StickyNote,

  // Imágenes
  image:                ImageIcon,
  photo_camera:         Camera,
  panorama:             ImageIcon,
  photo_library_alt:    Images,

  // Misc
  cake:                 Cake,
  contact_page:         ClipboardList,
  assignment:           ClipboardList,
  tips_and_updates:     Lightbulb,
  contact_emergency:    IdCard,
  badge_id:             IdCard,
  info:                 Info,
  lock:                 Lock,
  eye:                  Eye,
  eye_off:              EyeOff,
  zoom_in:              ZoomIn,
  zoom_out:             ZoomOut,
  pin_drop:             MapPin,
  location_on:          MapPin,
  heart:                Heart,
  logout:               LogOut,
};

export function Icon({ name, size = 20, className = "", style }: IconProps) {
  const LucideIcon = ICONS[name];

  if (!LucideIcon) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Icon] icon "${name}" not found in map`);
    }
    return <span className={className} style={{ width: size, height: size, display: "inline-block", ...style }} />;
  }

  return <LucideIcon size={size} className={className} style={style} strokeWidth={1.75} />;
}
