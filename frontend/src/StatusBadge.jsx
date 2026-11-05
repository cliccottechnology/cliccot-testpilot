import React from "react";

const STATUS_MAP = {
  // Success (Green)
  pass: "badge-success",
  active: "badge-success",
  approved: "badge-success",
  fixed: "badge-success",
  verified: "badge-success",
  resolved: "badge-success",
  completed: "badge-success",

  // Danger (Red / Rose)
  fail: "badge-danger",
  critical: "badge-danger",
  rejected: "badge-danger",
  reopened: "badge-danger",
  admin: "badge-danger",

  // Warning (Amber / Orange)
  inprogress: "badge-warning",
  major: "badge-warning",
  high: "badge-warning",
  medium: "badge-warning",
  tester: "badge-warning",
  qa: "badge-warning",

  // Info (Sky Blue)
  minor: "badge-info",
  new: "badge-info",
  assigned: "badge-info",
  low: "badge-info",
  developer: "badge-info",

  // Purple
  superadmin: "badge-purple",

  // Neutral (Slate)
  closed: "badge-neutral",
  blocked: "badge-neutral",
  draft: "badge-neutral",
  archived: "badge-neutral",
  onhold: "badge-neutral",
  trivial: "badge-neutral",
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
