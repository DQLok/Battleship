import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Diamond,
  LayoutGrid,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

export { useLocation, useNavigate };

type SpacingProps = {
  p?: number;
  px?: number;
  py?: number;
  pt?: number;
  pb?: number;
  pl?: number;
  pr?: number;
  m?: number;
  mx?: number;
  my?: number;
  mt?: number;
  mb?: number;
  ml?: number;
  mr?: number;
};

const space = (n?: number) => (n == null ? undefined : `${n * 4}px`);

function spacingStyle(props: SpacingProps): CSSProperties {
  return {
    padding: space(props.p),
    paddingLeft: space(props.pl ?? props.px),
    paddingRight: space(props.pr ?? props.px),
    paddingTop: space(props.pt ?? props.py),
    paddingBottom: space(props.pb ?? props.py),
    margin: space(props.m),
    marginLeft: space(props.ml ?? props.mx),
    marginRight: space(props.mr ?? props.mx),
    marginTop: space(props.mt ?? props.my),
    marginBottom: space(props.mb ?? props.my),
  };
}

type BoxProps = HTMLAttributes<HTMLDivElement> &
  SpacingProps & {
    flex?: boolean;
    flexDirection?: CSSProperties["flexDirection"];
    alignItems?: CSSProperties["alignItems"];
    justifyContent?: CSSProperties["justifyContent"];
    textAlign?: CSSProperties["textAlign"];
  };

export const Box = ({
  className,
  style,
  children,
  flex,
  flexDirection,
  alignItems,
  justifyContent,
  textAlign,
  p,
  px,
  py,
  pt,
  pb,
  pl,
  pr,
  m,
  mx,
  my,
  mt,
  mb,
  ml,
  mr,
  ...rest
}: BoxProps) => (
  <div
    className={className}
    style={{
      display: flex ? "flex" : undefined,
      flexDirection,
      alignItems,
      justifyContent,
      textAlign,
      ...spacingStyle({ p, px, py, pt, pb, pl, pr, m, mx, my, mt, mb, ml, mr }),
      ...style,
    }}
    {...rest}
  >
    {children}
  </div>
);

type PageProps = HTMLAttributes<HTMLDivElement> & {
  hideScrollbar?: boolean;
};

export const Page = ({
  className = "",
  hideScrollbar,
  children,
  ...rest
}: PageProps) => (
  <div
    className={`zmp-page page-container ${hideScrollbar ? "no-scrollbar" : ""} ${className}`.trim()}
    {...rest}
  >
    {children}
  </div>
);

type HeaderProps = {
  title?: ReactNode;
  textColor?: string;
  backgroundColor?: string;
  showBackIcon?: boolean;
  onBackClick?: () => void;
};

export const Header = ({
  title,
  textColor = "#22d3ee",
  backgroundColor = "#061421",
  showBackIcon = true,
  onBackClick,
}: HeaderProps) => (
  <header
    className="zmp-header sticky top-0 z-40 flex items-center gap-2 px-4 py-3"
    style={{ color: textColor, backgroundColor }}
  >
    {showBackIcon && (
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center"
        onClick={onBackClick ?? (() => window.history.back())}
        aria-label="Back"
      >
        <ChevronLeft size={20} />
      </button>
    )}
    <div className="font-headline text-sm font-bold tracking-widest uppercase">
      {title}
    </div>
  </header>
);

const TEXT_SIZE: Record<string, string> = {
  xxSmall: "text-[10px]",
  xSmall: "text-xs",
  small: "text-sm",
  normal: "text-base",
  large: "text-lg",
  xLarge: "text-xl",
};

type TextProps = HTMLAttributes<HTMLSpanElement> & {
  size?: keyof typeof TEXT_SIZE | string;
  bold?: boolean;
};

const TextInner = ({
  className = "",
  size = "normal",
  bold,
  children,
  ...rest
}: TextProps) => (
  <span
    className={`${TEXT_SIZE[size] || ""} ${bold ? "font-bold" : ""} ${className}`.trim()}
    {...rest}
  >
    {children}
  </span>
);

const TextTitle = ({
  className = "",
  size = "large",
  children,
  ...rest
}: TextProps) => (
  <h2
    className={`${TEXT_SIZE[size] || "text-lg"} font-bold ${className}`.trim()}
    {...rest}
  >
    {children}
  </h2>
);

export const Text = Object.assign(TextInner, { Title: TextTitle });

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  icon?: ReactNode;
  suffixIcon?: ReactNode;
  type?: "button" | "submit" | "reset" | "danger" | "neutral";
};

export const Button = ({
  className = "",
  variant = "primary",
  size = "medium",
  fullWidth,
  icon,
  suffixIcon,
  type = "button",
  disabled,
  children,
  ...rest
}: ButtonProps) => {
  const htmlType = type === "submit" || type === "reset" ? type : "button";
  const visual =
    type === "danger"
      ? "bg-red-600 text-white"
      : type === "neutral"
        ? "bg-transparent"
        : variant === "secondary"
          ? "bg-transparent border border-cyan-500/40 text-cyan-400"
          : "bg-cyan-400 text-[#061421]";

  return (
    <button
      type={htmlType}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-sm ${
        fullWidth ? "w-full" : ""
      } ${size === "small" ? "px-3 py-2 text-xs" : "px-4 py-3"} ${visual} ${className}`.trim()}
      {...rest}
    >
      {icon}
      {children}
      {suffixIcon}
    </button>
  );
};

type AvatarProps = HTMLAttributes<HTMLImageElement> & {
  src?: string;
  size?: number;
};

export const Avatar = ({
  src,
  size = 40,
  className = "",
  style,
  ...rest
}: AvatarProps) => (
  <img
    src={src || "https://img.icons8.com/officel/80/000000/manager.png"}
    alt=""
    className={`rounded-sm object-cover ${className}`.trim()}
    style={{ width: size, height: size, ...style }}
    {...rest}
  />
);

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; style?: CSSProperties }>> = {
  "zi-group": Users,
  "zi-group-solid": Users,
  "zi-more-diamond-solid": Diamond,
  "zi-plus": Plus,
  "zi-delete": Trash2,
  "zi-warning-solid": AlertTriangle,
  "zi-check-circle": CheckCircle2,
  "zi-more-grid": LayoutGrid,
};

type IconProps = {
  icon?: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export const Icon = ({ icon = "", size = 18, className, style }: IconProps) => {
  const Cmp = ICONS[icon] || Users;
  return <Cmp size={size} className={className} style={style} />;
};

type SheetProps = {
  visible?: boolean;
  onClose?: () => void;
  children?: ReactNode;
  autoHeight?: boolean;
  mask?: boolean;
  handler?: boolean;
  swipeToClose?: boolean;
};

export const Sheet = ({
  visible,
  onClose,
  children,
  mask = true,
  handler,
}: SheetProps) => {
  if (!visible) return null;

  return (
    <>
      {mask && (
        <div
          className="fixed inset-0 z-[80] bg-black/60"
          onClick={onClose}
        />
      )}
      <div className="fixed bottom-0 left-0 right-0 z-[90] overflow-hidden rounded-t-2xl border-t border-cyan-900 bg-[#061421]">
        {handler && (
          <div className="mx-auto mt-2 h-1 w-10 rounded bg-slate-600" />
        )}
        {children}
      </div>
    </>
  );
};

type ModalAction = {
  text: string;
  close?: boolean;
  highLight?: boolean;
  onClick?: () => void;
};

type ModalProps = {
  visible?: boolean;
  onClose?: () => void;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ModalAction[];
  zIndex?: number;
};

export const Modal = ({
  visible,
  onClose,
  title,
  description,
  actions = [],
  zIndex = 1000,
}: ModalProps) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 px-6" style={{ zIndex }}>
      <div className="w-full max-w-sm border border-cyan-800 bg-[#061421] p-5 text-center text-white">
        {title && <h3 className="mb-2 text-xl font-black text-cyan-400">{title}</h3>}
        {description && <p className="mb-4 text-sm text-cyan-200">{description}</p>}
        <div className="flex flex-col gap-2">
          {actions.map((action) => (
            <button
              key={action.text}
              type="button"
              className={`w-full py-3 font-bold uppercase tracking-widest ${
                action.highLight
                  ? "bg-cyan-400 text-[#061421]"
                  : "border border-cyan-800 text-cyan-400"
              }`}
              onClick={() => {
                action.onClick?.();
                if (action.close) onClose?.();
              }}
            >
              {action.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

type TabProps = {
  label: string;
  className?: string;
  children?: ReactNode;
};

const Tab = ({ children }: TabProps) => <>{children}</>;

type TabsProps = {
  id?: string;
  children?: ReactNode;
};

const TabsInner = ({ children }: TabsProps) => {
  const tabs = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<TabProps>[];
  const [active, setActive] = useState(0);

  return (
    <div className="zmp-tabs zaui-tabs flex min-h-0 flex-1 flex-col">
      <div className="zmp-tabs-nav zaui-tabs-nav flex shrink-0">
        {tabs.map((tab, index) => (
          <button
            key={tab.props.label}
            type="button"
            className={`zmp-tabs-nav-item flex-1 py-3 ${
              index === active ? "zmp-tabs-nav-item-active zaui-tabs-nav-item-active" : ""
            }`}
            onClick={() => setActive(index)}
          >
            <span className="zmp-tabs-nav-item-text">{tab.props.label}</span>
          </button>
        ))}
      </div>
      <div className="zmp-tabs-content zaui-tabs-content min-h-0 flex-1 overflow-y-auto">
        <div className={`zmp-tabs-tabpane ${tabs[active]?.props.className || ""}`}>
          {tabs[active]}
        </div>
      </div>
    </div>
  );
};

export const Tabs = Object.assign(TabsInner, { Tab });

type BottomNavItemProps = {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
};

const BottomNavItem = ({ label, icon, onClick, active }: BottomNavItemProps) => (
  <button
    type="button"
    className={`zmp-bottom-navigation-item zaui-bottom-navigation-item flex flex-1 flex-col items-center gap-1 py-2 ${
      active ? "zmp-bottom-navigation-item-active zaui-bottom-navigation-item-active" : ""
    }`}
    onClick={onClick}
  >
    <span className="zmp-icon zaui-icon">{icon}</span>
    <span className="zmp-bottom-navigation-item-label zaui-bottom-navigation-item-label text-[10px] uppercase">
      {label}
    </span>
  </button>
);

type BottomNavigationProps = {
  fixed?: boolean;
  activeKey?: string;
  children?: ReactNode;
};

const BottomNavigationInner = ({
  activeKey,
  children,
}: BottomNavigationProps) => (
  <nav className="zmp-bottom-navigation zaui-bottom-navigation flex w-full shrink-0 border-t border-cyan-900/40">
    {React.Children.map(children, (child) => {
      if (!React.isValidElement<BottomNavItemProps>(child)) return child;
      return React.cloneElement(child, {
        active: String(child.key) === String(activeKey),
      });
    })}
  </nav>
);

export const BottomNavigation = Object.assign(BottomNavigationInner, {
  Item: BottomNavItem,
});

export const ImageViewer = () => null;

type SnackbarOptions = {
  text?: string;
  message?: string;
  type?: string;
};

type SnackbarContextValue = {
  openSnackbar: (options: SnackbarOptions) => void;
};

const SnackbarContext = createContext<SnackbarContextValue>({
  openSnackbar: () => undefined,
});

export const SnackbarProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<string | null>(null);

  const openSnackbar = useCallback((options: SnackbarOptions) => {
    setToast(options.text || options.message || "");
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const value = useMemo(() => ({ openSnackbar }), [openSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[200] -translate-x-1/2 rounded border border-cyan-700 bg-[#061421] px-4 py-2 text-xs font-bold uppercase tracking-widest text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.35)]">
          {toast}
        </div>
      )}
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => useContext(SnackbarContext);
