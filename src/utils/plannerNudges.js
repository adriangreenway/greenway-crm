// Planner relationship nudge engine
// Returns sorted array of nudge objects for display on Planners page and Dashboard

function daysBetween(dateStr, now) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function fmtCurrency(amount) {
  if (!amount) return "$0";
  return `$${Number(amount).toLocaleString()}`;
}

function computeStats(planner, leads) {
  const linked = leads.filter((l) => l.planner_id === planner.id);
  const booked = linked.filter((l) => ["Booked", "Fulfilled"].includes(l.stage));
  const totalRevenue = booked.reduce((sum, l) => sum + (l.price || 0), 0);
  return { linked, booked, totalReferrals: linked.length, bookedReferrals: booked.length, totalRevenue };
}

export function computePlannerNudges(planners, leads) {
  try {
    if (!planners?.length) return [];
    const allLeads = leads || [];
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentMonth = now.getMonth() + 1; // 1-based
    const nudgeMap = new Map(); // planner.id -> array of nudges

    const addNudge = (nudge) => {
      const id = nudge.planner.id;
      if (!nudgeMap.has(id)) nudgeMap.set(id, []);
      nudgeMap.get(id).push(nudge);
    };

    for (const p of planners) {
      const stats = computeStats(p, allLeads);
      const daysSinceOutreach = daysBetween(p.last_outreach_date, now);
      const plannerInfo = { id: p.id, name: p.name, company: p.company, tier: p.tier };

      // 1. Dormant High-Value (priority 1)
      if (["warm", "strong", "vip"].includes(p.tier) && daysSinceOutreach >= 90) {
        const revText = fmtCurrency(stats.totalRevenue);
        const tierLabel = p.tier.charAt(0).toUpperCase() + p.tier.slice(1);
        const text = !p.last_outreach_date
          ? `${p.name} \u2014 never contacted. ${tierLabel} planner with ${revText} in referrals.`
          : `${p.name} \u2014 no outreach in ${daysSinceOutreach} days. ${tierLabel} planner with ${revText} in referrals.`;
        addNudge({ type: "dormant", planner: plannerInfo, text, actionLabel: "Draft Outreach", priority: 1, _revenue: stats.totalRevenue });
      }

      // 2. Engagement Season (priority 2)
      if ([10, 11, 12].includes(currentMonth) && ["strong", "vip"].includes(p.tier) && daysSinceOutreach >= 60) {
        const lastYear = now.getFullYear() - 1;
        const lastYearReferrals = allLeads.filter(
          (l) => l.planner_id === p.id && l.created_at && new Date(l.created_at).getFullYear() === lastYear
        ).length;
        const text = `Engagement season: ${p.name} referred ${lastYearReferrals} wedding${lastYearReferrals !== 1 ? "s" : ""} last year. Good time to reconnect.`;
        addNudge({ type: "engagement_season", planner: plannerInfo, text, actionLabel: "Draft Outreach", priority: 2, _revenue: stats.totalRevenue });
      }

      // 3. Post-Event Thank You (priority 3)
      const fulfilledLeads = allLeads.filter(
        (l) => l.planner_id === p.id && l.stage === "Fulfilled" && l.event_date
      );
      for (const l of fulfilledLeads) {
        const eventDays = daysBetween(l.event_date, now);
        if (eventDays >= 0 && eventDays <= 7) {
          const outreachAfterEvent = p.last_outreach_date && p.last_outreach_date >= l.event_date;
          if (!outreachAfterEvent) {
            const couple = [l.partner1_first, l.partner2_first].filter(Boolean).join(" & ");
            const text = `${p.name} \u2014 ${couple || "Client"} wedding just wrapped. Send a thank you?`;
            addNudge({ type: "post_event", planner: plannerInfo, text, actionLabel: "Draft Outreach", priority: 3, _revenue: stats.totalRevenue });
            break; // one per planner
          }
        }
      }

      // 4. New Planner No Follow Up (priority 4)
      if (p.tier === "new" && p.first_contact_date) {
        const daysSinceFirst = daysBetween(p.first_contact_date, now);
        if (daysSinceFirst >= 14 && daysSinceFirst <= 45) {
          const noFollowUp = !p.last_outreach_date || p.last_outreach_date === p.first_contact_date;
          if (noFollowUp) {
            const text = `${p.name} \u2014 first contact ${daysSinceFirst} days ago, no follow up yet.`;
            addNudge({ type: "new_no_followup", planner: plannerInfo, text, actionLabel: "Draft Outreach", priority: 4, _revenue: stats.totalRevenue });
          }
        }
      }

      // 5. Tier Suggestion (priority 5)
      let suggestedTier = null;
      if (p.tier === "new" && stats.totalReferrals >= 1) suggestedTier = "warm";
      else if (p.tier === "warm" && stats.bookedReferrals >= 1 && stats.totalReferrals >= 3) suggestedTier = "strong";
      else if (p.tier === "strong" && (stats.totalReferrals >= 5 || stats.totalRevenue >= 50000)) suggestedTier = "vip";
      if (suggestedTier) {
        const tierLabel = suggestedTier.charAt(0).toUpperCase() + suggestedTier.slice(1);
        const text = `${p.name} has ${stats.totalReferrals} referral${stats.totalReferrals !== 1 ? "s" : ""} and ${fmtCurrency(stats.totalRevenue)} \u2014 consider upgrading to ${tierLabel}?`;
        addNudge({ type: "tier_suggestion", planner: plannerInfo, text, actionLabel: "Open Profile", priority: 5, _revenue: stats.totalRevenue });
      }

      // 6. Upcoming Outreach (priority 6)
      if (p.next_outreach_date && p.next_outreach_date <= today) {
        const formattedDate = new Date(p.next_outreach_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const text = `${p.name} \u2014 scheduled outreach for ${formattedDate}.`;
        addNudge({ type: "upcoming_outreach", planner: plannerInfo, text, actionLabel: "Draft Outreach", priority: 6, _revenue: stats.totalRevenue });
      }
    }

    // Deduplication: max 2 nudges per planner, keep highest priority
    let allNudges = [];
    for (const [, nudges] of nudgeMap) {
      nudges.sort((a, b) => a.priority - b.priority || b._revenue - a._revenue);
      allNudges.push(...nudges.slice(0, 2));
    }

    // Sort: priority ascending, then revenue descending within same priority
    allNudges.sort((a, b) => a.priority - b.priority || b._revenue - a._revenue);

    return allNudges;
  } catch (err) {
    console.error("computePlannerNudges error:", err);
    return [];
  }
}
