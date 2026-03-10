import { apiRoutes } from "./api-routes";

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Vumail API",
    version: "1.0",
    description:
      "Vumail platform API (Mailcow + CalDAV + Nextcloud + Transactional Mail)",
  },
  servers: [{ url: "http://localhost:3000" }],
  paths: {} as Record<string, any>,
};

// Convert apiRoutes into OpenAPI paths
apiRoutes.forEach((route) => {
  if (!openApiSpec.paths[route.path]) openApiSpec.paths[route.path] = {};

  openApiSpec.paths[route.path][route.method.toLowerCase()] = {
    tags: [route.category],
    summary: route.description,
    requestBody:
      ["POST", "PUT"].includes(route.method) && route.exampleRequest
        ? {
            content: {
              "application/json": {
                example: route.exampleRequest,
              },
            },
            required: true,
          }
        : undefined,
    responses: {
      200: { description: "Success" },
      401: { description: "Unauthorized" },
      403: { description: "Forbidden" },
      404: { description: "Not Found" },
    },
    security: route.auth ? [{ bearerAuth: [] }] : [],
  };
});
