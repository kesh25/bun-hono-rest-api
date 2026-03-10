export const apiRoutes = [
  // ─────────────────────────────
  // Core & Docs
  // ─────────────────────────────
  {
    method: "GET",
    path: "/api/v1",
    description: "API documentation & health",
    auth: false,
    admin: false,
    category: "Core",
  },

  // ─────────────────────────────
  // Authentication & Users
  // ─────────────────────────────
  {
    method: "POST",
    path: "/api/v1/users",
    description: "Create a new user",
    auth: false,
    admin: false,
    category: "Auth",
    exampleRequest: {
      name: "John Doe",
      email: "john@example.com",
      password: "123456",
    },
  },
  {
    method: "POST",
    path: "/api/v1/users/login",
    description: "User login",
    auth: false,
    admin: false,
    category: "Auth",
    exampleRequest: { email: "john@example.com", password: "123456" },
  },
  {
    method: "POST",
    path: "/api/v1/users/logout",
    description: "User logout",
    auth: true,
    admin: false,
    category: "Auth",
  },
  {
    method: "GET",
    path: "/api/v1/users/profile",
    description: "Get authenticated user profile",
    auth: true,
    admin: false,
    category: "Auth",
  },
  {
    method: "PUT",
    path: "/api/v1/users/profile",
    description: "Update authenticated user profile",
    auth: true,
    admin: false,
    category: "Auth",
    exampleRequest: { name: "John Doe Updated" },
  },
  {
    method: "GET",
    path: "/api/v1/users",
    description: "List all users",
    auth: true,
    admin: true,
    category: "Auth",
  },
  {
    method: "GET",
    path: "/api/v1/users/:id",
    description: "Get user by ID",
    auth: true,
    admin: true,
    category: "Auth",
  },

  // ─────────────────────────────
  // Domains & Mailboxes
  // ─────────────────────────────
  {
    method: "POST",
    path: "/api/v1/domains",
    description: "Create a new mail domain",
    auth: true,
    admin: true,
    category: "Domains",
    exampleRequest: { domain: "example.com" },
  },
  {
    method: "GET",
    path: "/api/v1/domains",
    description: "List mail domains",
    auth: true,
    admin: true,
    category: "Domains",
  },
  {
    method: "GET",
    path: "/api/v1/domains/:domain",
    description: "Get domain details",
    auth: true,
    admin: true,
    category: "Domains",
  },
  {
    method: "POST",
    path: "/api/v1/domains/:domain/mailboxes",
    description: "Create mailbox under domain",
    auth: true,
    admin: true,
    category: "Domains",
    exampleRequest: { name: "support", password: "securePass123" },
  },
  {
    method: "GET",
    path: "/api/v1/domains/:domain/mailboxes",
    description: "List mailboxes for domain",
    auth: true,
    admin: true,
    category: "Domains",
  },

  // ─────────────────────────────
  // Mail (Inbox / IMAP / Threads)
  // ─────────────────────────────
  {
    method: "GET",
    path: "/api/v1/mail/folders",
    description: "List IMAP folders",
    auth: true,
    admin: false,
    category: "Mail",
  },
  {
    method: "GET",
    path: "/api/v1/mail/messages",
    description: "List messages (paginated)",
    auth: true,
    admin: false,
    category: "Mail",
  },
  {
    method: "GET",
    path: "/api/v1/mail/messages/:id",
    description: "Get single email message",
    auth: true,
    admin: false,
    category: "Mail",
  },
  {
    method: "GET",
    path: "/api/v1/mail/threads",
    description: "List email threads",
    auth: true,
    admin: false,
    category: "Mail",
  },
  {
    method: "GET",
    path: "/api/v1/mail/threads/:threadId",
    description: "Get thread with messages",
    auth: true,
    admin: false,
    category: "Mail",
  },

  // ─────────────────────────────
  // SMTP (User Sending)
  // ─────────────────────────────
  {
    method: "POST",
    path: "/api/v1/mail/send",
    description: "Send email via SMTP",
    auth: true,
    admin: false,
    category: "Mail",
    exampleRequest: {
      to: "recipient@example.com",
      subject: "Hello!",
      body: "Test email body",
    },
  },

  // ─────────────────────────────
  // Calendar (CalDAV)
  // ─────────────────────────────
  {
    method: "GET",
    path: "/api/v1/calendar",
    description: "List user calendars",
    auth: true,
    admin: false,
    category: "Calendar",
  },
  {
    method: "GET",
    path: "/api/v1/calendar/:calendarPath/events",
    description: "Get calendar events",
    auth: true,
    admin: false,
    category: "Calendar",
  },

  // ─────────────────────────────
  // Files & Attachments (Nextcloud)
  // ─────────────────────────────
  {
    method: "GET",
    path: "/api/v1/files",
    description: "List user files",
    auth: true,
    admin: false,
    category: "Files",
  },
  {
    method: "POST",
    path: "/api/v1/files/upload",
    description: "Upload file to storage",
    auth: true,
    admin: false,
    category: "Files",
    exampleRequest: { filename: "file.txt", content: "Base64EncodedString" },
  },
  {
    method: "DELETE",
    path: "/api/v1/files/:path",
    description: "Delete file from storage",
    auth: true,
    admin: false,
    category: "Files",
  },

  // ─────────────────────────────
  // Metrics & Logs
  // ─────────────────────────────
  {
    method: "GET",
    path: "/api/v1/metrics/domain/:domain",
    description: "Domain mail & storage metrics",
    auth: true,
    admin: true,
    category: "Metrics",
  },
  {
    method: "GET",
    path: "/api/v1/metrics/user",
    description: "User mailbox usage metrics",
    auth: true,
    admin: false,
    category: "Metrics",
  },

  // ─────────────────────────────
  // Notifications (SSE)
  // ─────────────────────────────
  {
    method: "GET",
    path: "/api/v1/notifications/stream",
    description: "Real-time notifications (SSE)",
    auth: true,
    admin: false,
    category: "Notifications",
  },

  // ─────────────────────────────
  // Transactional Email API
  // ─────────────────────────────
  {
    method: "POST",
    path: "/api/v1/transactional/send",
    description: "Send transactional email (API)",
    auth: true,
    admin: false,
    category: "Transactional Email",
    exampleRequest: {
      to: "user@example.com",
      subject: "Hello",
      body: "Test email",
    },
  },
  {
    method: "GET",
    path: "/api/v1/transactional/logs",
    description: "View transactional email logs",
    auth: true,
    admin: false,
    category: "Transactional Email",
  },

  // ─────────────────────────────
  // Marketing Email
  // ─────────────────────────────
  {
    method: "POST",
    path: "/api/v1/marketing/campaigns",
    description: "Create marketing email campaign",
    auth: true,
    admin: false,
    category: "Marketing Email",
    exampleRequest: {
      name: "Campaign 1",
      subject: "Promo",
      recipients: ["user@example.com"],
    },
  },
  {
    method: "GET",
    path: "/api/v1/marketing/campaigns",
    description: "List marketing campaigns",
    auth: true,
    admin: false,
    category: "Marketing Email",
  },
  {
    method: "GET",
    path: "/api/v1/marketing/campaigns/:id",
    description: "Get campaign details",
    auth: true,
    admin: false,
    category: "Marketing Email",
  },

  // ─────────────────────────────
  // Admin / System
  // ─────────────────────────────
  {
    method: "GET",
    path: "/api/v1/admin/health",
    description: "System health & status",
    auth: true,
    admin: true,
    category: "Admin",
  },
  {
    method: "GET",
    path: "/api/v1/admin/workers",
    description: "Background workers status",
    auth: true,
    admin: true,
    category: "Admin",
  },
];
