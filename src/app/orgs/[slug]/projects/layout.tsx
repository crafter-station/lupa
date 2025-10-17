import Breadcrumbs from "./breadcrumbs";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto space-y-2">
      <Breadcrumbs />
      {children}
    </div>
  );
}
