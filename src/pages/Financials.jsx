import React, { useState, useEffect, useMemo } from "react";
import { COLORS, FONTS, RADII } from "../tokens";
import Icon from "../icons";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";
import { StageBadge } from "../components/Badge";
import { seedInvoices, getLeadName, formatCurrency, formatDate } from "../data/seed";
import { supabaseConfigured, supabase } from "../hooks/useAuth";

const Financials = ({ leads }) => {
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);

  // Load invoices
  useEffect(() => {
    if (supabaseConfigured) {
      supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.warn("Invoice fetch failed, using seed:", error.message);
            setInvoices(seedInvoices);
          } else {
            setInvoices(data?.length ? data : seedInvoices);
          }
          setLoadingInvoices(false);
        });
    } else {
      setInvoices(seedInvoices);
      setLoadingInvoices(false);
    }
  }, []);

  // ── Computed values ──
  const leadsMap = useMemo(() => {
    const m = {};
    leads.forEach((l) => { m[l.id] = l; });
    return m;
  }, [leads]);

  // Paid invoices sum
  const paidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === "paid"),
    [invoices]
  );
  const paidInvoicesSum = useMemo(
    () => paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0),
    [paidInvoices]
  );

  // Outstanding (sent but not paid)
  const outstandingSum = useMemo(
    () => invoices
      .filter((inv) => inv.status === "sent")
      .reduce((sum, inv) => sum + (inv.amount || 0), 0),
    [invoices]
  );

  // GCE booked/fulfilled leads
  const gceBookedLeads = useMemo(
    () => leads.filter(
      (l) => l.payment_routing === "gce" && (l.stage === "Booked" || l.stage === "Fulfilled")
    ),
    [leads]
  );
  const gceBookedSum = useMemo(
    () => gceBookedLeads.reduce((sum, l) => sum + (l.price || 0), 0),
    [gceBookedLeads]
  );

  // Collected = paid invoices + GCE booked revenue
  const collectedTotal = paidInvoicesSum + gceBookedSum;

  // Pipeline value (leads not Booked/Fulfilled/Lost)
  const pipelineValue = useMemo(
    () => leads
      .filter((l) => !["Booked", "Fulfilled", "Lost"].includes(l.stage))
      .reduce((sum, l) => sum + (l.price || 0), 0),
    [leads]
  );

  // Estimated fees (all non-lost leads)
  const estFees = useMemo(
    () => leads
      .filter((l) => l.stage !== "Lost")
      .reduce((sum, l) => sum + (l.price || 0), 0),
    [leads]
  );

  // Direct Revenue: paid invoices where lead has payment_routing === 'direct'
  const directRevenue = useMemo(() => {
    let sum = 0;
    let directLeadIds = new Set();
    paidInvoices.forEach((inv) => {
      const lead = leadsMap[inv.lead_id];
      if (lead && lead.payment_routing === "direct") {
        sum += inv.amount || 0;
        directLeadIds.add(inv.lead_id);
      }
    });
    return { sum, count: directLeadIds.size };
  }, [paidInvoices, leadsMap]);

  // GCE Revenue: sum of price from GCE booked/fulfilled leads
  const gceGross = gceBookedSum;
  const gceNet = Math.round(gceGross * 0.8);

  // ── Transactions: merge invoice rows + GCE booking rows ──
  const transactions = useMemo(() => {
    // Invoice rows
    const invRows = invoices.map((inv) => {
      const lead = leadsMap[inv.lead_id];
      return {
        id: inv.id,
        client: lead ? `${lead.partner1_first} & ${lead.partner2_first}` : "Unknown",
        source: lead?.payment_routing || "direct",
        amount: inv.amount,
        status: inv.status,
        date: inv.paid_at || inv.sent_at || "",
        method: inv.method || "Stripe",
        sortDate: inv.paid_at || inv.sent_at || "",
        type: "invoice",
      };
    });

    // GCE booking rows
    const gceRows = gceBookedLeads.map((lead) => ({
      id: "gce-" + lead.id,
      client: `${lead.partner1_first} & ${lead.partner2_first}`,
      source: "gce",
      amount: lead.price,
      status: lead.stage,
      date: lead.booked_date || "",
      method: "GCE Check",
      sortDate: lead.booked_date || "",
      type: "gce",
    }));

    // Merge and sort by date descending
    return [...invRows, ...gceRows].sort((a, b) => {
      const da = a.sortDate ? new Date(a.sortDate) : new Date(0);
      const db = b.sortDate ? new Date(b.sortDate) : new Date(0);
      return db - da;
    });
  }, [invoices, gceBookedLeads, leadsMap]);

  // ── Column header style ──
  const thStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: `1px solid ${COLORS.border}`,
  };

  const tdStyle = {
    padding: "12px 12px",
    fontSize: 13,
    color: COLORS.text,
    borderBottom: `1px solid ${COLORS.borderLight}`,
    verticalAlign: "middle",
  };

  // ── Format date for transactions (handles ISO timestamps) ──
  const fmtDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.black,
            fontFamily: FONTS.body,
            margin: 0,
          }}
        >
          Financials
        </h1>
        <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
          Revenue tracking and transaction history
        </div>
      </div>

      {/* ═══ Row 1: Existing 4 stat cards ═══ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <StatCard
          label="COLLECTED"
          value={formatCurrency(collectedTotal)}
          sub={`Direct: ${formatCurrency(paidInvoicesSum)} | GCE: ${formatCurrency(gceBookedSum)}`}
          icon="dollar"
          trend="up"
        />
        <StatCard
          label="OUTSTANDING"
          value={formatCurrency(outstandingSum)}
          sub={`${invoices.filter((i) => i.status === "sent").length} pending invoices`}
          icon="clock"
        />
        <StatCard
          label="PIPELINE VALUE"
          value={formatCurrency(pipelineValue)}
          sub={`${leads.filter((l) => !["Booked", "Fulfilled", "Lost"].includes(l.stage)).length} active leads`}
          icon="trending"
        />
        <StatCard
          label="EST. FEES"
          value={formatCurrency(estFees)}
          sub={`${leads.filter((l) => l.stage !== "Lost").length} total leads`}
          icon="bar"
        />
      </div>

      {/* ═══ Row 2: Revenue Source cards (2-col) ═══ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginTop: 16,
        }}
      >
        <StatCard
          label="DIRECT REVENUE"
          value={formatCurrency(directRevenue.sum)}
          sub={`${directRevenue.count} booking${directRevenue.count !== 1 ? "s" : ""}`}
          icon="dollar"
          trend="up"
        />
        <StatCard
          label="GCE REVENUE"
          value={formatCurrency(gceGross)}
          sub={`Net: ${formatCurrency(gceNet)} (after 20%)`}
          icon="users"
        />
      </div>

      {/* ═══ Transactions Table ═══ */}
      <div
        style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.lg,
          marginTop: 24,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${COLORS.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.black }}>
            Recent Transactions
          </span>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loadingInvoices ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
            Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
            No transactions yet
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>CLIENT</th>
                  <th style={thStyle}>SOURCE</th>
                  <th style={thStyle}>AMOUNT</th>
                  <th style={thStyle}>STATUS</th>
                  <th style={thStyle}>DATE</th>
                  <th style={thStyle}>METHOD</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{tx.client}</td>
                    <td style={tdStyle}>
                      {tx.source === "direct" ? (
                        <Badge color={COLORS.black} bg={COLORS.cream}>Direct</Badge>
                      ) : (
                        <Badge color={COLORS.textMuted} bg={COLORS.bg}>GCE</Badge>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td style={tdStyle}>
                      {tx.type === "gce" ? (
                        <StageBadge stage={tx.status} />
                      ) : tx.status === "paid" ? (
                        <Badge color={COLORS.green} bg={COLORS.greenLight}>Paid</Badge>
                      ) : tx.status === "sent" ? (
                        <Badge color={COLORS.amber} bg={COLORS.amberLight}>Sent</Badge>
                      ) : (
                        <Badge>{tx.status}</Badge>
                      )}
                    </td>
                    <td style={{ ...tdStyle, color: COLORS.textMuted }}>{fmtDate(tx.date)}</td>
                    <td style={{ ...tdStyle, fontSize: 12, color: COLORS.textMuted }}>{tx.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Stripe Connection Status ═══ */}
      <div
        style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADII.lg,
          padding: "16px 20px",
          marginTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: RADII.md,
            background: COLORS.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon type="dollar" size={16} color={COLORS.textMuted} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.black }}>
            Stripe
          </div>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>
            Payment processing
          </div>
        </div>
        <Badge
          color={supabaseConfigured ? COLORS.green : COLORS.textLight}
          bg={supabaseConfigured ? COLORS.greenLight : COLORS.bg}
        >
          {supabaseConfigured ? "Connected" : "Not Connected"}
        </Badge>
      </div>
    </div>
  );
};

export default Financials;
