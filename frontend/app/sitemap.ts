import type { MetadataRoute } from "next";

const BASE_URL = "https://www.baselinekits.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/quiz",
    "/kits",
    "/products",
    "/education",
    "/mission",
    "/contact",
    "/track",
    "/sizing",
    "/login",
    "/register",
    "/terms",
    "/privacy",
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/quiz" || route === "/kits" ? 0.8 : 0.5,
  }));
}
