import { html } from "hono/html";

interface Route {
  method: string;
  path: string;
  description: string;
  auth: boolean;
  admin: boolean;
  category: string;
  exampleRequest?: Record<string, any>;
}

interface ApiDocProps {
  title: string;
  version: string;
  routes: Route[];
}

export const ApiDoc = ({ title, version, routes }: ApiDocProps) => {
  const methodColors = {
    GET: "bg-blue-600",
    POST: "bg-green-600",
    PUT: "bg-amber-600",
    DELETE: "bg-red-600",
  };

  // Group by category
  const groupedRoutes = routes.reduce<Record<string, Route[]>>((acc, route) => {
    const key = route.category || "Uncategorized";
    if (!acc[key]) acc[key] = [];
    acc[key].push(route);
    return acc;
  }, {});

  return html`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title} - API Documentation</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-900 text-white font-sans">
        <div class="container mx-auto px-4 py-8 max-w-5xl">
          <header class="mb-8">
            <h1 class="text-3xl font-bold mb-2">${title}</h1>
            <div class="flex items-center">
              <span
                class="bg-purple-600 text-white text-xs px-2 py-1 rounded-md"
                >v${version}</span
              >
              <span class="ml-2 text-gray-300">Bun + Hono + MongoDB</span>
            </div>
          </header>

          <main>
            ${Object.entries(groupedRoutes).map(
              ([category, routes]) => html`
                <section class="mb-10">
                  <h2
                    class="text-xl font-semibold mb-4 border-b border-gray-700 pb-2"
                  >
                    ${category}
                  </h2>
                  <div class="space-y-4">
                    ${routes.map(
                      (route) => html`
                        <div class="bg-gray-800 p-4 rounded-md">
                          <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center space-x-2">
                              <span
                                class="inline-block px-2 py-1 rounded-md text-xs font-medium ${methodColors[
                                  route.method
                                ] || "bg-gray-600"}"
                              >
                                ${route.method}
                              </span>
                              <span class="font-mono text-gray-300"
                                >${route.path}</span
                              >
                            </div>
                            <button
                              class="bg-blue-500 text-white px-3 py-1 text-xs rounded-md hover:bg-blue-600 test-btn"
                              data-method="${route.method}"
                              data-path="${route.path}"
                            >
                              Test
                            </button>
                          </div>
                          <div class="text-gray-300 mb-2">
                            ${route.description}
                          </div>
                          ${route.exampleRequest
                            ? html`<pre
                                class="bg-gray-950 p-3 rounded-md overflow-auto"
                              ><code>${JSON.stringify(
                                route.exampleRequest,
                                null,
                                2,
                              )}</code></pre>`
                            : ""}
                          <div
                            class="response mt-2 text-sm text-green-400"
                          ></div>
                        </div>
                      `,
                    )}
                  </div>
                </section>
              `,
            )}
          </main>
        </div>

        <script>
          document.querySelectorAll(".test-btn").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const method = btn.dataset.method;
              const path = btn.dataset.path;
              const body = btn.dataset.body
                ? JSON.parse(btn.dataset.body)
                : null;
              const container = btn
                .closest("div.bg-gray-800")
                .querySelector(".response");

              try {
                const headers = {
                  "Content-Type": "application/json",
                  // Add auth token if needed
                  Authorization: "Bearer YOUR_JWT_TOKEN_HERE",
                };
                const res = await fetch(path, {
                  method,
                  headers,
                  body: body ? JSON.stringify(body) : undefined,
                });
                const data = await res.json();
                container.textContent = JSON.stringify(data, null, 2);
              } catch (err) {
                container.textContent = "Error: " + err.message;
              }
            });
          });
        </script>
      </body>
    </html>`;
};
