export const MonoClause = ({ children, label = "AMPARO NORMATIVO" }: { children: React.ReactNode; label?: string }) => (
  <div className="bg-surface-high rounded-md p-4">
    <div className="label-md mb-2">{label}</div>
    <p className="clause text-foreground/85">{children}</p>
  </div>
);

export const ClausePill = ({ children }: { children: React.ReactNode }) => (
  <span className="clause inline-block bg-surface-high text-foreground/80 px-2 py-1 rounded">
    {children}
  </span>
);
