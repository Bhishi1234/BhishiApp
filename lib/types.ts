export type GroupType = "lucky_draw" | "bidding" | "loan";
export type GroupStatus = "active" | "completed" | "archived";
export type CycleFrequency = "monthly" | "weekly";
export type MemberRole = "admin" | "co_admin" | "member";
export type MemberStatus = "invited" | "active" | "left" | "replaced";
export type CycleStatus = "upcoming" | "open" | "drawn" | "paid_out" | "closed";
export type ContributionStatus = "unpaid" | "partial" | "paid" | "waived";
export type PaymentMode = "upi" | "cash" | "bank_transfer";
export type ActivityKind = "winner" | "member" | "round" | "payment" | "invite";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  upi_id: string | null;
  locale: string;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  type: GroupType;
  contribution_amount: number | string;
  planned_member_count: number;
  frequency: CycleFrequency;
  start_date: string;
  currency: string;
  locale: string;
  status: GroupStatus;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string | null;
  display_name: string;
  phone: string | null;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string;
};

export type Cycle = {
  id: string;
  group_id: string;
  cycle_number: number;
  due_date: string;
  pool_amount: number | string;
  status: CycleStatus;
};

export type Contribution = {
  id: string;
  cycle_id: string;
  member_id: string;
  amount_due: number | string;
  amount_paid: number | string;
  status: ContributionStatus;
  payment_mode: PaymentMode | null;
  paid_at: string | null;
  recorded_by: string | null;
  member_claimed_at: string | null;
  created_at: string;
};

export type Payout = {
  id: string;
  cycle_id: string;
  winner_member_id: string;
  method: "draw" | "bid";
  bid_discount: number | string | null;
  bonus_per_member: number | string | null;
  status: "pending" | "sent";
  proof_path: string | null;
  upi_ref: string | null;
  paid_at: string | null;
  eligible_member_ids: string[];
  drawn_at: string;
  drawn_by: string | null;
};

export type ActivityEvent = {
  id: string;
  group_id: string;
  kind: ActivityKind;
  title: string;
  body: string | null;
  actor_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type GroupSettings = {
  group_id: string;
  late_fee_notes: string | null;
  dropout_notes: string | null;
  reminder_days_before: number;
  self_serve_paid: boolean;
};
