import type { CSSProperties } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  LayoutDashboard, CalendarDays, CalendarCheck, Calendar, CalendarRange,
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
  ChevronDown, ChevronUp,
  Heart, Dna, FlaskConical,
  LogOut, PenTool, Bandage, Lightbulb,
  Briefcase, GraduationCap, Church,
  Sun, Moon, Laptop, ListChecks, Home,
  Eraser, Type, MoveUpRight
} from "lucide-react";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

// lucide-react no trae un ícono de diente dedicado — SVG propio, mismo estilo
// de trazo (24x24, stroke actual, extremos redondeados) que el resto del set.
function ToothIcon({ size = 24, strokeWidth = 1.75, className, style, ...props }: LucideProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style} {...props}
    >
      <path d="M12 3.2c-1.9 0-2.9.9-4.4.9C5.9 4.1 4.2 3.5 4.2 6c0 2.6.8 4.6 1.3 7.1.4 2 .8 5.5 2.4 5.5 1.7 0 1.5-4.1 2.5-4.7.4-.25 1-.25 1.4 0 1 .6.8 4.7 2.5 4.7 1.6 0 2-3.5 2.4-5.5.5-2.5 1.3-4.5 1.3-7.1 0-2.5-1.7-1.9-3.4-1.9-1.5 0-2.5-.9-4.4-.9Z" />
    </svg>
  );
}

const ICONS: Record<string, LucideIcon> = {
  // Navegación
  space_dashboard:      LayoutDashboard,
  home:                 Home,
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
  dentistry:            Stethoscope,

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
  expand_more:          ChevronDown,
  expand_less:          ChevronUp,
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
  calendar_range:       CalendarRange,
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
  clinical_notes:       ClipboardList,
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
  work:                 Briefcase,
  school:               GraduationCap,
  church:               Church,

  // Consulta clínica (diagnóstico / presupuesto)
  pending:              Clock,
  verified:             BadgeCheck,
  receipt_long:         FileText,
  undo:                 RotateCcw,
  block:                XCircle,
  category:             Folder,
  edit_note:            Pencil,
  eraser:               Eraser,
  text_fields:          Type,
  arrow_diagonal:       MoveUpRight,

  // Tema / vistas de agenda
  light_mode:           Sun,
  dark_mode:            Moon,
  devices:              Laptop,
  schedule_view:        ListChecks,
};

// Iconos con SVG propio (no vienen de lucide-react) — mismo contrato de props.
const CUSTOM_ICONS: Record<string, (props: LucideProps) => React.JSX.Element> = {
  tooth: ToothIcon,
};

export function Icon({ name, size = 20, className = "", style }: IconProps) {
  const LucideIcon = ICONS[name] ?? CUSTOM_ICONS[name];

  if (!LucideIcon) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Icon] icon "${name}" not found in map`);
    }
    return <span className={className} style={{ width: size, height: size, display: "inline-block", ...style }} />;
  }

  return <LucideIcon size={size} className={className} style={style} strokeWidth={1.75} />;
}
