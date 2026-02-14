import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import TeaDetails from "@/pages/TeaDetails";
import MyList from "@/pages/MyList";
import AdminPage from "@/pages/Admin";
import DynamicPage from "@/pages/DynamicPage";
import AuthPage from "@/pages/Auth";
import { useEffect } from "react";
import type { SiteSettings } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tea/:id" component={TeaDetails} />
      <Route path="/list" component={MyList} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/page/:slug" component={DynamicPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function DynamicFavicon() {
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  useEffect(() => {
    if (!settings?.faviconUrl) return;
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.faviconUrl;
    link.type = settings.faviconUrl.endsWith(".ico") ? "image/x-icon" : "image/png";
  }, [settings?.faviconUrl]);

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <DynamicFavicon />
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
