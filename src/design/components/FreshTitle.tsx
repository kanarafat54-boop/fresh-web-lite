import FreshColors from "../theme/colors";

interface FreshTitleProps {
  children: React.ReactNode;
  color?: keyof typeof FreshColors;
}

export function FreshTitle({ children, color = "primary" }: FreshTitleProps) {
  return (
    <h2
      style={{
        color: FreshColors[color],
        fontWeight: 800,
        letterSpacing: "-0.02em",
        textShadow: `0 0 18px ${FreshColors[color]}55`,
      }}
    >
      {children}
    </h2>
  );
}
