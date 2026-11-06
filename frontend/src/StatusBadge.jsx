import React from "react";

const STATUS_MAP = {
  // Success (Green)
  pass: "badge-success",
  active: "badge-success",
  approved: "badge-success",
  fixed: "badge-fixed",
  verified: "badge-verified",
  resolved: "badge-success",
  completed: "badge-success",

  // Danger (Red / Rose)
  fail: "badge-danger",
  critical: "badge-critical",
  rejected: "badge-danger",
  reopened: "badge-reopened",

  // Corporate Navy / Roles / Assigned
  admin: "badge-navy",
  superadmin: "badge-navy",
  developer: "badge-primary",
  assigned: "badge-assigned",

  // Warning (Amber / Orange)
  inprogress: "badge-inprogress",
  major: "badge-major",
  high: "badge-warning",
  medium: "badge-warning",
  tester: "badge-warning",
  qa: "badge-warning",

  // Info (Sky Blue / Cyan)
  minor: "badge-minor",
  new: "badge-new",
  low: "badge-info",

  // Neutral (Corporate Navy Slate)
  closed: "badge-closed",
  blocked: "badge-neutral",
  draft: "badge-neutral",
  archived: "badge-neutral",
  onhold: "badge-neutral",
  trivial: "badge-trivial",
};

export default function StatusBadge({ value }) {
  if (value === null || value === undefined || value === "") return <span>-</span>;
  if (typeof value === "boolean") {
    return (
      <span className={`badge ${value ? "badge-success" : "badge-neutral"}`}>
        {value ? "Active" : "Inactive"}
      </span>
    );
  }

  const str = String(value);
  const normalized = str.toLowerCase().replace(/[\s_-]+/g, "");
  const badgeClass = STATUS_MAP[normalized] || "badge-neutral";

  return <span className={`badge ${badgeClass}`}>{str}</span>;
}
