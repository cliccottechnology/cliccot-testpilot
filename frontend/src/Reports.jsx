import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import api from "./api";
import StatusBadge from "./StatusBadge";
import Spinner from "./Spinner";

const PIE_COLORS = ["#10b981", "#f43f5e", "#f59e0b", "var(--secondary, #1D4B76)", "var(--accent, #00AEBB)", "var(--primary, #06375F)"];

const tooltipStyle = {
  backgroundColor: "var(--surface)",
  borderColor: "var(--border)",
  borderRadius: "8px",
  color: "var(--text-primary)",
  boxShadow: "var(--shadow-md)"
};

export default function Reports() {
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);

  useEffect(() => {
    api.get("/projects/", { params: { page_size: 100 } })
      .then(r => setProjects(r.data.results || []))
      .catch(() => {});
  }, []);

  const loadReport = () => {
    setLoading(true);
    const params = selectedProject ? { project: selectedProject } : {};
    api.get("/dashboard/", { params })
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReport();
  }, [selectedProject]);

  const exportCSV = () => {
    if (!data || exportingCsv) return;
    setExportingCsv(true);
    try {
      const rows = [
        ["Metric", "Value"],
        ["Total Projects", data.projects],
        ["Total Test Cases", data.test_cases],
        ["Passed Executions", data.passed],
        ["Failed Executions", data.failed],
        ["Blocked Executions", data.blocked],
        ["Pending Executions", data.pending],
        ["Total Bugs", data.bugs],
        ["Open Bugs", data.open_bugs],
        ["Critical Bugs", data.critical_bugs],
        ["Resolved Bugs", data.resolved_bugs],
        ["Pass Rate (%)", data.pass_rate],
        ["Execution Progress (%)", data.progress]
      ];
      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Cliccot_QA_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setExportingCsv(false), 400);
    }
  };

  const exportJSON = () => {
    if (!data || exportingJson) return;
    setExportingJson(true);
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute("download", `Cliccot_Executive_Report_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setExportingJson(false), 400);
    }
  };

  if (loading && !data) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 340, gap: 14, color: "var(--muted)" }}>
        <Spinner size={34} color="var(--primary)" strokeWidth={3} />
        <p style={{ margin: 0, fontWeight: 500 }}>Generating QA executive report…</p>
      </div>
    );
  }

  const executionData = [
    { name: "Pass", value: data?.passed || 0 },
    { name: "Fail", value: data?.failed || 0 },
    { name: "Blocked", value: data?.blocked || 0 },
    { name: "Pending", value: data?.pending || 0 },
  ];

  const qualityScore = Math.max(0, Math.min(100, Math.round(((data?.pass_rate || 0) * 0.7) + (((data?.progress || 0) * 0.3)) - ((data?.critical_bugs || 0) * 8))));

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-wrap">
          <h2>QA Quality & Test Analytics Report</h2>
          <p>Comprehensive audit of test execution coverage, defect velocity, and release readiness.</p>
        </div>
        <div className="row" style={{ margin: 0, flexWrap: "wrap", gap: 10 }}>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            style={{ minWidth: 200 }}
          >
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            type="button"
            className={`btn-sec ${loading ? "is-loading" : ""}`}
            disabled={loading}
            onClick={loadReport}
            title="Refresh Report Data"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {loading ? <Spinner size={13} color="var(--primary)" /> : <span>🔄</span>}
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className={`btn-pri ${exportingCsv ? "is-loading" : ""}`}
            disabled={exportingCsv || !data}
            onClick={exportCSV}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {exportingCsv ? <Spinner size={13} color="#fff" /> : <span>📥</span>}
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className={`btn-sec ${exportingJson ? "is-loading" : ""}`}
            disabled={exportingJson || !data}
            onClick={exportJSON}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {exportingJson ? <Spinner size={13} color="var(--primary)" /> : <span>📊</span>}
            <span>Export JSON</span>
          </button>
          <button type="button" className="btn-sec" onClick={() => window.print()}>🖨️ Print / PDF</button>
        </div>
      </div>

      {/* Health Score Summary Cards */}
      <div className="grid">
        <div className="card stat">
          <b>{qualityScore} / 100</b>
          <span>Overall Release Quality Index</span>
        </div>
        <div className="card stat">
          <b>{data?.pass_rate}%</b>
          <span>Test Execution Pass Rate</span>
        </div>
        <div className="card stat">
          <b>{data?.progress}%</b>
          <span>Cycle Test Coverage</span>
        </div>
        <div className="card stat">
          <b>{data?.open_bugs}</b>
          <span>Active Defect Backlog</span>
        </div>
        <div className="card stat">
          <b style={{ color: "var(--dng-text)" }}>{data?.critical_bugs}</b>
          <span>Critical Release Blockers</span>
        </div>
        <div className="card stat">
          <b style={{ color: "var(--suc-text)" }}>{data?.resolved_bugs}</b>
          <span>Verified & Resolved Defects</span>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="charts">
        <div className="card">
          <div className="card-head">
            <h4>📈 Test Execution Distribution</h4>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={executionData} dataKey="value" nameKey="name" outerRadius={90} label>
                {executionData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--text-primary)" }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-head">
            <h4>🐛 Defect Lifecycle Status</h4>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data?.bug_status || []} dataKey="value" nameKey="name" outerRadius={90} label>
                {(data?.bug_status || []).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--text-primary)" }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="card-head">
            <h4>📊 Project-wise QA Health Matrix</h4>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.project_stats || []}>
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
              <YAxis allowDecimals={false} stroke="var(--muted)" fontSize={12} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "var(--text-primary)" }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="cases" fill="var(--primary)" name="Authored Test Cases" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bugs" fill="#f43f5e" name="Reported Defects" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Matrix Table */}
      <div className="card tw">
        <div style={{ padding: "16px 20px 8px" }}>
          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Executive Quality Summary</h4>
        </div>
        <table>
          <thead>
            <tr>
              <th>Evaluation Parameter</th>
              <th>Recorded Value</th>
              <th>Status / Assessment</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>Regression Test Pass Rate</b></td>
              <td>{data?.pass_rate}%</td>
              <td><StatusBadge value={data?.pass_rate >= 80 ? "Pass" : data?.pass_rate >= 50 ? "Major" : "Fail"} /></td>
            </tr>
            <tr>
              <td><b>Test Execution Completion</b></td>
              <td>{data?.progress}%</td>
              <td><StatusBadge value={data?.progress >= 90 ? "Approved" : "In Progress"} /></td>
            </tr>
            <tr>
              <td><b>Release Blocking Defects</b></td>
              <td>{data?.critical_bugs} Critical Bugs</td>
              <td><StatusBadge value={data?.critical_bugs === 0 ? "Approved" : "Critical"} /></td>
            </tr>
            <tr>
              <td><b>Defect Resolution Rate</b></td>
              <td>{data?.resolved_bugs} / {data?.bugs} Total Defects</td>
              <td><StatusBadge value={data?.resolved_bugs >= (data?.bugs * 0.7) ? "Active" : "Pending"} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
