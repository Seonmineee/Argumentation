import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DebatewithAI" },
      { name: "description", content: "Argument Architect is an AI-powered platform for high school students to enhance their argumentation skills through simulated debates." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "DebatewithAI" },
      { property: "og:description", content: "Argument Architect is an AI-powered platform for high school students to enhance their argumentation skills through simulated debates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "DebatewithAI" },
      { name: "twitter:description", content: "Argument Architect is an AI-powered platform for high school students to enhance their argumentation skills through simulated debates." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c7902300-71cf-4ca1-8278-14fb612103a6/id-preview-21d7ff4f--e52990ed-b053-4ef1-a059-0a55bfed6816.lovable.app-1777033804006.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c7902300-71cf-4ca1-8278-14fb612103a6/id-preview-21d7ff4f--e52990ed-b053-4ef1-a059-0a55bfed6816.lovable.app-1777033804006.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster richColors position="top-center" />
    </>
  );
}
