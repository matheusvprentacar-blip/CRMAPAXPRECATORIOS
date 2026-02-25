import { Icon, addCollection } from "@iconify/react";
import lucideIcons from "@iconify-json/lucide/icons.json";
import { createElement } from "react";
import type { JSX, SVGProps } from "react";

export type LucideProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
  absoluteStrokeWidth?: boolean;
};

export type LucideIcon = (props: LucideProps) => JSX.Element;

let lucideCollectionRegistered = false;

function ensureLucideCollection(): void {
  if (lucideCollectionRegistered) {
    return;
  }

  addCollection(lucideIcons);
  lucideCollectionRegistered = true;
}

function mergeClasses(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function createIcon(icon: string): LucideIcon {
  return function IconComponent({ className, size = 24, absoluteStrokeWidth, ...props }: LucideProps): JSX.Element {
    void absoluteStrokeWidth;
    ensureLucideCollection();
    return createElement(Icon as unknown as (props: Record<string, unknown>) => JSX.Element, {
      icon,
      width: size,
      height: size,
      className: mergeClasses("lucide app-icon", className),
      ...props,
    });
  };
}

const iconMap = {
  Activity: "lucide:activity",
  AlertCircle: "lucide:alert-circle",
  AlertTriangle: "lucide:alert-triangle",
  ArrowDown: "lucide:arrow-down",
  ArrowLeft: "lucide:arrow-left",
  ArrowRight: "lucide:arrow-right",
  ArrowRightLeft: "lucide:arrow-right-left",
  ArrowUp: "lucide:arrow-up",
  BadgePercent: "lucide:badge-percent",
  Banknote: "lucide:banknote",
  BarChart3: "lucide:bar-chart-3",
  Bell: "lucide:bell",
  BellAlert: "lucide:bell-ring",
  Briefcase: "lucide:briefcase",
  Building: "lucide:building",
  Building2: "lucide:building-2",
  Calculator: "lucide:calculator",
  Calendar: "lucide:calendar",
  CalendarClock: "lucide:calendar-clock",
  CalendarDays: "lucide:calendar-days",
  CalendarIcon: "lucide:calendar",
  Camera: "lucide:camera",
  Check: "lucide:check",
  CheckCircle: "lucide:check-circle",
  CheckCircle2: "lucide:check-circle-2",
  CheckSquare: "lucide:check-square",
  ChevronDown: "lucide:chevron-down",
  ChevronLeft: "lucide:chevron-left",
  ChevronRight: "lucide:chevron-right",
  ChevronUp: "lucide:chevron-up",
  ChevronsRight: "lucide:chevrons-right",
  Circle: "lucide:circle",
  CircleSlash: "lucide:circle-slash",
  ClipboardList: "lucide:clipboard-list",
  Clock: "lucide:clock",
  Clock3: "lucide:clock-3",
  DollarSign: "lucide:dollar-sign",
  Download: "lucide:download",
  Edit: "lucide:edit",
  Edit2: "lucide:edit-2",
  Edit3: "lucide:edit-3",
  ExternalLink: "lucide:external-link",
  Eye: "lucide:eye",
  File: "lucide:file",
  FileCheck: "lucide:file-check",
  FileJson: "lucide:file-json",
  FileSearch: "lucide:file-search",
  FileSpreadsheet: "lucide:file-spreadsheet",
  FileText: "lucide:file-text",
  FileType: "lucide:file-type",
  FileUp: "lucide:file-up",
  FileX: "lucide:file-x",
  Filter: "lucide:filter",
  Gauge: "lucide:gauge",
  Gavel: "lucide:gavel",
  GripHorizontal: "lucide:grip-horizontal",
  HelpCircle: "lucide:help-circle",
  History: "lucide:history",
  Image: "lucide:image",
  ImageIcon: "lucide:image",
  Info: "lucide:info",
  Kanban: "lucide:kanban",
  Landmark: "lucide:landmark",
  Layers: "lucide:layers",
  LayoutDashboard: "lucide:layout-dashboard",
  LayoutGrid: "lucide:layout-grid",
  List: "lucide:list",
  ListChecks: "lucide:list-checks",
  Loader2: "lucide:loader-2",
  Lock: "lucide:lock",
  LockOpen: "lucide:lock-open",
  LogOut: "lucide:log-out",
  Mail: "lucide:mail",
  MapPin: "lucide:map-pin",
  Maximize2: "lucide:maximize-2",
  Megaphone: "lucide:megaphone",
  Menu: "lucide:menu",
  MessageSquare: "lucide:message-square",
  Minimize2: "lucide:minimize-2",
  Minus: "lucide:minus",
  Moon: "lucide:moon",
  MoreHorizontal: "lucide:more-horizontal",
  MoreVertical: "lucide:more-vertical",
  Palette: "lucide:palette",
  Paperclip: "lucide:paperclip",
  Pencil: "lucide:pencil",
  Percent: "lucide:percent",
  Phone: "lucide:phone",
  PieChart: "lucide:pie-chart",
  PlayCircle: "lucide:play-circle",
  Plus: "lucide:plus",
  Printer: "lucide:printer",
  RefreshCcw: "lucide:refresh-ccw",
  RefreshCw: "lucide:refresh-cw",
  RotateCcw: "lucide:rotate-ccw",
  RotateCw: "lucide:rotate-cw",
  Save: "lucide:save",
  Scale: "lucide:scale",
  Scroll: "lucide:scroll",
  ScrollText: "lucide:scroll-text",
  Search: "lucide:search",
  Send: "lucide:send",
  Settings: "lucide:settings",
  Shield: "lucide:shield",
  ShieldAlert: "lucide:shield-alert",
  ShieldCheck: "lucide:shield-check",
  Shuffle: "lucide:shuffle",
  SlidersHorizontal: "lucide:sliders-horizontal",
  Sparkles: "lucide:sparkles",
  Star: "lucide:star",
  Sun: "lucide:sun",
  Table: "lucide:table",
  Trash2: "lucide:trash-2",
  TrendingDown: "lucide:trending-down",
  TrendingUp: "lucide:trending-up",
  Trophy: "lucide:trophy",
  Upload: "lucide:upload",
  User: "lucide:user",
  UserCheck: "lucide:user-check",
  UserCog: "lucide:user-cog",
  UserPlus: "lucide:user-plus",
  UserX: "lucide:user-x",
  Users: "lucide:users",
  Users2: "lucide:users-2",
  Wallet: "lucide:wallet",
  X: "lucide:x",
  XCircle: "lucide:x-circle",
} as const;

export const Activity = createIcon(iconMap.Activity);
export const AlertCircle = createIcon(iconMap.AlertCircle);
export const AlertTriangle = createIcon(iconMap.AlertTriangle);
export const ArrowDown = createIcon(iconMap.ArrowDown);
export const ArrowLeft = createIcon(iconMap.ArrowLeft);
export const ArrowRight = createIcon(iconMap.ArrowRight);
export const ArrowRightLeft = createIcon(iconMap.ArrowRightLeft);
export const ArrowUp = createIcon(iconMap.ArrowUp);
export const BadgePercent = createIcon(iconMap.BadgePercent);
export const Banknote = createIcon(iconMap.Banknote);
export const BarChart3 = createIcon(iconMap.BarChart3);
export const Bell = createIcon(iconMap.Bell);
export const BellAlert = createIcon(iconMap.BellAlert);
export const Briefcase = createIcon(iconMap.Briefcase);
export const Building = createIcon(iconMap.Building);
export const Building2 = createIcon(iconMap.Building2);
export const Calculator = createIcon(iconMap.Calculator);
export const Calendar = createIcon(iconMap.Calendar);
export const CalendarClock = createIcon(iconMap.CalendarClock);
export const CalendarDays = createIcon(iconMap.CalendarDays);
export const CalendarIcon = createIcon(iconMap.CalendarIcon);
export const Camera = createIcon(iconMap.Camera);
export const Check = createIcon(iconMap.Check);
export const CheckCircle = createIcon(iconMap.CheckCircle);
export const CheckCircle2 = createIcon(iconMap.CheckCircle2);
export const CheckSquare = createIcon(iconMap.CheckSquare);
export const ChevronDown = createIcon(iconMap.ChevronDown);
export const ChevronLeft = createIcon(iconMap.ChevronLeft);
export const ChevronRight = createIcon(iconMap.ChevronRight);
export const ChevronUp = createIcon(iconMap.ChevronUp);
export const ChevronsRight = createIcon(iconMap.ChevronsRight);
export const Circle = createIcon(iconMap.Circle);
export const CircleSlash = createIcon(iconMap.CircleSlash);
export const ClipboardList = createIcon(iconMap.ClipboardList);
export const Clock = createIcon(iconMap.Clock);
export const Clock3 = createIcon(iconMap.Clock3);
export const DollarSign = createIcon(iconMap.DollarSign);
export const Download = createIcon(iconMap.Download);
export const Edit = createIcon(iconMap.Edit);
export const Edit2 = createIcon(iconMap.Edit2);
export const Edit3 = createIcon(iconMap.Edit3);
export const ExternalLink = createIcon(iconMap.ExternalLink);
export const Eye = createIcon(iconMap.Eye);
export const File = createIcon(iconMap.File);
export const FileCheck = createIcon(iconMap.FileCheck);
export const FileJson = createIcon(iconMap.FileJson);
export const FileSearch = createIcon(iconMap.FileSearch);
export const FileSpreadsheet = createIcon(iconMap.FileSpreadsheet);
export const FileText = createIcon(iconMap.FileText);
export const FileType = createIcon(iconMap.FileType);
export const FileUp = createIcon(iconMap.FileUp);
export const FileX = createIcon(iconMap.FileX);
export const Filter = createIcon(iconMap.Filter);
export const Gauge = createIcon(iconMap.Gauge);
export const Gavel = createIcon(iconMap.Gavel);
export const GripHorizontal = createIcon(iconMap.GripHorizontal);
export const HelpCircle = createIcon(iconMap.HelpCircle);
export const History = createIcon(iconMap.History);
export const Image = createIcon(iconMap.Image);
export const ImageIcon = createIcon(iconMap.ImageIcon);
export const Info = createIcon(iconMap.Info);
export const Kanban = createIcon(iconMap.Kanban);
export const Landmark = createIcon(iconMap.Landmark);
export const Layers = createIcon(iconMap.Layers);
export const LayoutDashboard = createIcon(iconMap.LayoutDashboard);
export const LayoutGrid = createIcon(iconMap.LayoutGrid);
export const List = createIcon(iconMap.List);
export const ListChecks = createIcon(iconMap.ListChecks);
export const Loader2 = createIcon(iconMap.Loader2);
export const Lock = createIcon(iconMap.Lock);
export const LockOpen = createIcon(iconMap.LockOpen);
export const LogOut = createIcon(iconMap.LogOut);
export const Mail = createIcon(iconMap.Mail);
export const MapPin = createIcon(iconMap.MapPin);
export const Maximize2 = createIcon(iconMap.Maximize2);
export const Megaphone = createIcon(iconMap.Megaphone);
export const Menu = createIcon(iconMap.Menu);
export const MessageSquare = createIcon(iconMap.MessageSquare);
export const Minimize2 = createIcon(iconMap.Minimize2);
export const Minus = createIcon(iconMap.Minus);
export const Moon = createIcon(iconMap.Moon);
export const MoreHorizontal = createIcon(iconMap.MoreHorizontal);
export const MoreVertical = createIcon(iconMap.MoreVertical);
export const Palette = createIcon(iconMap.Palette);
export const Paperclip = createIcon(iconMap.Paperclip);
export const Pencil = createIcon(iconMap.Pencil);
export const Percent = createIcon(iconMap.Percent);
export const Phone = createIcon(iconMap.Phone);
export const PieChart = createIcon(iconMap.PieChart);
export const PlayCircle = createIcon(iconMap.PlayCircle);
export const Plus = createIcon(iconMap.Plus);
export const Printer = createIcon(iconMap.Printer);
export const RefreshCcw = createIcon(iconMap.RefreshCcw);
export const RefreshCw = createIcon(iconMap.RefreshCw);
export const RotateCcw = createIcon(iconMap.RotateCcw);
export const RotateCw = createIcon(iconMap.RotateCw);
export const Save = createIcon(iconMap.Save);
export const Scale = createIcon(iconMap.Scale);
export const Scroll = createIcon(iconMap.Scroll);
export const ScrollText = createIcon(iconMap.ScrollText);
export const Search = createIcon(iconMap.Search);
export const Send = createIcon(iconMap.Send);
export const Settings = createIcon(iconMap.Settings);
export const Shield = createIcon(iconMap.Shield);
export const ShieldAlert = createIcon(iconMap.ShieldAlert);
export const ShieldCheck = createIcon(iconMap.ShieldCheck);
export const Shuffle = createIcon(iconMap.Shuffle);
export const SlidersHorizontal = createIcon(iconMap.SlidersHorizontal);
export const Sparkles = createIcon(iconMap.Sparkles);
export const Star = createIcon(iconMap.Star);
export const Sun = createIcon(iconMap.Sun);
export const Table = createIcon(iconMap.Table);
export const Trash2 = createIcon(iconMap.Trash2);
export const TrendingDown = createIcon(iconMap.TrendingDown);
export const TrendingUp = createIcon(iconMap.TrendingUp);
export const Trophy = createIcon(iconMap.Trophy);
export const Upload = createIcon(iconMap.Upload);
export const User = createIcon(iconMap.User);
export const UserCheck = createIcon(iconMap.UserCheck);
export const UserCog = createIcon(iconMap.UserCog);
export const UserPlus = createIcon(iconMap.UserPlus);
export const UserX = createIcon(iconMap.UserX);
export const Users = createIcon(iconMap.Users);
export const Users2 = createIcon(iconMap.Users2);
export const Wallet = createIcon(iconMap.Wallet);
export const X = createIcon(iconMap.X);
export const XCircle = createIcon(iconMap.XCircle);
