Below is an updated **Product Requirements Document (PRD)** tailored to your specific tech stack (**Next.js, TypeScript, Tailwind CSS, Supabase, ShadCN**), and reflecting the additional features requested (e.g., **Form Templates**, **Event Place Booking**, no double bookings, and advanced event calendar details\*\*).

---

## 1. Introduction

### 1.1 Product Overview

The **Dynamic Form Management & Event Booking Application** is designed for multiple educational institutions to organize events and manage event places, build and share digital forms, and gather responses.

- **Tech Stack**:
  - **Next.js** (React framework for server-rendered or hybrid web applications)
  - **TypeScript** (for type safety and maintainability)
  - **Tailwind CSS** (utility-first CSS framework for rapid UI development)
  - **Supabase** (PostgreSQL database, authentication, and real-time capabilities)
  - **ShadCN** (UI components built using Radix UI primitives, styled with Tailwind)

### 1.2 Purpose of the Document

This PRD will outline the:

1. Vision and scope of the system
2. Roles and permissions model
3. Core features and workflows (form management, event/places booking, analytics)
4. Technical and non-functional requirements
5. Implementation roadmap

---

## 2. Vision & Objectives

1. **Centralized Event & Form Management**  
   Provide a single platform for multiple institutions to create and manage events, book event places, build forms, and analyze form responses.

2. **Avoid Double Booking**  
   Ensure the same place cannot be booked for overlapping time slots, providing real-time feedback or warnings.

3. **Flexible Form Creation**  
   A dynamic form builder with the ability to create re-usable **Form Templates**.

4. **Role-Based Access**  
   Enforce secure and intuitive user access based on roles (Super Admin, Administrator, Institution Coordinator, Event Coordinator, Staff, Students, Public).

5. **Scalable & User-Friendly**  
   Utilize Next.js, TypeScript, and Tailwind for a fast, modular, and maintainable web application.

---

## 3. Stakeholders & Roles

1. **Super Admin**

   - Has top-level privileges across all institutions.
   - Manages user roles, system configurations, place configurations, and global analytics.

2. **Administrator**

   - Similar to Super Admin but may be limited to certain higher-level tasks.
   - Manages user roles, institutions, form and event configurations.

3. **Institution Coordinator**

   - Oversees a specific institution’s events, places, forms, and user activities.

4. **Event Coordinator**

   - Creates and manages events, including booking places and creating forms related to their events.

5. **Staff**

   - Assists with event operations and data management at the institution level.

6. **Students**

   - May fill in private forms, view relevant events, but not manage.

7. **Public** (Default Role)
   - Authenticated through Google SSO automatically assigned to `public` role on first login.
   - Can access only public forms (no admin panel access).

---

## 4. Key Modules & Features

### 4.1 Authentication & Authorization

- **Google Single Sign-On (SSO)**

  - Users log in via their Google account.
  - On first login, a record is created in Supabase’s `profiles` table with default `public` role.

- **Role-Based Access Control (RBAC)**
  - **Super Admin** and **Administrator** can access all admin panels.
  - **Institution Coordinator**, **Event Coordinator**, **Staff** can access relevant admin pages, restricted to their assigned institution(s) and event(s).
  - **Students** and **Public** can only access public areas and forms that are public.
  - Implementation via Supabase Row-Level Security (RLS) or custom logic to ensure correct data isolation.

### 4.2 User Management Module

- **User Listing**

  - Display all users from Supabase in a table: email, name, role, last login, status, etc.
  - Search and pagination support.

- **Role & Permission Assignment**
  - Only **Super Admin** and **Administrator** can change user roles.
  - Changes reflect immediately in the user profile.

### 4.3 Organization Management Module

- **Institution Management**

  - Create/edit/delete institutions with relevant metadata (name).
  - Assign or remove **Institution Coordinator(s)**.

- **Department Management**
  - Create/edit/delete departments under each institution (e.g., Science, Arts, Technology).
  - Link department assignments to the relevant coordinator(s).

### 4.4 Event Management Module

- **Create and Manage Events**

  - Associate event with a specific institution and department.
  - Capture essential event details: title, description, date/time, assigned coordinator, etc.
  - **Place Booking**: A dropdown of available places, with date/time validation:
    - If the chosen place/date/time is already booked, the system prevents booking and shows a warning “Already booked.”
    - Store booking details (place ID, start time, end time, event ID).

- **Event Calendar**
  - Visual representation of events by month/week/day.
  - Color-code events by institution/department.
  - **Place Indicators**: On each event, show which place is booked to avoid confusion (e.g., “Auditorium,” “Hall A,” “Lab 1”).

### 4.5 Place Management & Booking Logic

- **Place Directory**

  - Super Admin or Administrator can create/edit/delete places (e.g., Auditorium, Hall A, Hall B).
  - Set capacity, location, description if needed.

- **Booking Validation**
  - When creating or editing an event:
    1. Check if the requested place is free at the specified time.
    2. If **occupied**, show a real-time message: “This place is already booked for [date/time range]. Please select a different time or place.”
  - Must handle partial overlaps (e.g., an event from 10:00 to 12:00 conflicts with any other event that occupies 10:30 to 11:30).

### 4.6 Form Creation Module

- **Dynamic Form Builder**

  - **Drag-and-Drop** or similar interface using ShadCN + Tailwind for a seamless UI.
  - Basic and advanced field types: text, number, email, dropdown, checkbox, radio, date/time, file upload, signatures, etc.
  - Field Validation rules (required, pattern, max length, etc.).
  - **Conditional Logic** (nice-to-have, can be a future phase).
  - **Status**: Draft, Published, Archived.
  - **Form Privacy**:
    - **Public**: Accessible to anyone with the link (including public role).
    - **Private**: Only users with roles above `public` can access.

- **Form Templates**

  - Pre-designed templates for common use cases (Registration Form, Feedback Form, Application Form, etc.).
  - Users can select a template, then modify fields as needed to speed up form creation.

- **Preview & Publish**
  - Preview mode to ensure the form looks correct before publishing.
  - Once published, generate a shareable URL for the form.

### 4.7 Response Management & Analytics

- **Response Overview**

  - Table view of each form’s submissions.
  - Export to CSV, Excel, PDF.

- **Detailed Response View**

  - Show all fields submitted by a user.
  - Respect privacy rules (private forms only visible to authorized roles).

- **Analytics Dashboards**
  - Real-time stats (total submissions, daily/weekly submission counts, etc.).
  - Visual charts (bar, pie, line) for quick data insights.
  - Filter by event, form type, date range, institution.

### 4.8 Event Calendar Enhancements

- **Consolidated Calendar**

  - One calendar that merges events from all institutions (visible to Super Admin, Admin).
  - Institution Coordinators see only their institution’s events.
  - Event Coordinators or Staff see only the events they manage.

- **Place Booking Indicators**
  - Next to each event, display the place or multiple places if multi-place support is considered.
  - Quick tooltip or popover with event details, booking times, capacity, etc.

### 4.9 Additional Integrations

- **ChatGPT (OpenAI) Integration**

  - Provide AI-driven suggestions for form fields, disclaimers, or instructions.
  - Potential automated generation of form templates based on minimal input.

- **Notifications (Email or In-App)**
  - Optional future phase: Email or push notifications to coordinators when events are booked or forms are submitted.

---

## 5. User Flows

### 5.1 Login & Role Assignment Flow

1. **User clicks “Sign in with Google.”**
2. **System** checks if user record exists in Supabase.
   - If new, create a row with role = `public`.
   - If existing, fetch current role.
3. **Navigation** depends on role:
   - **public** role sees only public forms or landing page.
   - **staff, coordinator, admin, super_admin** see admin dashboard as appropriate.

### 5.2 Create Institution, Department & Places

1. **Super Admin/Administrator** logs in, navigates to “Organization Management.”
2. Creates Institution → Adds relevant details.
3. Creates Department(s) under that Institution.
4. Creates Places (e.g., Auditorium, Hall A) in a “Place Management” section.

### 5.3 Create an Event & Book Place

1. **Event Coordinator** or **Institution Coordinator** chooses “Create Event.”
2. Fills out event details (title, date, start/end time, description).
3. Selects a place from dropdown.
   - **System** checks if place is free at the requested time.
   - If **booked**, user sees an “Already booked, choose another time/place” warning.
   - If **free**, booking is saved.
4. Event is published → automatically appears in the calendar with place details.

### 5.4 Build/Use Form Templates

1. **Coordinator** goes to “Form Creation.”
2. Chooses a **Template** (e.g., Registration Form).
3. Modifies fields as needed (change text, add new fields, remove unnecessary fields).
4. Saves & Publishes form → Generates shareable link.

### 5.5 Submit & Analyze Form

1. **User/Attendee** clicks form link (public or private).
2. Fills out all required fields → Submits.
3. **System** saves response to Supabase.
4. **Coordinator/Admin** checks “Response Management” to view submission data, apply filters, or export.
5. **Analytics** can be viewed in the form analytics dashboard (charts, stats).

---

## 6. Functional Requirements

| **Requirement**                     | **Description**                                                             | **Priority** | **Owner**          |
| ----------------------------------- | --------------------------------------------------------------------------- | ------------ | ------------------ |
| Google SSO                          | Integrate Google OAuth2 for user login.                                     | Must Have    | Dev Team           |
| Role-Based Access (RBAC)            | Control access to modules and data based on user roles.                     | Must Have    | Dev Team           |
| User Management                     | List users, update roles, and view user info.                               | Must Have    | Super Admin, Admin |
| Institution & Department Management | Create/edit/delete institutions and departments.                            | Must Have    | Super Admin, Admin |
| Place Management                    | Create/edit/delete places (e.g., halls, auditoriums).                       | Must Have    | Super Admin, Admin |
| Event Creation & Place Booking      | Create/edit events with place booking validations (no double bookings).     | Must Have    | Coordinator, Admin |
| Event Calendar (with place details) | View and manage events in a calendar, show place info and prevent overlaps. | Must Have    | Coordinator, Admin |
| Dynamic Form Builder                | Create forms with various field types, validations, and statuses.           | Must Have    | Coordinator, Admin |
| Form Templates                      | Provide pre-built form structures to speed up creation.                     | Must Have    | Coordinator, Admin |
| Response Management & Analytics     | View, filter, and export form submissions; display charts/graphs.           | Must Have    | Coordinator, Admin |
| ChatGPT Integration (Nice to Have)  | AI-based suggestions for form text, disclaimers, or instructions.           | Nice to Have | Dev Team           |
| Notifications (Optional)            | Email or in-app notifications for new submissions, bookings, etc.           | Nice to Have | Coordinator, Admin |

---

## 7. Non-Functional Requirements

1. **Performance**

   - Pages should load within 2-3 seconds on standard network connections.
   - Bookings and form submissions should be handled in real time.

2. **Scalability**

   - The system should handle increasing numbers of institutions, events, places, and form submissions without significant performance degradation.

3. **Security**

   - All traffic must be via **HTTPS**.
   - Adhere to OWASP best practices (prevent XSS, CSRF, SQL injection).
   - Implement Supabase row-level security or custom logic for restricting data access based on roles.

4. **Data Privacy & Compliance**

   - Comply with GDPR (or local equivalents) if applicable.
   - Provide user consent notices for data collection.

5. **Reliability & Availability**

   - Aim for >99.9% uptime.
   - Backups for critical data in Supabase.

6. **Maintainability**

   - TypeScript for type safety.
   - Modular structure in Next.js for ease of testing and scaling.
   - Well-documented code and database schemas.

7. **Usability**
   - ShadCN UI for consistent, accessible components.
   - Tailwind for rapid styling and design consistency.

---

## 8. Technical Stack & Architecture

1. **Frontend**

   - **Next.js** (App Router or Pages Router) with **TypeScript**.
   - **Tailwind CSS** for utility-first styling.
   - **ShadCN** UI components (Radix-based) for consistent, accessible components.

2. **Backend & API**

   - Next.js **API routes** or serverless functions for custom logic (e.g., booking validation, form submission processing).
   - Optionally, advanced business logic in a microservices approach if needed.

3. **Database & Authentication**

   - **Supabase** for user authentication (Google OAuth2) and database (PostgreSQL).
   - Real-time capabilities for immediate event/booking status updates.

4. **Hosting & Deployment**

   - **Vercel** or **AWS** for hosting Next.js.
   - Supabase for managed PostgreSQL, authentication, and edge functions.

5. **CI/CD Pipeline**

   - GitHub Actions or GitLab CI for build, test, and deploy.

6. **ChatGPT Integration**
   - Call OpenAI API from Next.js API routes (store API keys securely in environment variables).

---

## 9. Implementation Roadmap & Milestones

1. **Phase 1: Foundations**

   - Set up Next.js + TypeScript + Tailwind + ShadCN.
   - Google SSO with Supabase user profiles.
   - Basic RBAC (public vs. staff vs. admin).

2. **Phase 2: Organization & Place Management**

   - Institution, Department creation.
   - Place management (create/edit/delete).

3. **Phase 3: Event Management & Booking**

   - Event creation with place booking validations.
   - Prevent double bookings.
   - Calendar view with place details.

4. **Phase 4: Form Builder & Form Templates**

   - Drag-and-drop form creation.
   - Form templates for quick setup.
   - Public/Private form links.

5. **Phase 5: Response Management & Analytics**

   - View, filter, export form responses.
   - Basic analytics dashboards (pie/bar/line charts).

6. **Phase 6: ChatGPT Integration & Notifications**

   - AI-driven suggestions for form fields.
   - (Optional) Email or in-app notifications for event or submission updates.

7. **Phase 7: Refinements & QA**
   - Security audits (OWASP checks).
   - Performance tests (load testing).
   - UI/UX improvements and final QA sign-off.

---

## 10. Testing & Quality Assurance

1. **Unit Testing**

   - For form builder logic, booking overlap checks, and role-based data access.

2. **Integration Testing**

   - Google SSO flow, event creation with place booking in Supabase, form submission pipeline.

3. **End-to-End (E2E) Testing**

   - Tools like Cypress or Playwright to test entire flows:
     - User logs in → Creates event → Books place → Publishes form → Fills form → Views analytics.

4. **Performance Testing**
   - Ensure system can handle spikes in form submissions or multiple event bookings concurrently.

---

## 11. Acceptance Criteria

1. **No Double Booking**

   - The system must prevent place collisions (partial or full overlap).
   - If a place is already booked for a time slot, a clear error or warning is displayed.

2. **Accurate RBAC**

   - Public role cannot access admin panel.
   - Staff, Coordinators, Admins see only the institutions/events/forms they are authorized to manage.

3. **Form Creation & Templates**

   - A coordinator can create a form from scratch or choose a template.
   - Successfully preview, publish, and share a link.

4. **Form Response**

   - Submissions are stored in Supabase without data loss.
   - Users with appropriate roles can view and export responses.

5. **Calendar & Event Display**

   - All relevant events appear in the calendar with correct place names and times.

6. **Analytics**

   - Basic charts exist for each form’s response data.
   - Filters (date range, institution, event) work as expected.

7. **Security & Performance**
   - SSL enforced.
   - Minimal page load times and real-time updates for new events or form responses.

---

## 12. Additional Suggestions

1. **Multi-Language Support**

   - Future feature to localize the UI and forms for multilingual institutions.

2. **Advanced Scheduling**

   - If an event spans multiple days or multiple time segments, handle multi-day or recurring bookings.

3. **Payment Integration (Optional)**

   - If certain events require paid bookings, integrate Stripe or PayPal.

4. **Reporting & Audit Logs**

   - Keep detailed logs of role changes, event creation, and place bookings for compliance.

5. **Custom Branding**
   - Let institutions customize form appearance (logo, color scheme).

---

### Conclusion

With this **Updated PRD**, you have:

- A clear vision of how to integrate **event booking** (with place and time slot management),
- A robust **dynamic form builder** (including **templates**),
- A strong **role-based** structure and **Google SSO** via **Supabase**,
- A consistent and modern UI approach using **Next.js, TypeScript, Tailwind, and ShadCN**.

Following this plan ensures you deliver a highly usable, secure, and scalable application for your educational institutions.
