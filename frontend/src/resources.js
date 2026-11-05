const P = ["Critical", "Major", "Minor", "Trivial"];
const PRIO = ["High", "Medium", "Low"];
const f = (k, l, t = "text", o) => ({ k, l, t, o });
const fk = (k, l, r, lab = "name") => ({ k, l, t: "fk", r, lab });

export const RES = {
  projects: {
    title: "Projects",
    desc: "Create and manage projects across your organization",
    cols: ["name", "status", "created_by_user", "pages_count", "bugs_count", "open_bugs_count", "created_at"],
    fields: [
      f("name", "Project Name"),
      f("description", "Description", "area"),
      f("status", "Status", "select", ["Active", "Completed", "On Hold"]),
    ],
  },
  pages: {
    title: "Pages",
    desc: "Create and manage application pages and sub-pages under each project",
    cols: ["name", "sub_page_name", "project_name", "created_by_user", "url_path", "status", "bugs_count", "open_bugs_count"],
    fields: [
      fk("project", "Project", "projects"),
      f("name", "Page Name"),
      f("sub_page_name", "Sub Page Name"),
      f("url_path", "URL Route / Path (e.g. /login)"),
      f("description", "Page Description", "area"),
      f("status", "Status", "select", ["Active", "In Development", "Archived"]),
    ],
  },
  bugs: {
    title: "Bugs",
    desc: "Testers create bugs and assign them to developers. Developers fix issues, and testers verify or reopen.",
    cols: ["code", "title", "project_name", "page_name", "created_by_user", "severity", "status", "developer_name", "tester_name", "reopen_count"],
    fields: [
      fk("project", "Project", "projects"),
      fk("page", "Page", "pages"),
      f("sub_page_name", "Sub Page"),
      f("title", "Bug Title"),
      f("description", "Bug Description", "area"),
      f("steps_to_reproduce", "Steps to Reproduce", "area"),
      f("severity", "Severity", "select", P),
      f("priority", "Priority", "select", PRIO),
      f("status", "Status", "select", ["New", "Assigned", "In Progress", "Fixed", "Reopened", "Verified", "Closed"]),
      f("fix_notes", "Description of Changes / Fix Notes", "area"),
      fk("assigned_developer", "Assigned Developer", "users", "username"),
      fk("assigned_tester", "Assigned Tester", "users", "username"),
    ],
  },
  users: {
    title: "User Roles",
    desc: "Manage team members and user roles (Developer, Tester, Admin)",
    cols: ["username", "email", "first_name", "last_name", "role", "created_by_user", "is_active"],
    fields: [
      f("username", "Username"),
      f("email", "Email Address"),
      f("first_name", "First Name"),
      f("last_name", "Last Name"),
      f("password", "Password", "password"),
      f("role", "User Role", "select", ["Developer", "Tester", "Admin", "Super Admin"]),
    ],
  },
};
